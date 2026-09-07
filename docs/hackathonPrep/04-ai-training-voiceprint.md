# 04 - AI Training and Voiceprint Enrollment
This project does NOT train neural nets from scratch and we never trained AASIST or ECAPA ourselves.
Here "training" means enrolling a personal voiceprint by averaging few-shot ECAPA embeddings on top of the frozen pretrained SpeechBrain ECAPA-TDNN model.

## Medium (Q1-Q20)

### Q1: What is a voiceprint in VoxVerity?
A voiceprint in VoxVerity is a single 192-dimensional speaker embedding centroid stored locally on the AI service machine. It is produced by `VoiceprintManager` in `services/ai-service/app/models/voiceprint.py` and represents your voice as derived by the frozen pretrained ECAPA-TDNN model. The file header states it is a derived biometric artifact, not raw audio and not identity proof. It lives as `voiceprint.npz` plus `voiceprint.json` metadata under `model_artifacts/voiceprints/`. Live audio is embedded the same way and compared to this centroid with cosine similarity. Think enrollment, not neural net training.
### Q2: Walk through the enrollment flow step by step.
Enrollment starts in `services/ai-service/scripts/train_voiceprint.py` in the `VoiceprintTrainerApp` tkinter app. You enter a name, click Record 60s or Record 15s part, speak, then click Stop and Train voiceprint. The `train()` method copies the in-memory buffer and calls `VoiceprintManager.enroll_from_segments()` in a background thread. That method segments audio, drops silent chunks, calls `ECAPAWrapper.compute_embedding()` per segment, L2-normalizes and averages them, then saves with `VoiceprintManager.save()`. The status label reports chunk count and self-similarity, and the AI service picks the file up live with no restart.
### Q3: How many seconds of audio do you need for a good voiceprint?
The trainer UI in `services/ai-service/scripts/train_voiceprint.py` suggests about 60 seconds of clear speech, either as one continuous take or several 15 second parts. The constant `MAX_SECONDS = 90` caps the in-memory buffer at 90 seconds at 16000 Hz. Enrollment itself rejects anything shorter than one 3 second window in `enroll_from_segments()` with the message "Recording too short". Tests in `services/ai-service/tests/test_voiceprint.py` enroll with 9 to 12 seconds and still get 2 to 4 chunks, but that is a minimum for tests. For demo reliability, aim for 45 to 60 seconds so you keep 12 to 18 voiced segments after silence removal.
### Q4: How does segmenting and chunking work during enrollment?
Enrollment splits the recording into fixed non-overlapping windows of `SEGMENT_SECONDS = 3.0` seconds defined in `services/ai-service/app/models/voiceprint.py`. The loop in `enroll_from_segments()` steps by `hop = int(segment_seconds * 16000)` samples from start to end. This 3 second size was chosen to match the live analysis cadence noted in both the trainer docstring and `docs/ai-service/voiceprint-training.md`. Short trailing audio that cannot fill a full window is ignored. Each full window is then checked for energy and length before embedding, so only speech-like chunks contribute.
### Q5: How is the final embedding computed from many segments?
Each kept 3 second segment is passed to `ECAPAWrapper.compute_embedding()` from `services/ai-service/app/models/ecapa_wrapper.py`, which returns a 192-dimensional vector from the frozen SpeechBrain model. Back in `enroll_from_segments()`, every per-segment vector is L2-normalized by dividing by its norm before averaging. The normalized vectors are stacked and averaged with `np.mean`, then the mean centroid is L2-normalized a second time. Metadata records the method as `mean_l2_normalized_segments` in the saved JSON. This two-stage normalize-average-normalize procedure is standard few-shot enrollment and involves no gradient updates.
### Q6: Where do the voiceprint files live and what is inside them?
Files live under `services/ai-service/model_artifacts/voiceprints/` as defined by `VOICEPRINT_DIR`, `VOICEPRINT_NPZ`, and `VOICEPRINT_META` in `services/ai-service/app/models/voiceprint.py`. The `.npz` file holds one float32 array named `embedding` with shape (192,) saved by `VoiceprintManager.save()` with `np.savez`. The `.json` file holds name, creation time, chunk count, duration, embedding dimension, model name, method, and segment length. The `status` property exposes the same fields plus the absolute path for the settings UI. Both files are local only and the trainer UI reminds you they are never uploaded or stored on-chain.
### Q7: What do the similarity thresholds mean, especially the 70 percent match?
Thresholds live in `SIMILARITY_THRESHOLDS` in `services/ai-service/app/models/ecapa_wrapper.py` and are applied identically in `VoiceprintManager.verify()` and `ECAPAWrapper.verify_speaker()`. A cosine similarity at or above 0.85 is high confidence match, and at or above 0.70 is medium confidence match, so 70 percent is the operating point for MATCH. Scores at or above 0.50 but below 0.70 return low confidence with `match = False`. Scores below 0.50 return none confidence with `match = False`. The training doc in `docs/ai-service/voiceprint-training.md` summarizes this as high 0.85, medium 0.70, low 0.50, none below 0.50.
### Q8: What does "uncertain" or low confidence actually mean for a judge?
Low confidence corresponds to the 0.50 to 0.70 band in `VoiceprintManager.verify()` in `services/ai-service/app/models/voiceprint.py`. It means the live chunk is neither close enough to call a match nor far enough to call a clear mismatch. The code sets `match = False` in this band, so the dashboard should show a warning state rather than a green verified badge. Channel mismatch, background noise, short or quiet speech, and a different speaker can all land here. The file header warns that speaker similarity is a signal, not identity proof, so uncertain must never be presented as a fraud verdict.
### Q9: How does re-enrollment work and what happens to the old voiceprint?
Re-enrollment simply overwrites the same two paths, `VOICEPRINT_NPZ` and `VOICEPRINT_META`, through `VoiceprintManager.save()` in `services/ai-service/app/models/voiceprint.py`. Clicking Train voiceprint again with a new recording replaces the centroid and metadata including name, chunk count, and creation time. The trainer Reset button calls `VoiceprintManager.reset()`, which deletes both files and clears memory plus the audio buffer. Because the service uses `_maybe_reload()` to check file modification time, the new voiceprint takes effect immediately. There is no version history, so back up the folder first if you want to keep the old voice.
### Q10: Does VoxVerity support multiple users and voiceprints?
The local voiceprint path supports one default centroid at a time through the `VoiceprintManager` singleton from `get_voiceprint()` in `services/ai-service/app/models/voiceprint.py`. The name field lets you label whose voice it is, but training a second name overwrites the first file. Separately, `ECAPAWrapper` in `services/ai-service/app/models/ecapa_wrapper.py` keeps an in-memory dict `_enrollments` keyed by `user_id` with `enroll_speaker()` and `verify_speaker()`. The API routes `POST /speaker/enroll` and `POST /speaker/verify` in `services/ai-service/app/api/routes.py` use that multi-user memory store. For the hackathon demo, present it honestly as single persistent voiceprint plus multi-user API for tests.
### Q11: How do you select the microphone and check input level?
The trainer imports `sounddevice` lazily in `_load_sounddevice()` in `services/ai-service/scripts/train_voiceprint.py` and fails with install instructions if it is missing. Recording opens `sd.InputStream` at 16000 Hz mono float32 with `_audio_callback()` appending samples and updating RMS level plus recorded seconds. The UI draws a live level bar on a tkinter canvas in `_tick_recording()` every 100 ms. There is no explicit device picker, so it uses the OS default input and the troubleshooting doc tells you to check the OS default mic. If opening the stream fails, the app logs "Mic error" instead of crashing.
### Q12: What breaks enrollment: noise, silence, and short audio?
Three guards in `enroll_from_segments()` in `services/ai-service/app/models/voiceprint.py` reject bad input before any file is written. Recordings shorter than one 3 second window return "Recording too short", which is also covered by `test_too_short_recording` in `services/ai-service/tests/test_voiceprint.py`. Segments with RMS below `ENERGY_FLOOR = 0.004` or shorter than `MIN_SEGMENT_SAMPLES` are skipped as silence. If every segment is silent or the embedder returns None, enrollment returns "No voiced segments found" and tells you to speak clearly away from noise. Loud stationary noise can still pass the energy gate but produces a smeared centroid with low self-similarity.
### Q13: How does the live dashboard use speaker similarity during a call?
Live 3 second chunks are embedded with `ECAPAWrapper.compute_embedding()` and compared to the enrolled centroid in `VoiceprintManager.verify()` in `services/ai-service/app/models/voiceprint.py`. The result dict has `similarity`, `match`, `confidence`, `enrolled_name`, and a display message like "Similarity 82% (medium confidence)". The status endpoint `GET /voiceprint/status` in `services/ai-service/app/api/routes.py` drives the settings model tab with enrolled name, chunk count, and duration. The training guide in `docs/ai-service/voiceprint-training.md` notes the risk engine weights this signal at 20 percent and applies a minus 15 mitigation bonus on match. So a verified voice lowers risk but never proves a call is safe on its own.
### Q14: What does the "Test my voice" button do?
The `test()` method in `services/ai-service/scripts/train_voiceprint.py` records a short 5 second sample with a blocking `sd.InputStream` in a worker thread. It then calls `VoiceprintManager.verify()` on that fresh audio without touching the stored enrollment. The status line shows similarity percent plus MATCH or NO MATCH with confidence, using the same 0.70 and 0.85 cutoffs as live scoring. If no voiceprint exists, verify returns None and the UI says to train one first. This gives judges an instant before and after demo: test an unenrolled speaker for low score, then the enrolled speaker for high score.
### Q15: What does Reset do and when should you use it?
Reset calls `VoiceprintManager.reset()` in `services/ai-service/app/models/voiceprint.py`, which clears the in-memory embedding and deletes both `voiceprint.npz` and `voiceprint.json` from disk. The trainer `reset()` in `services/ai-service/scripts/train_voiceprint.py` also clears the audio buffer, zeroes recorded seconds, and refreshes the status label. After reset, `is_enrolled()` returns False and `verify()` returns None, so live similarity is unavailable. Use it between demo speakers, when a voiceprint was trained in a noisy room, or before re-enrolling under a new name. There is no undo, so copy the voiceprints folder first if the file matters.
### Q16: What sample rate is expected and what happens with other rates?
The whole pipeline is fixed at 16000 Hz, matching `SAMPLE_RATE = 16000` in the trainer and the `/config` endpoint in `services/ai-service/app/api/routes.py`. Both `enroll_from_segments()` and `verify()` in `services/ai-service/app/models/voiceprint.py` call the `_resample()` helper when input is not 16000 Hz. That helper does linear-interpolation resampling by index mapping rather than a high quality filter. It keeps demos working if a mic or file is 44100 or 48000 Hz, but quality is best when the source is native 16000 Hz. For judging, state that resampling is a convenience fallback and matched 16 kHz train and test gives the most stable scores.
### Q17: How are silent chunks detected and dropped?
Each candidate 3 second window computes RMS with `float(np.sqrt(np.mean(seg ** 2)))` inside `enroll_from_segments()` in `services/ai-service/app/models/voiceprint.py`. Windows below `ENERGY_FLOOR = 0.004` are skipped, as are windows shorter than `MIN_SEGMENT_SAMPLES` which equals 2 seconds of audio. This prevents pauses and mic hiss from pulling the centroid toward silence. The buffer cap `MAX_SECONDS = 90` in the trainer also bounds how much quiet audio can accumulate. If all windows are dropped, enrollment fails safely with "No voiced segments found" instead of saving a garbage voiceprint.
### Q18: What is self-similarity and why does the trainer show it?
After saving the centroid, `enroll_from_segments()` in `services/ai-service/app/models/voiceprint.py` computes dot products of each per-segment embedding against the final centroid. The mean of those scores is returned as `similarity_self` and shown in the trainer `_train_done()` message as a percent. High self-similarity means the enrollment segments agree with each other, which suggests consistent mic placement and quiet conditions. Low self-similarity warns of mixed speakers, variable distance, or noise even though training still succeeded. Judges can read it as an enrollment quality meter, not as a claim about future accuracy.
### Q19: What is the difference between the local trainer and the speaker API endpoints?
The tkinter trainer writes the persistent single voiceprint used by the realtime pipeline through `VoiceprintManager` in `services/ai-service/app/models/voiceprint.py`. No web speaker routes exist under `apps/web/app/api/`, which only has alerts, auth, blockchain, calls, evidence, incidents, presence, profile, risk, and ws-token folders. Instead the AI service exposes `POST /speaker/enroll` and `POST /speaker/verify` in `services/ai-service/app/api/routes.py` using the in-memory `ECAPAWrapper` store. Those endpoints take WAV uploads plus `user_id` and are useful for tests and multi-user experiments. For the live dashboard similarity signal, the local trainer file is the one that matters.
### Q20: How is the voiceprint covered by automated tests without the heavy model?
Tests in `services/ai-service/tests/test_voiceprint.py` replace the real model with a `FakeECAPA` class that maps audio to a normalized RMS-envelope vector. The helper `_install_fake_ecapa()` monkey-patches `vp_module.get_ecapa` so no SpeechBrain download or GPU is needed. Four tests cover enroll plus same-speaker high score and different-speaker lower score, save and load roundtrip with `VoiceprintManager.load()`, verify with no enrollment returning None, and rejection of a 1 second recording. Synthetic speech-like tones from `_speech_like()` keep results deterministic. This proves the segmenting, averaging, persistence, and threshold plumbing work even though it says nothing about real ECAPA accuracy.

