# ML Model Integration Guide
## Waste Detection Backend API

**Repository:** https://github.com/adithyan372005/waste-dashboard-frontend

Complete guide for ML developers to integrate their waste detection models with this backend system.

---

## 🎯 Quick Start for ML Developers

### 1. Clone & Setup Backend
```bash
git clone https://github.com/adithyan372005/waste-dashboard-frontend
cd waste-dashboard-frontend
npm install
npm start
```
Backend runs on: **http://localhost:8000**

### 2. Test Connection
```python
import requests
response = requests.get("http://localhost:8000/health")
print(response.json())  # Should return {"status": "ok", ...}
```

### 3. Send Your First Detection
```python
import requests
import base64

# Your ML model output
detection_data = {
    "class": "plastic",
    "wet_dry": "dry",
    "confidence": 0.92,
    "is_mixed": False,
    "is_violation": False,
    "snapshot_base64": "data:image/jpeg;base64,/9j/4AAQ..."  # Optional
}

response = requests.post("http://localhost:8000/ingest", json=detection_data)
print(response.json())
```

---

## 📊 API Specification

### POST /ingest
**Purpose:** Submit ML model detection results

**Endpoint:** `http://localhost:8000/ingest`

**Content-Type:** `application/json`

#### Required Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `class` | string | `plastic`, `organic`, `metal`, `glass`, `paper` | Detected waste category |
| `wet_dry` | string | `wet`, `dry` | Moisture classification |
| `confidence` | number | `0.0` - `1.0` | Model confidence score |
| `is_mixed` | boolean | `true`, `false` | Multiple waste types detected |
| `is_violation` | boolean | `true`, `false` | Improper waste sorting |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO format (auto-generated if missing) |
| `snapshot_path` | string | Custom path for existing image file |
| `snapshot_base64` | string | Base64 encoded image data |

#### Request Example
```json
{
  "class": "plastic",
  "wet_dry": "dry",
  "confidence": 0.92,
  "is_mixed": false,
  "is_violation": false,
  "snapshot_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYA...",
  "timestamp": "2025-12-07T10:30:00.000Z"
}
```

#### Success Response (200)
```json
{
  "message": "Detection data ingested successfully",
  "data": {
    "class": "plastic",
    "wet_dry": "dry",
    "confidence": 0.92,
    "is_mixed": false,
    "is_violation": false,
    "snapshot_path": "snapshots/img_20251207103000.jpg",
    "timestamp": "2025-12-07T10:30:00.000Z"
  }
}
```

#### Error Response (400)
```json
{
  "error": "Invalid detection data format",
  "required": {
    "class": "string (plastic|organic|metal|glass|paper)",
    "wet_dry": "string (wet|dry)",
    "confidence": "number (0-1)",
    "is_mixed": "boolean",
    "is_violation": "boolean"
  }
}
```

---

## 🖼️ Image Handling

### Option 1: Base64 Upload (Recommended)
```python
import base64
import requests

# Read image file
with open("detection_image.jpg", "rb") as img_file:
    img_base64 = base64.b64encode(img_file.read()).decode('utf-8')

data = {
    "class": "organic",
    "wet_dry": "wet",
    "confidence": 0.88,
    "is_mixed": False,
    "is_violation": False,
    "snapshot_base64": f"data:image/jpeg;base64,{img_base64}"
}

response = requests.post("http://localhost:8000/ingest", json=data)
```

**Backend will:**
- Decode base64 to JPG file
- Save as `public/snapshots/img_<timestamp>.jpg`
- Set `snapshot_path` automatically
- Make image accessible to frontend

### Option 2: Pre-saved Image Path
```python
# If you save images yourself to public/snapshots/
data = {
    "class": "metal",
    "wet_dry": "dry", 
    "confidence": 0.95,
    "is_mixed": False,
    "is_violation": False,
    "snapshot_path": "snapshots/my_custom_image.jpg"
}
```

### Option 3: No Image
```python
# Detection without image
data = {
    "class": "glass",
    "wet_dry": "dry",
    "confidence": 0.87,
    "is_mixed": False,
    "is_violation": True
}
```

---

## 🔧 Python Integration Examples

