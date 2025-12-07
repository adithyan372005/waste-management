import cv2
import time
import json
import argparse
from ultralytics import YOLO
from pathlib import Path
from datetime import datetime

# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------
BIN_TYPE = "dry"       # OR "dry"
THRESHOLD = 0.50
SNAPSHOT_DIR = Path("snapshots")
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------
# CLASS IDS FROM YOUR YOLOv11 TRAINING
# 0 = Dry
# 1 = Wet
# ------------------------------------------------------------
CLASS_MAP = {
    0: "dry",
    1: "wet"
}

# ------------------------------------------------------------
# DETECT + DRAW
# ------------------------------------------------------------
def detect_and_draw(model, frame):
    results = model(frame, conf=THRESHOLD, verbose=False)
    detections = results[0].boxes

    violation = False

    for box in detections:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        waste_type = CLASS_MAP[cls_id]

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # Violation logic
        wrong_bin = (waste_type != BIN_TYPE)
        if wrong_bin:
            violation = True

        # Draw box
        color = (0,255,0) if not wrong_bin else (0,0,255)
        label = f"{waste_type.upper()} ({conf:.2f})"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    return violation, frame

# ------------------------------------------------------------
# VIOLATION ALERT
# ------------------------------------------------------------
def draw_violation_alert(frame):
    h, w, _ = frame.shape
    cv2.rectangle(frame, (0, 0), (w-1, h-1), (0, 0, 255), 10)
    cv2.putText(frame, "VIOLATION DETECTED!",
                (50, 80), cv2.FONT_HERSHEY_SIMPLEX,
                2, (0, 0, 255), 5)
    return frame

# ------------------------------------------------------------
# SAVE SNAPSHOT
# ------------------------------------------------------------
def save_snapshot(frame):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = SNAPSHOT_DIR / f"violation_{timestamp}.jpg"
    cv2.imwrite(str(path), frame)
    return str(path)

# ------------------------------------------------------------
# CAMERA LOOP
# ------------------------------------------------------------
def start_camera(weights_path="best.pt"):
    weights = Path(weights_path)

    # Resolve local path fix
    if not weights.exists():
        script_dir = Path(__file__).resolve().parent
        candidate = script_dir / weights_path
        if candidate.exists():
            weights = candidate
        else:
            raise FileNotFoundError(f"❌ Model weights not found: {weights_path}")

    print(f"Loading YOLO model: {weights}")
    model = YOLO(str(weights))

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ ERROR: Camera not accessible.")
        return

    print("🎥 Camera running — press Q to quit")

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        violation, frame = detect_and_draw(model, frame)

        if violation:
            frame = draw_violation_alert(frame)
            path = save_snapshot(frame)
            print(f"🚨 VIOLATION! Snapshot saved → {path}")

        cv2.imshow("Waste Monitor - YOLOv11", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--weights", "-w", default="best.pt")
    p.add_argument("--bin", "-b", choices=["dry", "wet"], default="wet")
    p.add_argument("--conf", "-c", type=float, default=0.50)
    return p.parse_args()

if __name__ == "__main__":
    args = parse_args()
    BIN_TYPE = args.bin
    THRESHOLD = args.conf
    start_camera(args.weights)
