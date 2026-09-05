"""Performance Monitoring for VoxVerity Realtime Pipeline.

Tracks latency, queue depth, chunk throughput, and model inference time.
Implements backpressure to prevent unbounded queue growth.
"""

import time
import logging
from typing import Optional, Dict, List
from collections import deque

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitors realtime pipeline performance metrics."""

    def __init__(self, window_size: int = 100):
        self.window_size = window_size

        # Latency tracking
        self._chunk_latencies: deque = deque(maxlen=window_size)
        self._analysis_latencies: deque = deque(maxlen=window_size)

        # Throughput tracking
        self._chunks_processed = 0
        self._chunks_dropped = 0
        self._start_time = time.time()

        # Queue depth
        self._queue_depths: deque = deque(maxlen=window_size)

        # Model inference times
        self._model_latencies: Dict[str, deque] = {
            "AASIST-L": deque(maxlen=window_size),
            "ECAPA-TDNN": deque(maxlen=window_size),
            "DSP": deque(maxlen=window_size),
        }

    def record_chunk_received(self):
        """Record when a chunk is received."""
        pass  # Timestamp tracked at processing

    def record_chunk_processed(self, latency_ms: float):
        """Record chunk processing latency."""
        self._chunk_latencies.append(latency_ms)
        self._chunks_processed += 1

    def record_chunk_dropped(self):
        """Record a dropped chunk (backpressure)."""
        self._chunks_dropped += 1

    def record_analysis_latency(self, latency_ms: float):
        """Record full analysis pipeline latency."""
        self._analysis_latencies.append(latency_ms)

    def record_model_latency(self, model: str, latency_ms: float):
        """Record model inference latency."""
        if model in self._model_latencies:
            self._model_latencies[model].append(latency_ms)

    def record_queue_depth(self, depth: int):
        """Record current queue depth."""
        self._queue_depths.append(depth)

    def get_metrics(self) -> dict:
        """Get current performance metrics."""
        uptime = time.time() - self._start_time

        return {
            "uptime_seconds": round(uptime, 1),
            "chunks_processed": self._chunks_processed,
            "chunks_dropped": self._chunks_dropped,
            "throughput_per_minute": round(
                self._chunks_processed / (uptime / 60) if uptime > 60 else self._chunks_processed, 1
            ),
            "latency": {
                "chunk_avg_ms": self._avg(self._chunk_latencies),
                "chunk_p95_ms": self._percentile(self._chunk_latencies, 95),
                "analysis_avg_ms": self._avg(self._analysis_latencies),
                "analysis_p95_ms": self._percentile(self._analysis_latencies, 95),
            },
            "queue": {
                "current_depth": self._queue_depths[-1] if self._queue_depths else 0,
                "avg_depth": self._avg(self._queue_depths),
                "max_depth": max(self._queue_depths) if self._queue_depths else 0,
            },
            "models": {
                model: {
                    "avg_ms": self._avg(latencies),
                    "p95_ms": self._percentile(latencies, 95),
                    "count": len(latencies),
                }
                for model, latencies in self._model_latencies.items()
            },
        }

    def get_health_status(self) -> str:
        """Get health status based on performance metrics."""
        metrics = self.get_metrics()

        # Check for issues
        if metrics["chunks_dropped"] > 10:
            return "degraded"

        if metrics["latency"]["analysis_p95_ms"] > 5000:
            return "degraded"

        if metrics["queue"]["current_depth"] > 8:
            return "degraded"

        return "healthy"

    def _avg(self, data: deque) -> float:
        """Calculate average."""
        if not data:
            return 0
        return round(sum(data) / len(data), 2)

    def _percentile(self, data: deque, percentile: int) -> float:
        """Calculate percentile."""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        index = min(index, len(sorted_data) - 1)
        return round(sorted_data[index], 2)


class BackpressureManager:
    """Manages backpressure for the realtime pipeline."""

    def __init__(
        self,
        max_queue_size: int = 10,
        drop_threshold: int = 8,
        cooldown_seconds: float = 5.0,
    ):
        self.max_queue_size = max_queue_size
        self.drop_threshold = drop_threshold
        self.cooldown_seconds = cooldown_seconds
        self._last_drop_time: Optional[float] = None
        self._consecutive_drops = 0

    def should_drop(self, queue_size: int) -> bool:
        """Check if a chunk should be dropped due to backpressure."""
        if queue_size >= self.max_queue_size:
            self._consecutive_drops += 1
            self._last_drop_time = time.time()
            return True

        if queue_size >= self.drop_threshold:
            # Drop oldest chunk occasionally to prevent buildup
            now = time.time()
            if self._last_drop_time and (now - self._last_drop_time) < self.cooldown_seconds:
                self._consecutive_drops += 1
                return True

        self._consecutive_drops = 0
        return False

    def get_status(self) -> dict:
        """Get backpressure status."""
        return {
            "max_queue_size": self.max_queue_size,
            "drop_threshold": self.drop_threshold,
            "consecutive_drops": self._consecutive_drops,
            "last_drop_time": self._last_drop_time,
        }


# Singletons
_monitor: Optional[PerformanceMonitor] = None
_backpressure: Optional[BackpressureManager] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get or create the performance monitor singleton."""
    global _monitor
    if _monitor is None:
        _monitor = PerformanceMonitor()
    return _monitor


def get_backpressure_manager() -> BackpressureManager:
    """Get or create the backpressure manager singleton."""
    global _backpressure
    if _backpressure is None:
        _backpressure = BackpressureManager()
    return _backpressure
