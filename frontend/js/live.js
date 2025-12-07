// Live Detection JavaScript
let liveInterval = null;
let cameraStream = null;
let isCameraMode = false;
const API_BASE_URL = 'http://localhost:8000'; // Adjust this to your backend URL

// Initialize live page functionality
function initializeLive() {
    console.log('Initializing live detection...');
    setupToggleButton();
    startLiveUpdates();
}

// Setup toggle button functionality
function setupToggleButton() {
    const toggleBtn = document.getElementById('toggle-feed');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleFeedMode);
    }
}

// Toggle between ML feed and camera feed
async function toggleFeedMode() {
    const toggleBtn = document.getElementById('toggle-feed');
    const mlContainer = document.getElementById('ml-feed-container');
    const cameraContainer = document.getElementById('camera-feed-container');
    
    if (!isCameraMode) {
        // Switch to camera mode
        try {
            await startCamera();
            mlContainer.style.display = 'none';
            cameraContainer.style.display = 'block';
            toggleBtn.textContent = 'Switch to ML Feed';
            stopLiveUpdates();
            isCameraMode = true;
        } catch (error) {
            console.error('Error starting camera:', error);
            alert('Unable to access camera. Please check permissions.');
        }
    } else {
        // Switch to ML mode
        stopCamera();
        cameraContainer.style.display = 'none';
        mlContainer.style.display = 'block';
        toggleBtn.textContent = 'Switch to Camera Feed';
        startLiveUpdates();
        isCameraMode = false;
    }
}

// Start camera feed
async function startCamera() {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById("camera-feed").srcObject = cameraStream;
}

// Stop camera feed
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Start auto-refresh for live data
function startLiveUpdates() {
    // Initial load
    fetchLiveData();
    
    // Set up interval for auto-refresh every 1 second
    if (liveInterval) {
        clearInterval(liveInterval);
    }
    
    liveInterval = setInterval(() => {
        fetchLiveData();
    }, 1000); // 1 second interval
}

// Stop live updates (when navigating away from live page)
function stopLiveUpdates() {
    if (liveInterval) {
        clearInterval(liveInterval);
        liveInterval = null;
    }
}

// Fetch live detection data from backend
async function fetchLiveData() {
    try {
        const response = await fetch(`${API_BASE_URL}/live`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        updateLiveDisplay(data);
        
    } catch (error) {
        console.error('Error fetching live data:', error);
        displayLiveError(error.message);
    }
}

// Update the live display with new data
function updateLiveDisplay(data) {
    try {
        // Update image
        const imageElement = document.getElementById('live-image');
        if (data.snapshot_path) {
            imageElement.src = `${API_BASE_URL}/${data.snapshot_path}`;
            imageElement.alt = `${data.class} detection`;
        }
        
        // Update detection details
        document.getElementById('waste-class').textContent = capitalizeFirst(data.class || 'Unknown');
        document.getElementById('wet-dry').textContent = capitalizeFirst(data.wet_dry || 'Unknown');
        document.getElementById('confidence').textContent = data.confidence ? 
            `${Math.round(data.confidence * 100)}%` : 'N/A';
        document.getElementById('is-mixed').textContent = formatBoolean(data.is_mixed);
        document.getElementById('is-violation').textContent = formatBoolean(data.is_violation);
        document.getElementById('timestamp').textContent = formatTimestamp(data.timestamp);
        
        // Update violation status styling
        const violationElement = document.getElementById('is-violation');
        if (data.is_violation) {
            violationElement.style.color = '#dc3545';
            violationElement.style.fontWeight = '600';
        } else {
            violationElement.style.color = '#28a745';
            violationElement.style.fontWeight = '500';
        }
        
        // Update mixed waste styling
        const mixedElement = document.getElementById('is-mixed');
        if (data.is_mixed) {
            mixedElement.style.color = '#ffc107';
            mixedElement.style.fontWeight = '600';
        } else {
            mixedElement.style.color = '#28a745';
            mixedElement.style.fontWeight = '500';
        }
        
    } catch (error) {
        console.error('Error updating live display:', error);
        displayLiveError('Error displaying live data');
    }
}

// Display error message for live data
function displayLiveError(message) {
    // Show placeholder image
    const imageElement = document.getElementById('live-image');
    imageElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZDdkYSIgc3Ryb2tlPSIjZGM4Mzg3IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIyNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNzIxYzI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3IgbG9hZGluZyBsaXZlIGZlZWQ8L3RleHQ+CiAgPHRleHQgeD0iMjUwIiB5PSIyMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzcyMWMyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNoZWNrIGNvbnNvbGUgZm9yIGRldGFpbHM8L3RleHQ+Cjwvc3ZnPgo=';
    
    // Reset all fields to show error state
    document.getElementById('waste-class').textContent = 'Error';
    document.getElementById('wet-dry').textContent = 'Error';
    document.getElementById('confidence').textContent = 'Error';
    document.getElementById('is-mixed').textContent = 'Error';
    document.getElementById('is-violation').textContent = 'Error';
    document.getElementById('timestamp').textContent = 'Connection failed';
    
    // Use dummy data when backend is not available
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        console.log('Backend not available, using dummy data...');
        const dummyData = generateDummyLiveData();
        updateLiveDisplay(dummyData);
    }
}

// Generate dummy data for testing when backend is not available
function generateDummyLiveData() {
    const classes = ['plastic', 'organic', 'metal', 'glass', 'paper'];
    const wetDry = ['wet', 'dry'];
    
    return {
        class: classes[Math.floor(Math.random() * classes.length)],
        wet_dry: wetDry[Math.floor(Math.random() * wetDry.length)],
        confidence: 0.75 + Math.random() * 0.25, // 75-100% confidence
        is_mixed: Math.random() < 0.2, // 20% chance of mixed
        is_violation: Math.random() < 0.1, // 10% chance of violation
        snapshot_path: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2U3ZjNmZiIgc3Ryb2tlPSIjNmM3NTdkIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIyNTAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjNDk1MDU3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RHVtbXkgTGl2ZSBGZWVkPC90ZXh0PgogIDx0ZXh0IHg9IjI1MCIgeT0iMjIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Db25uZWN0IHRvIGJhY2tlbmQgZm9yIHJlYWwgZGF0YTwvdGV4dD4KPC9zdmc+Cg==',
        timestamp: new Date().toISOString()
    };
}

// Utility Functions
function capitalizeFirst(str) {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatBoolean(value) {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'Unknown';
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return 'Invalid date';
    }
}

// Handle page visibility changes to pause/resume updates
document.addEventListener('visibilitychange', function() {
    const livePage = document.getElementById('live-page');
    if (document.hidden || !livePage.classList.contains('active')) {
        stopLiveUpdates();
        if (isCameraMode) {
            stopCamera();
        }
    } else if (livePage.classList.contains('active')) {
        if (!isCameraMode) {
            startLiveUpdates();
        }
    }
});

// Export functions for use in other scripts
window.liveDetection = {
    initialize: initializeLive,
    start: startLiveUpdates,
    stop: stopLiveUpdates
};