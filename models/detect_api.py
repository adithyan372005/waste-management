import cv2
import json
from datetime import datetime
from pathlib import Path
from ultralytics import YOLO

# ---------------------------------
# CONFIG
# ---------------------------------
SNAPSHOT_DIR = Path("snapshots")
SNAPSHOT_DIR.mkdir(exist_ok=True)

THRESHOLD = 0.50

# CLASS IDS
CLASS_MAP = {
    0: "dry",
    1: "wet"
}

# ---------------------------------
# LOAD MODEL (do this once)
# ---------------------------------
MODEL = YOLO("models/best.pt")   # update path if needed


def save_snapshot(frame):
    """Save violation snapshot."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"violation_{timestamp}.jpg"
    filepath = SNAPSHOT_DIR / filename
    cv2.imwrite(str(filepath), frame)
    return str(filepath)


def analyze_frame(frame, correct_bin="dry"):
    """
    Runs YOLO detection on a frame and returns JSON formatted output.
    """

    results = MODEL(frame, conf=THRESHOLD, verbose=False)
    detections = results[0].boxes

    if len(detections) == 0:
        return {
            "class": None,
            "wet_dry": None,
            "confidence": None,
            "is_mixed": False,
            "is_violation": False,
            "snapshot_path": None,
            "timestamp": datetime.now().isoformat()
        }

    waste_types = []
    confidences = []

    for box in detections:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])

        waste_types.append(CLASS_MAP[cls_id])
        confidences.append(conf)

    # Determine mixed waste
    is_mixed = len(set(waste_types)) > 1

    # Most confident detection
    top_index = confidences.index(max(confidences))
    top_type = waste_types[top_index]
    top_conf = max(confidences)

    # Violation logic
    is_violation = (top_type != correct_bin)

    snapshot_path = None

    if is_violation:
        snapshot_path = save_snapshot(frame)

    output = {
        "class": top_type,
        "wet_dry": top_type,
        "confidence": round(top_conf, 3),
        "is_mixed": is_mixed,
        "is_violation": is_violation,
        "snapshot_path": snapshot_path,
        "timestamp": datetime.now().isoformat()
    }

    return output
