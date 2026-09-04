import struct
import math
from app.dsp.analyzer import decode_wav_pcm, compute_metrics, quality_flags


def create_test_wav(samples: list[float], sample_rate: int = 16000) -> bytes:
    """Create a minimal WAV file from float32 samples."""
    n = len(samples)
    # Convert to int16
    int_samples = [int(max(-32768, min(32767, s * 32767))) for s in samples]
    raw_data = struct.pack(f"<{len(int_samples)}h", *int_samples)

    # WAV header
    data_size = len(raw_data)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,  # chunk size
        1,   # PCM format
        1,   # mono
        sample_rate,
        sample_rate * 2,  # byte rate
        2,   # block align
        16,  # bits per sample
        b"data",
        data_size,
    )
    return header + raw_data


def test_decode_wav():
    samples = [0.0, 0.5, -0.5, 0.3, -0.3]
    wav = create_test_wav(samples)
    result = decode_wav_pcm(wav)
    assert result is not None
    assert len(result) == len(samples)


def test_decode_invalid():
    assert decode_wav_pcm(b"not a wav file") is None
    assert decode_wav_pcm(b"") is None


def test_compute_metrics_silence():
    samples = [0.0] * 16000  # 1 second of silence
    metrics = compute_metrics(samples)
    assert metrics["dbfs"] == -100
    assert metrics["silence_ratio"] == 1.0
    assert metrics["peak_amplitude"] == 0.0


def test_compute_metrics_sine():
    sr = 16000
    samples = [math.sin(2 * math.pi * 440 * i / sr) for i in range(sr)]
    metrics = compute_metrics(samples)
    assert metrics["duration_s"] == 1.0
    assert metrics["sample_count"] == sr
    assert metrics["peak_amplitude"] > 0.9
    assert metrics["silence_ratio"] < 0.5


def test_quality_flags():
    metrics = {"clipping_ratio": 0.05, "silence_ratio": 0.9, "dbfs": -50, "duration_s": 0.2, "sample_count": 100}
    flags = quality_flags(metrics)
    assert flags["clipping_detected"] is True
    assert flags["silence_detected"] is True
    assert flags["low_energy"] is True
    assert flags["very_short"] is True
    assert flags["decode_ok"] is True
