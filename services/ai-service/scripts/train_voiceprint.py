"""VoxVerity Voiceprint Trainer — record your voice, train a live voiceprint.

A small Python desktop app (tkinter) that:
  1. Records your voice — either a continuous ~1-minute take or several short
     parts (e.g. 10-15s each). Speak clearly, away from noise.
  2. Segments the recording into ~3s chunks (matching the live analysis
     cadence), drops silent chunks, and embeds each with ECAPA-TDNN.
  3. Averages the embeddings into a single L2-normalized voiceprint and saves
     it to model_artifacts/voiceprints/ (used by the realtime pipeline to
     score "Speaker Similarity" for the person who joins a call).
  4. Lets you test the trained voiceprint with a short live sample.

Usage:
    cd services/ai-service
    pip install sounddevice     # recording dependency
    python scripts/train_voiceprint.py

Privacy: the voiceprint is a local file on this machine (a derived biometric
embedding). It is never uploaded, never stored on-chain, and raw audio is
never persisted.
"""

import os
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk

import numpy as np

# Allow running from anywhere in the repo.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.models.voiceprint import get_voiceprint  # noqa: E402

SAMPLE_RATE = 16000
MAX_SECONDS = 90  # keep at most 90s of audio in memory


def _load_sounddevice():
    """Import sounddevice with a friendly error if missing."""
    try:
        import sounddevice as sd
        return sd
    except ImportError:
        raise SystemExit(
            "sounddevice is not installed.\n"
            "Run:  pip install sounddevice\n"
            "Then re-run this script."
        )


class VoiceprintTrainerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.sd = _load_sounddevice()
        self.vp = get_voiceprint()

        self.recording = False
        self.audio_buffer = np.zeros(0, dtype=np.float32)
        self.stream = None
        self.level = 0.0
        self.rec_seconds = 0.0
        self._lock = threading.Lock()
        self._level_job = None

        root.title("VoxVerity — Train with your voice")
        root.geometry("720x540")
        root.configure(bg="#0e1626")

        self._build_ui()
        self._refresh_status()
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── UI ─────────────────────────────────────────────────────────────────
    def _build_ui(self):
        pad = {"padx": 16, "pady": 6}

        tk.Label(
            self.root,
            text="Train with your voice",
            font=("Segoe UI", 20, "bold"),
            bg="#0e1626", fg="#e8f0ff",
        ).pack(anchor="w", **pad)

        tk.Label(
            self.root,
            text=(
                "Record about 1 minute of you speaking (or several short parts). "
                "The app splits it into ~3s chunks and trains a voiceprint the "
                "pipeline uses to recognize YOUR voice on live calls."
            ),
            font=("Segoe UI", 10),
            bg="#0e1626", fg="#9fb0cc", wraplength=660, justify="left",
        ).pack(anchor="w", **pad)

        # Name + duration readout
        row = tk.Frame(self.root, bg="#0e1626")
        row.pack(fill="x", **pad)
        tk.Label(row, text="Voiceprint name:", bg="#0e1626", fg="#c6d3ea").pack(side="left")
        self.name_var = tk.StringVar(value="default")
        self.name_entry = tk.Entry(row, textvariable=self.name_var, width=20, bg="#141f36", fg="#e8f0ff", insertbackground="#e8f0ff")
        self.name_entry.pack(side="left", padx=8)
        self.rec_label = tk.Label(row, text="0.0s recorded", bg="#0e1626", fg="#9fb0cc", font=("Consolas", 11))
        self.rec_label.pack(side="right")

        # Level meter
        self.level_canvas = tk.Canvas(self.root, height=18, bg="#0a1120", highlightthickness=0)
        self.level_canvas.pack(fill="x", padx=16, pady=(0, 4))
        self.level_bar = self.level_canvas.create_rectangle(0, 0, 0, 18, fill="#00d97e", outline="")

        # Buttons
        btns = tk.Frame(self.root, bg="#0e1626")
        btns.pack(fill="x", **pad)
        self.rec_60_btn = ttk.Button(btns, text="Record 60s", command=lambda: self.start_recording(60))
        self.rec_60_btn.pack(side="left", padx=4)
        self.rec_part_btn = ttk.Button(btns, text="Record 15s part", command=lambda: self.start_recording(15))
        self.rec_part_btn.pack(side="left", padx=4)
        self.stop_btn = ttk.Button(btns, text="Stop", command=self.stop_recording, state="disabled")
        self.stop_btn.pack(side="left", padx=4)
        self.train_btn = ttk.Button(btns, text="Train voiceprint", command=self.train)
        self.train_btn.pack(side="left", padx=4)
        self.test_btn = ttk.Button(btns, text="Test my voice", command=lambda: self.test(5))
        self.test_btn.pack(side="left", padx=4)
        self.reset_btn = ttk.Button(btns, text="Reset", command=self.reset)
        self.reset_btn.pack(side="left", padx=4)

        # Status / log
        self.status = tk.Label(
            self.root, text="", font=("Consolas", 10), bg="#0e1626",
            fg="#00d97e", justify="left", anchor="w", wraplength=680,
        )
        self.status.pack(fill="x", **pad)

        tk.Label(
            self.root,
            text="Local only: the voiceprint stays on this machine and is never uploaded or stored on-chain.",
            font=("Segoe UI", 9),
            bg="#0e1626", fg="#5f7399",
        ).pack(anchor="w", **pad)

    # ── Recording ──────────────────────────────────────────────────────────
    def _audio_callback(self, indata, frames, time_info, status):
        with self._lock:
            if len(self.audio_buffer) < SAMPLE_RATE * MAX_SECONDS:
                self.audio_buffer = np.concatenate([self.audio_buffer, indata[:, 0].astype(np.float32)])
            self.rec_seconds = len(self.audio_buffer) / SAMPLE_RATE
            self.level = float(np.sqrt(np.mean(indata[:, 0] ** 2))) if len(indata) else 0.0

    def start_recording(self, seconds: int):
        if self.recording:
            return
        try:
            self.stream = self.sd.InputStream(
                samplerate=SAMPLE_RATE,
                channels=1,
                dtype="float32",
                callback=self._audio_callback,
            )
            self.stream.start()
        except Exception as e:
            self._log(f"Mic error: {e}")
            return
        self.recording = True
        self.rec_60_btn.config(state="disabled")
        self.rec_part_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self.train_btn.config(state="disabled")
        self._log(f"Recording {seconds}s — speak clearly… (stop early anytime)")
        self._deadline = time.time() + seconds
        self._tick_recording()

    def _tick_recording(self):
        if not self.recording:
            return
        with self._lock:
            self.rec_label.config(text=f"{self.rec_seconds:.1f}s recorded")
            bar_w = int(self.level * 680)
            self.level_canvas.coords(self.level_bar, 0, 0, min(bar_w, 680), 18)
        if time.time() >= self._deadline:
            self.stop_recording(auto=True)
            return
        self._level_job = self.root.after(100, self._tick_recording)

    def stop_recording(self, auto=False):
        if not self.recording:
            return
        self.recording = False
        try:
            self.stream.stop()
            self.stream.close()
        except Exception:
            pass
        self.stream = None
        if self._level_job:
            self.root.after_cancel(self._level_job)
            self._level_job = None
        with self._lock:
            secs = self.rec_seconds
        self.rec_60_btn.config(state="normal")
        self.rec_part_btn.config(state="normal")
        self.stop_btn.config(state="disabled")
        self.train_btn.config(state="normal")
        self._log(f"Stopped — {secs:.1f}s in buffer. Click 'Train voiceprint' to build the model.")

    # ── Training / testing ─────────────────────────────────────────────────
    def train(self):
        with self._lock:
            audio = self.audio_buffer.copy()
            secs = self.rec_seconds
        self._set_busy(True)
        self._log("Training voiceprint (ECAPA-TDNN)… this takes a few seconds…")
        def _run():
            name = (self.name_var.get() or "default").strip() or "default"
            result = self.vp.enroll_from_segments(audio, SAMPLE_RATE, name=name)
            self.root.after(0, lambda: self._train_done(result, secs))
        threading.Thread(target=_run, daemon=True).start()

    def _train_done(self, result, secs):
        self._set_busy(False)
        if result["success"]:
            self._log(
                f"✔ Trained {result['chunk_count']} segments from {secs:.1f}s — "
                f"self-similarity {result['similarity_self']:.0%}. "
                "The live dashboard now scores Speaker Similarity against this "
                "voice (no restart needed)."
            )
        else:
            self._log(f"✘ {result['message']}")

    def test(self, seconds=5):
        if self.recording:
            self._log("Stop recording first.")
            return
        self._set_busy(True)
        self._log(f"Recording {seconds}s to test against the voiceprint…")
        def _run():
            try:
                sd = self.sd
                audio = np.zeros(0, dtype=np.float32)
                def cb(indata, frames, t, status):
                    nonlocal audio
                    audio = np.concatenate([audio, indata[:, 0].astype(np.float32)])
                with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32", callback=cb):
                    time.sleep(seconds)
                res = self.vp.verify(audio)
                if res is None:
                    msg = "No voiceprint enrolled yet — train one first."
                else:
                    msg = (f"Similarity: {res['similarity']:.0%} → "
                           f"{'MATCH' if res['match'] else 'NO MATCH'} ({res['confidence']} confidence)")
                self.root.after(0, lambda m=msg: (self._set_busy(False), self._log(m)))
            except Exception as e:
                self.root.after(0, lambda: (self._set_busy(False), self._log(f"Test failed: {e}")))
        threading.Thread(target=_run, daemon=True).start()

    def reset(self):
        self.vp.reset()
        with self._lock:
            self.audio_buffer = np.zeros(0, dtype=np.float32)
            self.rec_seconds = 0.0
        self.rec_label.config(text="0.0s recorded")
        self._refresh_status()
        self._log("Voiceprint deleted and buffer cleared.")

    # ── Helpers ────────────────────────────────────────────────────────────
    def _set_busy(self, busy):
        state = "disabled" if busy else "normal"
        for b in (self.rec_60_btn, self.rec_part_btn, self.train_btn, self.test_btn, self.reset_btn):
            b.config(state=state)

    def _refresh_status(self):
        st = self.vp.status
        if st["enrolled"]:
            self._log(
                f"Voiceprint enrolled: '{st['name']}' · {st['chunk_count']} segments · "
                f"{st['duration_s']}s of speech · created {st['created_at']}"
            )
        else:
            self._log("No voiceprint enrolled yet. Record your voice and click 'Train voiceprint'.")

    def _log(self, msg):
        self.status.config(text=msg)

    def _on_close(self):
        try:
            if self.stream:
                self.stream.stop()
                self.stream.close()
        except Exception:
            pass
        self.root.destroy()


def main():
    root = tk.Tk()
    VoiceprintTrainerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()