### Basic ML Model Integration
```python
import requests
import json
from datetime import datetime

class WasteDashboardClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        
    def send_detection(self, class_name, wet_dry, confidence, 
                      is_mixed=False, is_violation=False, 
                      image_base64=None):
        """Send detection result to backend"""
        
        data = {
            "class": class_name,
            "wet_dry": wet_dry,
            "confidence": float(confidence),
            "is_mixed": bool(is_mixed),
            "is_violation": bool(is_violation),
            "timestamp": datetime.now().isoformat()
        }
        
        if image_base64:
            data["snapshot_base64"] = f"data:image/jpeg;base64,{image_base64}"
            
        try:
            response = requests.post(f"{self.base_url}/ingest", json=data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error sending detection: {e}")
            return None
    
    def get_health(self):
        """Check if backend is running"""
        try:
            response = requests.get(f"{self.base_url}/health")
            return response.status_code == 200
        except:
            return False

# Usage Example
client = WasteDashboardClient()

# Check if backend is running
if client.get_health():
    print("Backend is running!")
    
    # Send detection
    result = client.send_detection(
        class_name="plastic",
        wet_dry="dry",
        confidence=0.92,
        is_mixed=False,
        is_violation=False
    )
    print(f"Detection sent: {result}")
else:
    print("Backend is not running!")
```

### Advanced ML Pipeline Integration
```python
import cv2
import numpy as np
import base64
import requests
from io import BytesIO

class MLWasteDetector:
    def __init__(self, backend_url="http://localhost:8000"):
        self.backend_url = backend_url
        # Initialize your ML model here
        # self.model = load_your_model()
    
    def preprocess_image(self, image_path):
        """Preprocess image for ML model"""
        image = cv2.imread(image_path)
        # Your preprocessing logic here
        return image
    
    def predict(self, image):
        """Run ML inference"""
        # Your ML model prediction logic here
        # prediction = self.model.predict(image)
        
        # Example return values
        return {
            "class": "plastic",
            "confidence": 0.92,
            "wet_dry": "dry",
            "is_mixed": False,
            "is_violation": False
        }
    
    def image_to_base64(self, image_path):
        """Convert image file to base64"""
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    
    def process_and_send(self, image_path):
        """Complete ML pipeline with backend integration"""
        try:
            # Preprocess
            image = self.preprocess_image(image_path)
            
            # Predict
            prediction = self.predict(image)
            
            # Convert image to base64
            img_base64 = self.image_to_base64(image_path)
            
            # Prepare data for backend
            detection_data = {
                **prediction,
                "snapshot_base64": f"data:image/jpeg;base64,{img_base64}"
            }
            
            # Send to backend
            response = requests.post(f"{self.backend_url}/ingest", 
                                   json=detection_data)
            
            if response.status_code == 200:
                print(f"✅ Detection sent successfully: {prediction['class']} "
                      f"({prediction['confidence']:.1%})")
                return response.json()
            else:
                print(f"❌ Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Pipeline error: {e}")
            return None

# Usage
detector = MLWasteDetector()
result = detector.process_and_send("waste_image.jpg")
```

### Batch Processing Example
```python
import os
import time
from concurrent.futures import ThreadPoolExecutor

def process_image_batch(image_folder, backend_url="http://localhost:8000"):
    """Process multiple images and send to backend"""
    
    def send_single_detection(image_path):
        # Your ML detection logic here
        detection = run_ml_model(image_path)  # Your function
        
        # Send to backend
        response = requests.post(f"{backend_url}/ingest", json=detection)
        return response.status_code == 200
    
    image_files = [f for f in os.listdir(image_folder) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    # Process in parallel
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(send_single_detection, 
                                  [os.path.join(image_folder, f) 
                                   for f in image_files]))
    
    success_count = sum(results)
    print(f"Processed {len(image_files)} images, "
          f"{success_count} successful")

# Usage
process_image_batch("./test_images/")
```

---

## 🧪 Testing & Validation

### Test Backend Connection
```python
import requests

def test_backend_connection():
    """Test all backend endpoints"""
    base_url = "http://localhost:8000"
    
    # Test health
    health = requests.get(f"{base_url}/health")
    print(f"Health check: {health.status_code}")
    
    # Test ingest
    test_data = {
        "class": "plastic",
        "wet_dry": "dry",
        "confidence": 0.9,
        "is_mixed": False,
        "is_violation": False
    }
    
    ingest = requests.post(f"{base_url}/ingest", json=test_data)
    print(f"Ingest test: {ingest.status_code}")
    
    # Test live data
    live = requests.get(f"{base_url}/live")
    print(f"Live data: {live.status_code}")
    print(f"Live response: {live.json()}")

test_backend_connection()
```