## Hard (Q21-Q30)

### Q21: Why is cosine similarity the right metric in ECAPA embedding space?
ECAPA-TDNN is trained so that utterances from the same speaker point in similar directions in 192-dimensional space, while channel loudness and gain mostly change vector length. Cosine similarity divides the dot product by both norms, as implemented in `ECAPAWrapper.compute_similarity()` in `services/ai-service/app/models/ecapa_wrapper.py`, so it measures angle rather than volume. That is why `enroll_from_segments()` L2-normalizes every segment before averaging and normalizes the centroid again. Euclidean distance would confound a quiet enrolled mic with a different speaker, while cosine stays stable. The score is a directional agreement signal, not a calibrated probability of identity.

```
 mic gain changes length, not direction
              /
   enroll o  /  same speaker, louder
            /  .
           / . angle = small -> cosine near 1.0
          /.
   origin +------------------ different speaker
         Enrollment normalizes every vector to the unit sphere,
         then cosine = dot product on that sphere.
         Code: ecapa_wrapper.py::compute_similarity
```
### Q22: Why use a centroid of many segments instead of one reference sample?
A single 3 second sample captures one phonetic mix, one pitch moment, and one noise burst, so it is a noisy estimate of the speaker. Averaging 10 to 20 L2-normalized segment embeddings, as `enroll_from_segments()` does in `services/ai-service/app/models/voiceprint.py`, cancels phoneme and transient variation while reinforcing the persistent speaker direction. The mean is then renormalized so it stays on the unit sphere for cosine comparison. The trainer message reports chunk count precisely so judges see how much evidence backs the centroid. A single-sample reference is fine for a quick API check with `enroll_speaker()`, but the persistent voiceprint uses the centroid for stability.

