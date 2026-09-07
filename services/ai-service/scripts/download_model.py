"""Download AASIST-L model checkpoint from HuggingFace.

Usage:
    cd services/ai-service
    python scripts/download_model.py

This downloads the model checkpoint to model_artifacts/aasist_l.pth
"""

import os
import sys
import hashlib
import urllib.request
import zipfile
import io

# HuggingFace model URLs — the wrapper runs the official ONNX export
# (onnxruntime), so this downloads aasist-l.onnx.
MODEL_URL = "https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L/resolve/main/aasist-l.onnx"
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "model_artifacts")
MODEL_PATH = os.path.join(MODEL_DIR, "aasist-l.onnx")


def download_model():
    """Download the AASIST-L model checkpoint."""
    os.makedirs(MODEL_DIR, exist_ok=True)

    if os.path.exists(MODEL_PATH):
        print(f"Model already exists at {MODEL_PATH}")
        print("Delete it first if you want to re-download.")
        return True

    print(f"Downloading AASIST-L ONNX model from HuggingFace...")
    print(f"URL: {MODEL_URL}")
    print(f"Destination: {MODEL_PATH}")

    try:
        # Download with progress
        def progress_hook(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100, downloaded * 100 // total_size)
                mb_downloaded = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                print(f"\r  Progress: {percent}% ({mb_downloaded:.1f}/{mb_total:.1f} MB)", end="", flush=True)

        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH, reporthook=progress_hook)
        print()  # New line after progress

        # Verify file exists and has reasonable size
        file_size = os.path.getsize(MODEL_PATH)
        if file_size < 1000:  # Less than 1KB is suspicious
            print(f"ERROR: Downloaded file is too small ({file_size} bytes). May be corrupted.")
            os.remove(MODEL_PATH)
            return False

        print(f"Download complete! File size: {file_size / (1024 * 1024):.1f} MB")
        return True

    except Exception as e:
        print(f"Download failed: {e}")
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        return False


if __name__ == "__main__":
    success = download_model()
    sys.exit(0 if success else 1)
