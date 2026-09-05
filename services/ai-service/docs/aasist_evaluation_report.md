# AASIST-L Evaluation Report

**Model:** AASIST-L (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention)
**Version:** v1.0
**Source:** https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L
**License:** MIT
**Parameters:** 85,306
**Evaluation Date:** September 2026
**Evaluator:** VoxVerity Project

---

## 1. Model Overview

AASIST-L is a lightweight audio anti-spoofing model that operates on raw speech waveform.
- **Input:** 64,600 samples at 16 kHz (~4.04 seconds)
- **Output:** Binary classification score (spoof vs bona fide)
- **Score Semantics:** Higher score = more likely bona fide (not spoofed)

## 2. Known Limitations (from Model Card)

- Strong in-domain performance on ASVspoof2019 LA
- **Materially weaker performance on out-of-domain evaluation sets**
- Should NOT be treated as a universal "AI probability"
- Score should be called "model score" or "spoof signal", not "probability"

## 3. Evaluation Methodology

### 3.1 Test Data Categories

| Category | Description | Expected Behavior |
|----------|-------------|-------------------|
| Natural speech | Human-recorded speech samples | Higher bona fide scores |
| Synthetic/TTS | Text-to-speech generated audio | Lower bona fide scores |
| Replay | Recorded audio replayed through speakers | Variable scores |
| Voice conversion | Modified voice characteristics | Variable scores |
| Noise/Artifacts | Non-speech audio, silence, noise | Uncertain/low scores |

### 3.2 Metrics

- **EER (Equal Error Rate):** Primary metric for spoof detection
- **Accuracy:** Overall classification accuracy
- **AUC-ROC:** Area under ROC curve
- **FAR (False Accept Rate):** Rate of accepting spoof as bona fide
- **FRR (False Reject Rate):** Rate of rejecting bona fide as spoof

### 3.3 Calibration Approach

Score normalization maps raw model output to a project-defined signal:

```yaml
calibration:
  method: "min_max"
  raw_range: [0.0, 1.0]
  normalized_range: [0, 100]
  
  # Thresholds (configurable)
  thresholds:
    low: 30      # Below = likely spoof signal
    medium: 50   # Uncertain zone
    high: 70     # Above = likely bona fide signal
  
  # Severity mapping
  severity:
    spoof_high: { range: [0, 25], label: "HIGH_SPOOF_SIGNAL" }
    spoof_low: { range: [26, 49], label: "LOW_SPOOF_SIGNAL" }
    uncertain: { range: [50, 60], label: "UNCERTAIN" }
    bona_fide_low: { range: [61, 74], label: "LOW_BONAFIDE_SIGNAL" }
    bona_fide_high: { range: [75, 100], label: "HIGH_BONAFIDE_SIGNAL" }
```

## 4. Preliminary Observations

### 4.1 In-Domain Behavior
- Model performs well on ASVspoof2019 LA-style data
- Clear separation between bona fide and spoof classes
- Low EER on controlled test set

### 4.2 Out-of-Domain Behavior
- **Significant performance degradation** on unseen domains
- Higher false positive rate on noisy/reverberant conditions
- Replay attacks may not be well-represented in training

### 4.3 Edge Cases
- Very short audio (< 1 second): Insufficient context, return uncertain
- Silence/no energy: Low confidence, return uncertain
- Clipped audio: Degraded quality, flag in output

## 5. Limitations and Disclaimers

1. **NOT a universal deepfake detector** — only trained on specific attack types
2. **NOT an authenticity proof** — higher score does not guarantee human voice
3. **Domain-dependent** — performance varies significantly across datasets
4. **Requires sufficient audio** — minimum ~4 seconds for reliable inference
5. **Channel-dependent** — affected by codec, compression, noise

## 6. Recommendations

1. **Always present as a signal**, not a verdict
2. **Combine with other signals** (DSP, speaker similarity, context)
3. **Calibrate per deployment** — don't use universal thresholds
4. **Monitor false positives** — track in production
5. **Update regularly** — re-evaluate as new attack types emerge

## 7. Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Sep 2026 | Initial evaluation |

---

**Document Status:** living document — update after each evaluation cycle
**Next Review:** After collecting real-world test data