```
 single ref:  [one noisy arrow] --------------> fragile
 centroid:    seg1 \ seg2 \ seg3 \ seg4 \ seg5 \ ...
                      \    \    \    \    \   \
                       v    v    v    v    v   v
                        mean + renormalize = stable arrow
                       centroid smooths phoneme and noise jitter
                       Code: voiceprint.py::enroll_from_segments
```
### Q23: How should scores be normalized and calibrated before showing them to users?
Raw cosine sits in roughly -1 to 1 but in practice clusters in a narrow band like 0.3 to 0.95, so showing it as a raw percent can mislead. VoxVerity maps it through fixed operating points in `SIMILARITY_THRESHOLDS` in `services/ai-service/app/models/ecapa_wrapper.py`: 0.85 high, 0.70 match, 0.50 uncertain. The `verify()` method in `services/ai-service/app/models/voiceprint.py` rounds to four decimals and adds a confidence label plus a text message. A stronger setup would add score normalization like z-norm or adaptive cohort normalization and then fit a calibration curve on held-out pairs. Until that exists, the UI must say model score or spoof signal and keep a human in high-impact decisions.

```
 raw cosine 0.30 ---- 0.50 ---- 0.70 ---- 0.85 ---- 1.00
             | none    | low     | medium  | high   |
             | NO MATCH| NO MATCH| MATCH   | MATCH  |
             Fixed cuts today; calibrated P(same speaker)
             needs cohort stats + held-out pair fitting.
             Code: ecapa_wrapper.py::SIMILARITY_THRESHOLDS
```
### Q24: What happens when enrollment and test channels mismatch?
ECAPA embeddings encode both speaker traits and channel traits like mic frequency response, room reverb, codec loss, and distance. If you enroll on a headset mic but test on a laptop speakerphone across the room, both vectors shift in the same channel direction and cosine falls even for the same person. The troubleshooting section of `docs/ai-service/voiceprint-training.md` warns to retrain from the same mic and setup the caller uses and to wear headphones. The `_resample()` fallback in `services/ai-service/app/models/voiceprint.py` fixes sample rate only, not room or mic coloration. For demos, enroll and test on identical hardware in the same room to avoid a live mismatch.

