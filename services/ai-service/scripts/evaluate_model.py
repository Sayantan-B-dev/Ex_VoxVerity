"""AASIST-L Evaluation Script for VoxVerity.

This script evaluates the AASIST-L model on controlled test data.
It generates a basic evaluation report with metrics.

Usage:
    cd services/ai-service
    python scripts/evaluate_model.py --data-dir ./test_data

Test data directory should contain:
    - bona_fide/  : Natural speech WAV files
    - spoof/      : Synthetic/spoofed WAV files
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.dsp.analyzer import decode_wav_pcm
from app.models.aasist_wrapper import get_aasist, MODEL_WINDOW_SAMPLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def load_audio_files(data_dir: str) -> Tuple[List[Dict], List[Dict]]:
    """Load bona fide and spoof audio files from directories."""
    bona_fide_files = []
    spoof_files = []
    
    bf_dir = os.path.join(data_dir, "bona_fide")
    sp_dir = os.path.join(data_dir, "spoof")
    
    if os.path.exists(bf_dir):
        for f in os.listdir(bf_dir):
            if f.endswith((".wav", ".WAV")):
                bona_fide_files.append({
                    "path": os.path.join(bf_dir, f),
                    "label": "bona_fide",
                    "filename": f,
                })
    
    if os.path.exists(sp_dir):
        for f in os.listdir(sp_dir):
            if f.endswith((".wav", ".WAV")):
                spoof_files.append({
                    "path": os.path.join(sp_dir, f),
                    "label": "spoof",
                    "filename": f,
                })
    
    return bona_fide_files, spoof_files


def evaluate_file(model, file_info: Dict) -> Dict:
    """Evaluate a single audio file."""
    try:
        with open(file_info["path"], "rb") as f:
            data = f.read()
        
        samples = decode_wav_pcm(data)
        if samples is None:
            return {
                "filename": file_info["filename"],
                "label": file_info["label"],
                "status": "decode_failed",
                "score": 0.5,
                "confidence": 0.0,
            }
        
        audio_np = np.array(samples, dtype=np.float32)
        result = model.predict(audio_np)
        
        return {
            "filename": file_info["filename"],
            "label": file_info["label"],
            "status": "success",
            "score": result["score"],
            "confidence": result["confidence"],
            "fallback": result["fallback"],
        }
    
    except Exception as e:
        return {
            "filename": file_info["filename"],
            "label": file_info["label"],
            "status": "error",
            "error": str(e),
            "score": 0.5,
            "confidence": 0.0,
        }


def compute_metrics(results: List[Dict], threshold: float = 0.5) -> Dict:
    """Compute evaluation metrics from results."""
    tp = fp = tn = fn = 0
    scores_bf = []
    scores_sp = []
    
    for r in results:
        if r["status"] != "success":
            continue
        
        score = r["score"]
        label = r["label"]
        
        if label == "bona_fide":
            scores_bf.append(score)
            if score >= threshold:
                tp += 1  # True positive: bona fide correctly identified
            else:
                fn += 1  # False negative: bona fide wrongly identified as spoof
        else:
            scores_sp.append(score)
            if score < threshold:
                tn += 1  # True negative: spoof correctly identified
            else:
                fp += 1  # False positive: spoof wrongly identified as bona fide
    
    # Compute metrics
    total = tp + tn + fp + fn
    accuracy = (tp + tn) / total if total > 0 else 0
    far = fp / (fp + tn) if (fp + tn) > 0 else 0  # False Accept Rate
    frr = fn / (fn + tp) if (fn + tp) > 0 else 0  # False Reject Rate
    
    return {
        "total_files": total,
        "bona_fide_files": len(scores_bf),
        "spoof_files": len(scores_sp),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": round(accuracy, 4),
        "far": round(far, 4),
        "frr": round(frr, 4),
        "mean_score_bona_fide": round(np.mean(scores_bf), 4) if scores_bf else 0,
        "mean_score_spoof": round(np.mean(scores_sp), 4) if scores_sp else 0,
        "threshold": threshold,
    }


def run_evaluation(data_dir: str, output_file: str = None):
    """Run full evaluation pipeline."""
    logger.info(f"Starting AASIST-L evaluation on: {data_dir}")
    
    # Load model
    model = get_aasist()
    if not model.load():
        logger.warning(f"Model not loaded: {model.status['error']}")
        logger.info("Using heuristic fallback for evaluation")
    
    # Load test files
    bona_fide_files, spoof_files = load_audio_files(data_dir)
    all_files = bona_fide_files + spoof_files
    
    if not all_files:
        logger.error(f"No audio files found in {data_dir}")
        logger.info("Expected structure:")
        logger.info("  test_data/")
        logger.info("    bona_fide/")
        logger.info("      sample1.wav")
        logger.info("      sample2.wav")
        logger.info("    spoof/")
        logger.info("      sample1.wav")
        logger.info("      sample2.wav")
        return
    
    logger.info(f"Found {len(bona_fide_files)} bona fide files, {len(spoof_files)} spoof files")
    
    # Evaluate each file
    results = []
    for i, file_info in enumerate(all_files):
        logger.info(f"  [{i+1}/{len(all_files)}] Evaluating: {file_info['filename']}")
        result = evaluate_file(model, file_info)
        results.append(result)
    
    # Compute metrics
    metrics = compute_metrics(results)
    
    # Build report
    report = {
        "evaluation_date": datetime.utcnow().isoformat(),
        "model": model.status,
        "test_data": {
            "directory": data_dir,
            "bona_fide_count": len(bona_fide_files),
            "spoof_count": len(spoof_files),
        },
        "metrics": metrics,
        "results": results,
        "limitations": [
            "Model performs well on ASVspoof2019 LA-style data",
            "Performance degrades on out-of-domain data",
            "Replay attacks may not be well-represented",
            "Requires minimum 4 seconds of audio",
            "Channel/noise affects accuracy",
        ],
    }
    
    # Save report
    if output_file is None:
        output_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "docs",
            f"evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        )
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"\nEvaluation complete!")
    logger.info(f"  Accuracy: {metrics['accuracy']:.2%}")
    logger.info(f"  FAR: {metrics['far']:.2%}")
    logger.info(f"  FRR: {metrics['frr']:.2%}")
    logger.info(f"  Report saved to: {output_file}")
    
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate AASIST-L model")
    parser.add_argument("--data-dir", required=True, help="Directory with test audio files")
    parser.add_argument("--output", default=None, help="Output report file path")
    args = parser.parse_args()
    
    run_evaluation(args.data_dir, args.output)
