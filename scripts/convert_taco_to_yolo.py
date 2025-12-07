import json
import shutil
from pathlib import Path
from PIL import Image
import random
import yaml

# -----------------------
# CONFIG
# -----------------------
random.seed(42)

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw" / "taco"
ANN = RAW / "annotations_final.json"   # use cleaned annotations
OUT = ROOT / "data" / "taco_yolo"

print("Using annotation file:", ANN)
data = json.loads(ANN.read_text(encoding="utf-8"))

images = data["images"]
annotations = data["annotations"]
categories = {int(c["id"]): c["name"] for c in data["categories"]}

# Group annotations by image_id
anns_by_image = {}
for ann in annotations:
    anns_by_image.setdefault(int(ann["image_id"]), []).append(ann)

image_ids = [int(img["id"]) for img in images]

# -----------------------
# Split train/val/test
# -----------------------
random.shuffle(image_ids)
n = len(image_ids)

train_ids = set(image_ids[: int(0.8*n)])
val_ids   = set(image_ids[int(0.8*n): int(0.9*n)])
test_ids  = set(image_ids[int(0.9*n):])

splits = {"train": train_ids, "val": val_ids, "test": test_ids}

# Make directories
for s in splits:
    (OUT / s / "images").mkdir(parents=True, exist_ok=True)
    (OUT / s / "labels").mkdir(parents=True, exist_ok=True)

# -----------------------
# Convert COCO → YOLO
# -----------------------
copied = 0
labeled = 0
boxes = 0

for img in images:
    img_id = int(img["id"])
    fname = img["file_name"]

    src = RAW / fname
    if not src.exists():
        print("Missing image:", src)
        continue

    # Determine split
    if img_id in train_ids:
        split = "train"
    elif img_id in val_ids:
        split = "val"
    else:
        split = "test"

    # Copy image
    dst_img = OUT / split / "images" / Path(fname)
    dst_img.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst_img)
    copied += 1

    # Get image size
    w, h = img.get("width"), img.get("height")
    if not w or not h:
        with Image.open(dst_img) as im:
            w, h = im.size

    # Build YOLO label lines
    yolo_lines = []
    for ann in anns_by_image.get(img_id, []):
        cat = int(ann["category_id"])
        x, y, bw, bh = ann["bbox"]

        xc = (x + bw/2) / w
        yc = (y + bh/2) / h
        wn = bw / w
        hn = bh / h

        yolo_lines.append(f"{cat} {xc:.6f} {yc:.6f} {wn:.6f} {hn:.6f}")
        boxes += 1

    # Write label file
    dst_lbl = OUT / split / "labels" / Path(fname).with_suffix(".txt")
    dst_lbl.parent.mkdir(parents=True, exist_ok=True)
    dst_lbl.write_text("\n".join(yolo_lines), encoding="utf-8")

    if yolo_lines:
        labeled += 1

print("\n----------------------------")
print("Conversion complete!")
print("Images copied:", copied)
print("Images with labels:", labeled)
print("Total bounding boxes:", boxes)
print("----------------------------")

# -----------------------
# Write YOLO data.yaml
# -----------------------
yaml_data = {
    "path": str(OUT),
    "train": "train/images",
    "val": "val/images",
    "test": "test/images",
    "names": categories,
}

yaml_path = OUT / "data.yaml"
yaml_path.write_text(yaml.dump(yaml_data), encoding="utf-8")

print("Saved:", yaml_path)
print("\n🎉 YOLO dataset is ready at:", OUT)