```
 enroll path: mouth -> headset mic -> 16kHz -> ECAPA -> vector A
 test path:   mouth -> laptop mic + reverb + echo -> ECAPA -> vector B
              A and B differ by speaker delta + channel delta
              cosine(A,B) drops even when speaker is identical
              Fix: same mic, same room, headphones; retrain on site.
              Doc: docs/ai-service/voiceprint-training.md
```
### Q25: Why does a replayed recording of YOU still match, and what catches it?
A voiceprint answers who does this sound like, not is this live, so playing back your enrolled voice produces a high cosine in `VoiceprintManager.verify()` in `services/ai-service/app/models/voiceprint.py`. That is correct behavior for speaker similarity and exactly why VoxVerity layers a separate anti-spoofing model. The AASIST-L branch in `services/ai-service/app/api/routes.py` via `analyze_file()` and the risk engine scores liveness artifacts that replay and synthesis leave behind. The training guide notes speaker similarity is only 20 percent of risk with a minus 15 bonus on match, so a replay can match the voice yet still raise overall risk. Never present a voice match alone as proof against replay.

```
 attacker replays YOUR recording
   +--> ECAPA voiceprint verify -> high similarity -> MATCH (expected)
   +--> AASIST spoof detector -> replay artifacts -> high spoof score
   +--> risk engine fuses both -> alert stays up
   Voice answers WHO, AASIST answers LIVE OR REPLAYED.
   Code: voiceprint.py::verify + routes.py::analyze_file
```
### Q26: What are the privacy properties of storing embeddings instead of audio?
The `.npz` file stores one 192-float derived vector, about 768 bytes, instead of minutes of waveform, and raw audio is never persisted by the pipeline per the header of `services/ai-service/app/models/voiceprint.py`. That reduces exposure: no words, no background sounds, and nothing playable in a breach. But embeddings are still biometric data because they enable speaker comparison, so the project keeps them local only, never on-chain, never sent to the browser, and never logged. `VoiceprintManager.reset()` deletes both files for data removal requests. Future hardening could add OS keystore encryption, per-user access controls, and retention policies beyond simple file deletion.