### Validate Your ML Output
```python
def validate_ml_output(prediction):
    """Validate ML model output before sending"""
    
    required_fields = ["class", "wet_dry", "confidence", "is_mixed", "is_violation"]
    
    # Check required fields
    for field in required_fields:
        if field not in prediction:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate class
    valid_classes = ["plastic", "organic", "metal", "glass", "paper"]
    if prediction["class"] not in valid_classes:
        raise ValueError(f"Invalid class: {prediction['class']}")
    
    # Validate wet_dry
    if prediction["wet_dry"] not in ["wet", "dry"]:
        raise ValueError(f"Invalid wet_dry: {prediction['wet_dry']}")
    
    # Validate confidence
    if not (0.0 <= prediction["confidence"] <= 1.0):
        raise ValueError(f"Invalid confidence: {prediction['confidence']}")
    
    # Validate booleans
    if not isinstance(prediction["is_mixed"], bool):
        raise ValueError("is_mixed must be boolean")
    
    if not isinstance(prediction["is_violation"], bool):
        raise ValueError("is_violation must be boolean")
    
    return True

# Usage
try:
    your_ml_output = {
        "class": "plastic",
        "wet_dry": "dry", 
        "confidence": 0.92,
        "is_mixed": False,
        "is_violation": False
    }
    
    validate_ml_output(your_ml_output)
    print("✅ ML output is valid!")
except ValueError as e:
    print(f"❌ Validation error: {e}")
```

---

## 📊 Performance & Monitoring

### Response Time Monitoring
```python
import time
import statistics

def benchmark_backend(num_requests=100):
    """Benchmark backend response times"""
    times = []
    
    test_data = {
        "class": "plastic",
        "wet_dry": "dry",
        "confidence": 0.9,
        "is_mixed": False,
        "is_violation": False
    }
    
    for i in range(num_requests):
        start = time.time()
        response = requests.post("http://localhost:8000/ingest", json=test_data)
        end = time.time()
        
        if response.status_code == 200:
            times.append((end - start) * 1000)  # Convert to ms
    
    print(f"Average response time: {statistics.mean(times):.2f}ms")
    print(f"Min: {min(times):.2f}ms, Max: {max(times):.2f}ms")
    print(f"Successful requests: {len(times)}/{num_requests}")

benchmark_backend()
```

---

## 🚀 Production Deployment

### Environment Configuration
```python
import os

class Config:
    """Configuration for different environments"""
    
    # Development
    DEV_BACKEND_URL = "http://localhost:8000"
    
    # Production 
    PROD_BACKEND_URL = os.getenv("BACKEND_URL", "https://your-app.herokuapp.com")
    
    # Current environment
    BACKEND_URL = PROD_BACKEND_URL if os.getenv("ENVIRONMENT") == "production" else DEV_BACKEND_URL

# Usage in your ML code
config = Config()
response = requests.post(f"{config.BACKEND_URL}/ingest", json=detection_data)
```

### Error Handling & Retry Logic
```python
import time
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

def create_session_with_retries():
    """Create HTTP session with retry logic"""
    session = requests.Session()
    
    retry_strategy = Retry(
        total=3,  # Total number of retries
        backoff_factor=1,  # Wait time between retries
        status_forcelist=[429, 500, 502, 503, 504],  # HTTP codes to retry
    )
    
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

# Usage
session = create_session_with_retries()

try:
    response = session.post("http://localhost:8000/ingest", 
                          json=detection_data, 
                          timeout=10)
    response.raise_for_status()
    print("Detection sent successfully!")
except requests.exceptions.RequestException as e:
    print(f"Failed to send detection after retries: {e}")
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Not Running
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it
cd waste-dashboard-frontend
npm start
```

#### 2. Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill

# Or run on different port
PORT=3000 npm start
```

#### 3. Image Upload Failures
```python
# Check image size (backend supports up to 50MB)
import os
file_size = os.path.getsize("image.jpg")
print(f"Image size: {file_size / 1024 / 1024:.2f} MB")

# Check base64 format
if not base64_string.startswith("data:image/"):
    base64_string = f"data:image/jpeg;base64,{base64_string}"
```

#### 4. Data Validation Errors
```python
# Check your data matches expected format
expected_format = {
    "class": "one of: plastic, organic, metal, glass, paper",
    "wet_dry": "one of: wet, dry", 
    "confidence": "number between 0.0 and 1.0",
    "is_mixed": "boolean true/false",
    "is_violation": "boolean true/false"
}
```

---

## 📞 Support & Resources

- **Repository:** https://github.com/adithyan372005/waste-dashboard-frontend
- **Backend API:** All endpoints documented above
- **Frontend Dashboard:** Automatic integration with your ML data
- **Issue Tracking:** Use GitHub Issues for bug reports

**Happy ML Integration! 🤖♻️**