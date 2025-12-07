from ultralytics import YOLO

def main():
    # Load YOLOv11 small model
    model = YOLO("yolo11s.pt")

    # Train the model
    model.train(
        data="data/taco_yolo/data.yaml",
        epochs=50,
        imgsz=640,
        batch=8,       # lower batch for CPU
        device="cpu",  # <<< IMPORTANT FIX
        workers=0,     # recommended for Windows CPU training
        pretrained=True,
        name="taco_yolo_v11"
    )

    print("\nTraining complete!")
    print("Best model saved at: runs/detect/taco_yolo_v11/weights/best.pt")

if __name__ == "__main__":
    main()