```
 raw mic audio (playable, lexical) --NOT STORED-->
                                          |
                                     ECAPA embed
                                          |
                              voiceprint.npz (192 floats)
                              local disk only, no chain,
                              no browser, no logs, deletable
                              Code: voiceprint.py header + reset()
```
### Q27: How do voiceprint portability and backups work today?
Portability today is just two files: copy `voiceprint.npz` and `voiceprint.json` from `model_artifacts/voiceprints/` to the same path on another machine running the same ECAPA version. The `load()` method in `services/ai-service/app/models/voiceprint.py` reads them at startup and `_maybe_reload()` picks up replacements while running. Metadata includes model name, dimension, method, and creation time so you can check compatibility before trusting a copied file. There is no export API, no encryption, and no multi-profile directory, since the manager targets one default voiceprint. Treat copied files like credentials: transfer over a secure channel and note that embeddings from a different model version are not comparable.

```
 machine A: model_artifacts/voiceprints/{npz,json}
              ---- secure copy ---->
 machine B: model_artifacts/voiceprints/{npz,json}
              ---- service _maybe_reload() ----> live, no restart
              Check meta.model + embedding_dim match first.
              Code: voiceprint.py::load + _maybe_reload
```
### Q28: How would you scale this enrollment design to 1000 users?
The current persistent path holds one centroid in memory via the `get_voiceprint()` singleton, so 1000 users need an indexed store rather than one `.npz` file. The natural upgrade keeps `ECAPAWrapper.compute_embedding()` unchanged and stores one normalized 192-float row per user in a vector table with user id, model version, and creation time. Verification becomes a nearest-neighbor cosine search with a per-user threshold plus cohort score normalization. The ephemeral `_enrollments` dict and `POST /speaker/enroll` pattern in `services/ai-service/app/api/routes.py` already show the keyed API shape. Add access controls, audit logging, batch enrollment jobs, and cache hot embeddings in memory for live chunks.

