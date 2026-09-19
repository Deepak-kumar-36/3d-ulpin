# VERTA ML Segmentation Detector

This directory contains the machine-learning pipeline for 3-class semantic segmentation of floor plans:
- **Class 0**: Background / outside
- **Class 1**: Separator (walls + doors + windows)
- **Class 2**: Room interior (rooms, bathrooms, kitchens, etc.)

The predicted probability masks are converted into enclosed units using the existing contour extraction and Shapely cleanup in `./vision`.

---

## Dataset Licensing Notice

> **IMPORTANT**: The primary training dataset is **CubiCasa5K** (or its Hugging Face COCO representation `phungpx/cubicasa5k-coco`).
> - The original dataset is hosted on [Zenodo (DOI: 10.5281/zenodo.5095393)](https://zenodo.org/records/5095393) and is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.
> - Please review the licensing terms on the Zenodo page before using this dataset for any commercial or non-academic purposes.

---

## Directory Structure

```text
ml/
├── data/
│   ├── prepare_cubicasa.py   # Dataset downloader & mask generator (supports HF & --synthetic)
│   └── augment.py            # Photo degradations applied jointly to image & mask
├── models/
│   ├── verta_seg.onnx        # Exported ONNX model (dynamic axes H, W)
│   └── model_card.json       # Metadata, input specifications, and benchmark metrics
├── outputs/                  # Evaluation plots, worst/median case overlays
├── train.py                  # PyTorch + segmentation_models_pytorch training loop
├── evaluate.py               # Test-split IoU and end-to-end vision contour comparison
├── export_onnx.py            # PyTorch-to-ONNX exporter with numerical validation
├── infer.py                  # Standalone CPU inference via onnxruntime
├── make_colab_bundle.py      # Archives training codebase into ml_bundle.zip for Colab
├── train_colab.ipynb         # End-to-end training notebook for Google Colab GPU
├── requirements-train.txt    # Colab GPU training dependencies
└── requirements-infer.txt    # Local lightweight ONNX inference dependencies
```

---

## Quickstart: Local Verification

Local inference runs strictly with `onnxruntime` (no PyTorch required):

1. **Install local inference requirements**:
   ```bash
   pip install -r ml/requirements-infer.txt
   ```

2. **Generate synthetic data pairs** (for smoke testing without downloading the 15GB dataset):
   ```bash
   python ml/data/prepare_cubicasa.py --synthetic --limit 20
   ```

3. **Preview data augmentations**:
   ```bash
   python ml/data/augment.py
   # View generated ml/outputs/aug_preview.png
   ```

4. **Run Vision with ML Detector**:
   ```bash
   # Use the exported ONNX model
   python run_vision.py plans/L1.png --detector ml --debug

   # Or run auto mode (tries ML, falls back to classical on low confidence)
   python run_vision.py plans/L1.png --detector auto --debug
   ```

---

## Google Colab GPU Training Workflow

1. Package the repository for Colab:
   ```bash
   python ml/make_colab_bundle.py
   ```
   This creates `ml_bundle.zip`.

2. Open `ml/train_colab.ipynb` in [Google Colab](https://colab.research.google.com/).
3. Connect to a GPU runtime (`Runtime -> Change runtime type -> T4 GPU`).
4. Execute the cells in order:
   - **Cell 1**: Check GPU (`nvidia-smi`)
   - **Cell 2**: Mount Google Drive (`/content/drive/MyDrive/verta_ml`)
   - **Cell 3**: Upload & unzip `ml_bundle.zip`
   - **Cell 4**: Install `requirements-train.txt`
   - **Cell 5**: Prepare dataset (`python ml/data/prepare_cubicasa.py --limit 200` then full)
   - **Cell 6**: Train (`python ml/train.py --data-dir ml/data/dataset --epochs 30 --out /content/drive/MyDrive/verta_ml/checkpoints`)
   - **Cell 7**: Evaluate (`python ml/evaluate.py --model /content/drive/MyDrive/verta_ml/checkpoints/best_model.pth --data-dir ml/data/dataset`)
   - **Cell 8**: Export to ONNX (`python ml/export_onnx.py --checkpoint /content/drive/MyDrive/verta_ml/checkpoints/best_model.pth --out ml/models/verta_seg.onnx`)
   - **Cell 9**: Download `verta_seg.onnx` and `model_card.json` back to your local `ml/models/` folder.
