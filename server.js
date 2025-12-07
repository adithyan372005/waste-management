const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory (for frontend and snapshots)
app.use(express.static('public'));

// Storage paths
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');
const SNAPSHOTS_DIR = path.join(__dirname, 'public', 'snapshots');

// Initialize directories and storage
function initializeStorage() {
    // Create directories if they don't exist
    [DATA_DIR, path.join(__dirname, 'public'), SNAPSHOTS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });

    // Initialize storage file if it doesn't exist
    if (!fs.existsSync(STORAGE_FILE)) {
        const initialData = {
            live: null,
            logs: []
        };
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created initial storage.json');
    }
}

// Read storage data
function readStorage() {
    try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading storage:', error);
        return { live: null, logs: [] };
    }
}

// Write storage data
function writeStorage(data) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing storage:', error);
    }
}

// Process base64 image and save to snapshots
function processImage(snapshot_base64, timestamp) {
    try {
        if (!snapshot_base64 || !snapshot_base64.includes('base64,')) {
            return null;
        }

        // Extract base64 data
        const base64Data = snapshot_base64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate filename with timestamp
        const filename = `img_${timestamp.replace(/[-:T]/g, '').split('.')[0]}.jpg`;
        const filepath = path.join(SNAPSHOTS_DIR, filename);

        // Save image
        fs.writeFileSync(filepath, buffer);
        console.log(`Saved image: ${filename}`);

        return `snapshots/${filename}`;
    } catch (error) {
        console.error('Error processing image:', error);
        return null;
    }
}

// Calculate billing data
function calculateBilling(logs) {
    const total_items = logs.length;
    
    if (total_items === 0) {
        return {
            total_items: 0,
            correct: 0,
            incorrect: 0,
            penalty: 0,
            final_bill: 0
        };
    }

    // Correct = confidence >= 0.8 AND not violation
    const correct = logs.filter(log => 
        log.confidence >= 0.8 && !log.is_violation
    ).length;
    
    const incorrect = total_items - correct;
    const penalty = incorrect * 10;
    const final_bill = penalty;

    return {
        total_items,
        correct,
        incorrect,
        penalty,
        final_bill
    };
}

// Validate detection data
function validateDetectionData(data) {
    const requiredFields = ['class', 'wet_dry', 'confidence', 'is_mixed', 'is_violation'];
    
    for (const field of requiredFields) {
        if (!(field in data)) {
            return false;
        }
    }

    // Type validation
    if (typeof data.class !== 'string' ||
        typeof data.wet_dry !== 'string' ||
        typeof data.confidence !== 'number' ||
        typeof data.is_mixed !== 'boolean' ||
        typeof data.is_violation !== 'boolean') {
        return false;
    }

    // Value validation
    if (!['plastic', 'organic', 'metal', 'glass', 'paper'].includes(data.class) ||
        !['wet', 'dry'].includes(data.wet_dry) ||
        data.confidence < 0 || data.confidence > 1) {
        return false;
    }

    return true;
}

// ROUTES

// POST /ingest - Receive ML model output
app.post('/ingest', (req, res) => {
    try {
        const data = req.body;

        // Validate required data
        if (!validateDetectionData(data)) {
            return res.status(400).json({
                error: 'Invalid detection data format',
                required: {
                    class: 'string (plastic|organic|metal|glass|paper)',
                    wet_dry: 'string (wet|dry)',
                    confidence: 'number (0-1)',
                    is_mixed: 'boolean',
                    is_violation: 'boolean'
                }
            });
        }

        // Set timestamp if missing
        const timestamp = data.timestamp || new Date().toISOString();

        // Process image if base64 provided
        let snapshot_path = data.snapshot_path || '';
        if (data.snapshot_base64) {
            const processedPath = processImage(data.snapshot_base64, timestamp);
            if (processedPath) {
                snapshot_path = processedPath;
            }
        }

        // Create detection record
        const detectionRecord = {
            class: data.class,
            wet_dry: data.wet_dry,
            confidence: data.confidence,
            is_mixed: data.is_mixed,
            is_violation: data.is_violation,
            snapshot_path: snapshot_path,
            timestamp: timestamp
        };

        // Read current storage
        const storage = readStorage();

        // Update live data
        storage.live = detectionRecord;

        // Add to logs (newest first)
        storage.logs.unshift(detectionRecord);

        // Keep only last 1000 logs to prevent infinite growth
        if (storage.logs.length > 1000) {
            storage.logs = storage.logs.slice(0, 1000);
        }

        // Save updated storage
        writeStorage(storage);

        console.log(`Ingested detection: ${data.class} (${Math.round(data.confidence * 100)}%)`);
        
        res.status(200).json({
            message: 'Detection data ingested successfully',
            data: detectionRecord
        });

    } catch (error) {
        console.error('Error in /ingest:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /live - Return latest detection
app.get('/live', (req, res) => {
    try {
        const storage = readStorage();
        
        if (!storage.live) {
            return res.status(404).json({
                error: 'No live detection data available'
            });
        }

        res.json(storage.live);

    } catch (error) {
        console.error('Error in /live:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /logs - Return detection history (newest first)
app.get('/logs', (req, res) => {
    try {
        const storage = readStorage();
        res.json(storage.logs || []);

    } catch (error) {
        console.error('Error in /logs:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// GET /billing - Return billing summary
app.get('/billing', (req, res) => {
    try {
        const storage = readStorage();
        const billingData = calculateBilling(storage.logs || []);
        res.json(billingData);

    } catch (error) {
        console.error('Error in /billing:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Waste Detection Backend API',
        version: '1.0.0',
        endpoints: {
            'POST /ingest': 'Receive ML model detection data',
            'GET /live': 'Get latest detection',
            'GET /logs': 'Get detection history',
            'GET /billing': 'Get billing summary',
            'GET /health': 'Health check'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Initialize and start server
initializeStorage();

app.listen(PORT, () => {
    console.log(`🚀 Waste Detection Backend running on port ${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`   POST http://localhost:${PORT}/ingest`);
    console.log(`   GET  http://localhost:${PORT}/live`);
    console.log(`   GET  http://localhost:${PORT}/logs`);
    console.log(`   GET  http://localhost:${PORT}/billing`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`📁 Static files served from: ./public`);
    console.log(`🖼️  Snapshots saved to: ./public/snapshots`);
    console.log(`💾 Data stored in: ./data/storage.json`);
});

module.exports = app;