```
 today:  one npz -> one centroid -> compare one live vector
 scaled: live vector -> vector DB (1000 x 192 floats)
                    -> top-k cosine search -> threshold + norm
                    -> match user_id + confidence
         Keep embedder frozen; index the centroids.
         Code today: routes.py::speaker_enroll + ecapa_wrapper.py
```
### Q29: How do you evaluate whether the enrollment flow actually works?
Separate plumbing tests from speaker accuracy using the pattern in `services/ai-service/tests/test_voiceprint.py`. Plumbing uses the deterministic `FakeECAPA` to assert chunk counts, save and load roundtrips, None on missing enrollment, and rejection of short audio. Accuracy evaluation needs real ECAPA runs on held-out pairs: same-speaker trials and different-speaker trials recorded on the demo mic, scored with `compute_similarity()`. Sweep the threshold to plot false accept versus false reject and confirm 0.70 is sensible for your room before locking it. Also report self-similarity from `enroll_from_segments()`, channel-mismatch drops, and replay-false-match rates alongside AASIST catches.

```
 enrollment audio -> segments -> FakeECAPA tests (plumbing, fast)
                  -> real ECAPA pairs (accuracy, slow)
                     same-speaker pairs vs different-speaker pairs
                     sweep threshold -> FAR vs FRR curve -> pick 0.70
                     plus replay trials -> AASIST must still fire
                     Code: tests/test_voiceprint.py + voiceprint.py
```
### Q30: How do you pick and justify the 0.70 match operating point?
The 0.70 cut in `SIMILARITY_THRESHOLDS` in `services/ai-service/app/models/ecapa_wrapper.py` is a starting operating point, not a universal truth, because ECAPA score distributions shift with mics, language, and noise. Justification requires collecting matched-condition scores for true pairs and impostor pairs, then measuring false accept rate and false reject rate at candidate cuts like 0.60, 0.70, and 0.85. High-stakes use favors a higher cut with human review in the middle band, while convenience demos tolerate 0.70 with clear uncertain messaging. The `verify()` confidence tiers in `services/ai-service/app/models/voiceprint.py` already support this by splitting high, medium, low, and none. Document the chosen point with its measured error rates rather than calling it 70 percent sure.

```
 impostor scores distributon:  #######|.......
 true-speaker distribution:           .......|########
 candidate cuts:              0.60   0.70   0.85
                              |      |      |
 raise cut -> fewer false accepts, more false rejects
 pick cut from measured FAR/FRR, label bands honestly.
 Code: ecapa_wrapper.py::SIMILARITY_THRESHOLDS
```

## Rapid-fire one-liners

| # | Question | Answer |
|---|---|---|
| 1 | Do you train neural nets here? | No, we enroll a voiceprint on a frozen pretrained ECAPA model. |
| 2 | Which model embeds the voice? | SpeechBrain ECAPA-TDNN, 192-dim vectors. |
| 3 | How long should enrollment be? | About 60 seconds, capped at 90 seconds in memory. |
| 4 | What is the segment size? | 3 second windows matching live analysis cadence. |
| 5 | How are segments combined? | L2-normalize each, average, renormalize into one centroid. |
| 6 | Where is the voiceprint saved? | Local `model_artifacts/voiceprints/` as npz plus json. |
| 7 | What score means MATCH? | Cosine at or above 0.70, high confidence at 0.85. |
| 8 | What does low confidence mean? | Score 0.50 to 0.70, treated as NO MATCH with warning. |
| 9 | Does a voice match stop replay? | No, replay of you matches, AASIST layer catches liveness. |
| 10 | Is raw audio stored? | No, only the derived embedding file stays on local disk. |
