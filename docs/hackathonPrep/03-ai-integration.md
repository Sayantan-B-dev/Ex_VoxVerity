# VoxVerity AI Integration - Hackathon Prep Q&A

This file covers how AASIST-L, ECAPA-TDNN, DSP signals, and the risk engine fit together in VoxVerity. Every answer is grounded in the real implementation files listed in each response.

## Medium (Q1-Q20)

### Q1: What does AASIST-L detect in VoxVerity?

AASIST-L is an anti-spoofing model that produces a spoof signal distinguishing bona fide natural speech from synthetic or converted speech artifacts. In `services/ai-service/app/models/aasist_wrapper.py` the wrapper runs the official ONNX export from SpeechAntiSpoofingBenchmarks and reads logits for two classes. Class 0 is treated as the bona fide class because natural speech was empirically observed to fire class 0 while silence sits near coin-flip. The raw softmax output is exposed as `score` from 0 to 1 where higher means more natural sounding. This output is one input to the risk engine, never a standalone fraud verdict, and the UI must label it as a model score or spoof signal.

### Q2: What does AASIST-L NOT detect, and why does that matter?

AASIST-L is not a universal detector for every future voice cloning method, and the module docstring in `services/ai-service/app/models/aasist_wrapper.py` states this limit explicitly. It does not reliably catch out-of-domain audio such as pure tones, background noise, or re-recorded playback, and such inputs can score as bona fide by mistake. It does not prove speaker identity, because identity is handled separately by ECAPA-TDNN speaker verification in `services/ai-service/app/models/ecapa_wrapper.py`. It cannot prove speech is human from loudness or dynamics alone, since acoustic features are only correlates of natural speech. Operators must therefore combine the spoof signal with speaker similarity and acoustic analysis, and keep a human in the loop for high-impact decisions.

### Q3: What does the AASIST-L spoof score actually mean?

The `score` field returned by `predict()` in `services/ai-service/app/models/aasist_wrapper.py` is the softmax probability of class 0, the bona fide class, on a 0 to 1 scale. A value near 1.0 means a strong bona fide signal and a value near 0.0 means a strong spoof signal, while 0.5 means the model is uncertain. The wrapper also returns `confidence` as the max softmax probability plus a `normalized_score` from 0 to 100 produced by `normalize_score()`. Without `calibration.yaml` the normalization is a direct raw times 100 mapping with severity forced to uncertain. The score is a model signal for the risk engine and must never be shown as an absolute claim like 87 percent fake.

### Q4: What are ECAPA-TDNN embeddings in this project?

ECAPA-TDNN produces a 192-dimensional speaker embedding vector from an audio clip, as defined by `EMBEDDING_DIM = 192` in `services/ai-service/app/models/ecapa_wrapper.py`. The model card is speechbrain spkrec-ecapa-voxceleb under Apache-2.0, loaded through SpeechBrain `EncoderClassifier` pinned to CPU. The `compute_embedding()` method converts float32 audio to a torch batch tensor and calls `encode_batch` under `torch.no_grad()`. The resulting vector summarizes voice characteristics for comparison, not a transcript or biometric record for chain storage. Speaker similarity derived from these vectors is a signal for the risk engine, not proof of identity.

### Q5: How are ECAPA cosine similarity thresholds interpreted?

Similarity is cosine similarity between two 192-dim embeddings via `compute_similarity()` in `services/ai-service/app/models/ecapa_wrapper.py`. The `SIMILARITY_THRESHOLDS` map defines high_match at 0.85, match at 0.70, uncertain at 0.50, and mismatch at 0.30. In `verify_speaker()`, similarity at or above 0.85 yields high confidence match, at or above 0.70 yields medium confidence match, at or above 0.50 yields low confidence non-match, and below that yields no confidence. The direct-comparison helper `compare_embeddings()` uses 0.70 as its likely same speaker cutoff. Channel, noise, duration, and language all shift these similarities, so thresholds are operating points rather than identity guarantees.

### Q6: What is the difference between enroll and verify?

Enrollment stores a reference embedding for a user id through `enroll_speaker()` in `services/ai-service/app/models/ecapa_wrapper.py`. It calls `compute_embedding()` once on reference audio and saves the vector plus name in the in-memory `_enrollments` dict. Verification through `verify_speaker()` computes a fresh embedding from new audio and compares it against the stored reference with cosine similarity. Enrollment answers who the reference voice is, while verification answers how similar the new clip is to that reference. A missing enrollment returns match false with confidence none, so callers must enroll before verifying.

### Q7: What are the risk bands and their numeric boundaries?

The canonical bands live in `DEFAULT_POLICY` in `services/ai-service/app/risk/engine.py` and are LOW 0 to 25, MEDIUM 26 to 50, HIGH 51 to 75, and CRITICAL 76 to 100. The same file stores them twice, once as `thresholds` with low_max 25, medium_max 50, high_max 75, and critical_min 76, and once as `severity_bands`. The `evaluate()` method clamps the blended score to 0 to 100 with round and then maps it to a band using strict greater-than checks. Each band drives a fixed recommendation from continue monitoring up to escalate to the security team. Tests are expected to probe boundary values 0, 25, 26, 50, 51, 75, 76, and 100.

### Q8: What happens exactly at the 25, 50, and 75 boundary values?

The mapping in `evaluate()` in `services/ai-service/app/risk/engine.py` starts at LOW and only promotes when the score exceeds a threshold. A score of 25 stays LOW because it is not greater than low_max 25, while 26 becomes MEDIUM. A score of 50 stays MEDIUM because it is not greater than medium_max 50, while 51 becomes HIGH. A score of 75 stays HIGH because it is not greater than high_max 75, while 76 becomes CRITICAL. This strict greater-than logic is why boundary tests at 25 versus 26 and 75 versus 76 matter. An org policy override changes these cutoffs only if the engine is constructed with that custom policy.

### Q9: What are the default risk weights and what do they prioritize?

`DEFAULT_POLICY` weights in `services/ai-service/app/risk/engine.py` assign spoof_detection 0.40, human_pattern 0.20, speaker_verification 0.20, acoustic_anomaly 0.10, and context 0.10. The weights sum to 1.0 and encode the judgment that the AASIST-L spoof signal carries twice the influence of speaker or acoustic behavior signals. Each available signal blends the running score toward its own risk view through the formula base times one minus weight plus signal risk times weight. Missing signals are skipped, so the running base of 50 simply carries forward for that step. The mitigation bonuses of minus 15 for verified speaker and minus 5 for clean audio apply after blending.

### Q10: How can an organization change weights and thresholds?

The web layer exposes org policy through `apps/web/app/api/risk-policy/route.ts` with GET returning the active row from the `risk_policies` table. PATCH accepts thresholds, weights, verification_threshold, auto_escalation, sensitivity, model_version, band_actions, and name, then updates the active policy for that org. Every PATCH is audited with a policy dot update event via the shared `audit()` helper. The AI service engine itself loads `policy.yaml` when present in `services/ai-service/app/risk/engine.py`, otherwise it falls back to `DEFAULT_POLICY`. Deployment must therefore keep the database policy and the service policy file consistent so scoring matches what operators configured.

### Q11: Why is the risk score a policy output and not a probability?

The 0 to 100 risk number in `services/ai-service/app/risk/engine.py` is a weighted blend of heterogeneous signals plus hand-tuned mitigation bonuses, not a calibrated statistical likelihood. No calibration study in the repo maps a score of 87 to an 87 percent chance of fraud, so the truthfulness rules forbid displaying 87 percent fake. The module header for `services/ai-service/app/models/aasist_wrapper.py` requires the UI to say model score or spoof signal instead of probability. Treating the number as policy lets orgs tune weights and bands to their own cost of false alarms versus misses. A human operator stays in high-impact workflows because the number ranks priority rather than proving fraud.

### Q12: What is the difference between AASIST-only mode and full mode?

The client model picker in `apps/web/lib/model-settings.ts` defines three ids, with aasist_voiceprint as default, aasist as spoof-only, and heuristic as DSP-only. Full mode combines the AASIST-L spoof signal with speaker verification against the trained voiceprint for the richest signal set. AASIST-only mode still runs the same ONNX model via `services/ai-service/app/models/aasist_wrapper.py` but skips speaker similarity scoring. The preference persists in localStorage under voxverity dot model and travels with `start_session` so the AI service scores every chunk identically. Full mode costs more compute but gives the risk engine both spoof and speaker factors to blend.

### Q13: When is the fast heuristic path used instead of the real model?

The heuristic path in `_heuristic_fallback()` in `services/ai-service/app/models/aasist_wrapper.py` runs when the ONNX file or onnxruntime is missing, when inference throws, or when the client passes use_model false. It computes DSP features such as RMS, zero crossing rate, spectral centroid, crest factor, silence ratio, clipping ratio, and energy variation, then adjusts a 0.5 baseline up or down. Its output carries version v1.0-heuristic, loaded false, fallback true, and a low 0.35 confidence with the feature vector attached. The risk engine still counts it but tags the factor source as heuristic in `services/ai-service/app/risk/engine.py` so the UI can label it honestly.

### Q14: Why does the project pin CPU-only torch instead of CUDA torch?

`services/ai-service/requirements.txt` installs torch 2.9.0 and torchaudio 2.9.0 from the CPU index at download dot pytorch dot org slash whl slash cpu. The comment in that file explains that default PyPI torch bundles CUDA at about 2.5 GB and out-of-memory crashes a 512 MB free instance at import. CPU torch keeps the container small enough to boot and matches actual runtime usage, since both onnxruntime and SpeechBrain are configured for CPU execution. The tradeoff is slower inference versus guaranteed deployability on free-tier hosts. Any move to GPU builds needs an ADR because the stack choice is deliberate.

### Q15: What role does onnxruntime play in AASIST-L inference?

The `load()` method in `services/ai-service/app/models/aasist_wrapper.py` creates an `ort.InferenceSession` against `model_artifacts/aasist-l.onnx` using only the CPUExecutionProvider. At inference time `predict()` pads or truncates audio to 64600 samples, reshapes to batch 1 by 64600, and runs the session with input key wav to get logits of shape 1 by 2. Using onnxruntime avoids shipping PyTorch AASIST training code and keeps startup light compared with SpeechBrain plus torch. If onnxruntime is not installed or the ONNX file is absent, load returns false and predict falls back to heuristics. The `status` property reports runtime onnxruntime so health checks show which path is live.

### Q16: What loads eagerly at AI service startup and what does not?

The `load_models()` startup handler in `services/ai-service/app/main.py` eagerly loads AASIST-L through `get_aasist()` and logs success or the stored load error. It also configures WebSocket security and checks voiceprint enrollment status without blocking boot on audio training. ECAPA-TDNN is deliberately not loaded at startup, with a log line stating it lazy-loads on first speaker request to fit free-tier RAM. This split means spoof scoring is warm immediately while speaker embedding pays a one-time download plus RAM cost later. The `/version` endpoint exposes both model states so judges can verify loaded versus not_loaded.

### Q17: Why is ECAPA lazy-loaded instead of loaded at startup?

`compute_embedding()` in `services/ai-service/app/models/ecapa_wrapper.py` calls `self.load()` on first use, fetching speechbrain spkrec-ecapa-voxceleb weights and allocating torch plus SpeechBrain RAM at that moment. The startup file `services/ai-service/app/main.py` documents that this weight download plus RAM would exceed small-instance boot budgets and cause out-of-memory kills. Lazy loading keeps the service bootable on 512 MB hosts and moves the cost to the first speaker request. The cost is one slow first verify or enroll call, after which the singleton stays resident. Operators should warm the endpoint before demos to hide that pause.

### Q18: What happens with silence or no-speech chunks?

Silence is near coin-flip for AASIST-L, per the verified class semantics in `services/ai-service/app/models/aasist_wrapper.py`, so it must not be treated as strong evidence either way. The risk engine in `services/ai-service/app/risk/engine.py` enforces a no-speech gate that clamps the final score with min of score and 8 when signals carry no_speech true. The explanation string then appends no speech detected in this chunk for transparency. DSP-side anomaly scoring can still count high silence ratio or low energy, but the gate keeps idle microphone chunks LOW. This prevents the meter from spiking while nobody is speaking.

### Q19: How do channel and noise affect accuracy in this system?

Channel, noise, duration, and language all shift both AASIST-L logits and ECAPA cosine similarity away from lab benchmark behavior. The calibration file `services/ai-service/app/models/calibration.yaml` lists channel and noise effects under known limitations alongside replay gaps and the four second minimum. In `services/ai-service/app/models/ecapa_wrapper.py` the header warns that speaker similarity is a signal rather than identity proof for exactly this reason. The risk engine compensates by blending acoustic anomaly and quality flags with model signals instead of trusting one score. Demos should use a quiet mic, stable network, and sufficient speech length to avoid overstating accuracy.

### Q20: What are the out-of-domain limits judges must hear?

Out-of-domain audio performs substantially weaker than benchmark audio, and `services/ai-service/app/models/calibration.yaml` records degraded performance on unseen data as a known limit. The wrapper docstring in `services/ai-service/app/models/aasist_wrapper.py` warns that tones, noise, and re-recorded playback can score as bona fide by error. Evaluation metadata in the same YAML still marks ASVspoof2019 LA equal error rate as TBD plus a custom VoxVerity set as TBD, so no calibrated probability claim exists yet. The correct language is spoof signal strength or model score with a human reviewer for consequential calls. Never present model output as an absolute fraud verdict in slides, UI, or speech.

## Hard (Q21-Q30)

### Q21: How does the risk engine fuse DSP, spoof, speaker, and human-pattern signals?

The engine starts from a neutral base risk of 50 and folds each present signal in sequence using exponential-style blending rather than a plain weighted sum. For each signal with weight w, it computes the signal-specific risk, then updates the running base to base times (1 minus w) plus signal risk times w. Spoof risk is 100 minus normalized spoof score with w 0.40, human-pattern risk is 100 minus behavior score with w 0.20, speaker risk is (1 minus similarity) times 100 with w 0.20, and acoustic anomaly blends with w 0.10. Context weight 0.10 is reserved in policy, then mitigation subtracts 15 for a verified speaker match and 5 for clean audio, then the result is clamped to 0-100 and gated by the no-speech rule. Because blending is sequential, signal order in `evaluate()` matters slightly, but determinism holds since the order is fixed in `services/ai-service/app/risk/engine.py`.

```
INPUTS                    PER-SIGNAL RISK              BLEND (fixed order)
+-----------+            +----------------+            base = 50
| spoof     |  0-100     | R = 100 - S    | w=0.40      |
|  S=82     +----------->| R = 18         +-----------+ |
+-----------+            +----------------+           | v
+-----------+            +----------------+     base = base*(1-w) + R*w
| human     |  0-100     | R = 100 - H    | w=0.20  --> repeat per signal
|  H=60     +----------->| R = 40         |           |
+-----------+            +----------------+           | v
+-----------+            +----------------+     mitigations: -15 match, -5 clean
| speaker   |  0-1       | R=(1-sim)*100  | w=0.20 --> clamp 0-100
|  sim=0.88 +----------->| R = 12         |           |
+-----------+            +----------------+           | v
+-----------+            +----------------+     no_speech ? min(score,8) : score
| acoustic  |  0-100     | anomaly score  | w=0.10 --> band + recommendation
|  A=10     +----------->| R = 10         |
+-----------+            +----------------+
```

### Q22: What is the difference between raw AASIST scores and calibrated display scores?

The raw score is the class-0 softmax output from 0 to 1 computed in `predict()` in `services/ai-service/app/models/aasist_wrapper.py`, and it reflects the ONNX logits for one 64600-sample window. The display score comes from `normalize_score()`, which consults `services/ai-service/app/models/calibration.yaml` to map 0-1 onto 0-100 and attach a severity label plus recommended action. With the current YAML, 0-25 maps to HIGH_SPOOF_SIGNAL with ALERT, 26-49 to LOW_SPOOF_SIGNAL with MONITOR, 50-60 to UNCERTAIN with REVIEW, 61-74 to LOW_BONAFIDE_SIGNAL with MONITOR, and 75-100 to HIGH_BONAFIDE_SIGNAL with NONE. Without the YAML the code falls back to raw times 100 with severity uncertain, which preserves pipeline function but loses tuned labels. Calibration here means mapping plus labels, not a statistical guarantee that 82 equals 82 percent authentic, so the UI must keep spoof-signal wording.

```
RAW (logits -> softmax)            CALIBRATION (calibration.yaml)
+---------------------+             +-------------------------------+
| wav (1 x 64600)     |             | input  0-1  -> output 0-100    |
|   ONNX session      +--+          | method: min_max               |
|   logits (1 x 2)    |  |          +-------------------------------+
+--------+------------+  |           +--------+--------+--------+-- -+
         | softmax     |             | 0-25   | 26-49  | 50-60 | ... |
         v             |             | HIGH   | LOW    | UNCER | ... |
+---------------------+             | SPOOF  | SPOOF  | TAIN  | ... |
| raw = P(class 0)    +------------>| ALERT  | MONITOR| REVIEW| ... |
| e.g. 0.82           |             +--------+--------+--------+-- -+
+---------------------+              raw 0.82 -> display 82 ->
                                     HIGH_BONAFIDE_SIGNAL / NONE
```

### Q23: What are the adversarial robustness limits of this pipeline?

AASIST-L detects synthesis artifacts seen during its training distribution, not arbitrary adversarial perturbations, replay chains, or future vocoders, and the repo never claims universal coverage. An attacker can shift domains with room re-recording, codec transcoding, added noise, or short clipped windows under the 64600-sample context, all of which move logits without changing perceived speech. The heuristic fallback in `services/ai-service/app/models/aasist_wrapper.py` is DSP only and easier to game with clean prosody plus normal energy dynamics. ECAPA similarity in `services/ai-service/app/models/ecapa_wrapper.py` can be attacked by voice conversion that preserves target speaker traits while AASIST-L sees clean bona fide-like acoustics. Defense therefore layers spoof signal, speaker match, acoustic anomaly, quality flags, and human review instead of trusting one threshold.

```
ATTACKER LEVERS              WHERE THEY LAND
+---------------+            +----------------------------------+
| new vocoder / |    +------>| AASIST-L logits shift (unknown)  |
| conversion    |    |       | spoof signal weakens             |
+---------------+    |       +----------------------------------+
+---------------+    |       +----------------------------------+
| replay + room +--->+------>| out-of-domain -> may read bona   |
| codecs + noise|    |       | fide; DSP flags may still fire   |
+---------------+    |       +----------------------------------+
+---------------+    |       +----------------------------------+
| short / clipped    +------>| padding + truncation artifacts,  |
| windows       |            | low confidence, quality flags    |
+---------------+            +----------------------------------+
                                      |
                                      v
                     single threshold = brittle
                     layered policy + human = intended use
```

### Q24: How do false accept and false reject tradeoffs work here?

A false accept means a spoofed clip scores as low risk and passes, while a false reject means natural speech scores as high risk and triggers review or escalation. Lowering risk bands or raising the ECAPA match cutoff reduces false accepts but increases operator load from false rejects, and the reverse loosens the system at the cost of missed spoofs. The ECAPA cutoffs in `services/ai-service/app/models/ecapa_wrapper.py` at 0.85 high, 0.70 match, 0.50 uncertain, and 0.30 mismatch are the speaker-side dial, while risk bands LOW/MEDIUM/HIGH/CRITICAL in `services/ai-service/app/risk/engine.py` are the final dial. Calibration severity cutoffs at 30/50/70 in `services/ai-service/app/models/calibration.yaml` add a third dial before fusion. Tuning means picking a point on this curve for the org's cost model, then measuring misses versus false alarms on real labeled audio.

```
THRESHOLD DIAL            EFFECT ON ERRORS
strict (high bar)         +-----------------------------+
| ECAPA 0.85 match  |---->| FAR down, FRR up            |
| risk CRITICAL low +---->| fewer misses, more reviews  |
+-------------------+     +-----------------------------+
         |
         v tradeoff curve (lower one error, raise other)
         |
loose (low bar)           +-----------------------------+
| ECAPA 0.50 match  |---->| FAR up, FRR down            |
| risk CRITICAL high+---->| fewer reviews, more misses  |
+-------------------+     +-----------------------------+
FAR = false accept rate, FRR = false reject rate
pick point by org cost model, then measure on labels
```

### Q25: How should thresholds be tuned across calibration.yaml, risk engine, and org policy?

There are three layers with distinct jobs: `calibration.yaml` maps raw spoof output to display score plus severity labels, `engine.py` blends signals into risk plus bands, and the org `risk_policies` row from `apps/web/app/api/risk-policy/route.ts` lets tenants override bands and weights. A sound tuning pass first fixes calibration cutoffs 30/50/70 against labeled bona fide versus spoof clips so display labels match reality. It then fixes ECAPA similarity cutoffs against same-speaker versus impostor pairs, and finally adjusts engine weights and LOW/MEDIUM/HIGH/CRITICAL cutoffs against full sessions. Changes to org policy must be audited and versioned because the engine stamps `policy_version` into every result. Without labeled data, tuning is guesswork, so collection of deployment audio with ground truth comes before moving numbers.

```
LAYER STACK (tune bottom-up)
+--------------------------------------------------+
| 3. org policy (risk_policies table)              |
|    weights, bands, verification_threshold,       |
|    auto_escalation, sensitivity, band_actions    |
+------------------------+-------------------------+
                         | PATCH via risk-policy route + audit
+------------------------+-------------------------+
| 2. risk engine (engine.py DEFAULT_POLICY)        |
|    blend order, base 50, mitigations -15 / -5    |
+------------------------+-------------------------+
                         | evaluate(signals) -> score + band
+------------------------+-------------------------+
| 1. calibration.yaml (AASIST display mapping)     |
|    raw 0-1 -> 0-100, severity 30/50/70 cuts      |
+--------------------------------------------------+
TUNE ORDER: 1 -> speaker cuts -> 2/3, all on labels
```

### Q26: Why does lazy-loading ECAPA save boot memory but cost latency later?

SpeechBrain plus torch plus ECAPA weights are heavy in both download size and resident RAM, and `services/ai-service/app/main.py` states this exceeds small-instance boot budgets. Eager loading would risk out-of-memory kills before the service serves any traffic, especially alongside onnxruntime and FastAPI workers. The chosen pattern constructs an empty `ECAPAWrapper` singleton at import and only calls `load()` inside `compute_embedding()` in `services/ai-service/app/models/ecapa_wrapper.py` when speaker work actually arrives. Boot stays light and fast, but the first enroll, verify, or compare call blocks on model fetch plus init. Later calls reuse the resident singleton at normal inference speed.

```
BOOT PATH (light)                FIRST SPEAKER CALL (heavy once)
+------------------+             +------------------------------+
| import FastAPI   |             | compute_embedding(audio)     |
| + AASIST ONNX    |             |   loaded? --YES--> encode    |
| + empty ECAPA    |             |     |                        |
|   singleton      |             |     NO                       |
| serve traffic in |             |     v                        |
| seconds          |             |   load(): pip deps present,  |
+------------------+             |   fetch voxceleb weights,    |
                                 |   init torch CPU model       |
                                 |     |                        |
                                 |     v                        |
                                 |   encode_batch -> 192-dim    |
                                 |   all later calls = fast     |
                                 +------------------------------+
```

### Q27: How do cold-start and first-request latency differ in this service?

Cold start is container boot plus eager AASIST-L ONNX load in `load_models()` in `services/ai-service/app/main.py`, which is small because the ONNX file plus onnxruntime CPU provider initializes quickly. First-request latency is a separate spike when the first speaker endpoint triggers ECAPA `load()` inside `services/ai-service/app/models/ecapa_wrapper.py`, downloading weights and initializing torch on CPU. A demo that only shows spoof scoring never pays the ECAPA cost, while a demo that shows voiceprint or verification pays it exactly once. The mitigation is a warmup call to a speaker endpoint before judges arrive, verified through `/version` showing ecapa_tdnn loaded. Health plus ready plus version probes should therefore distinguish booted from fully warm.

```
TIMELINE
boot -----> ready -----> first spoof req -----> first speaker req -----> steady
|            |            |                      |                       |
| fast       | /health    | fast (AASIST warm)   | SLOW once (ECAPA      |
| AASIST ONNX| /ready OK  | onnxruntime CPU      | download + torch init)|
| load eager | /version:  |                      |                       |
|            | aasist yes |                      | then fast (resident)  |
|            | ecapa no   |                      | /version: ecapa yes   |
+------------+------------+----------------------+-----------------------+
WARMUP: call speaker endpoint before demo, then check /version
```

### Q28: Why is the risk engine deterministic and reproducible, and what could break that?

`evaluate()` in `services/ai-service/app/risk/engine.py` is pure arithmetic over its inputs with fixed blend order, fixed default weights, and no random sampling, timestamps, or network calls. The same signals dict plus the same policy dict always yields the same score, band, triggers, and explanation string. Model version fields are stamped from signal metadata so evidence records which code produced the score. Reproducibility breaks only if inputs change silently, such as a different `policy.yaml`, a changed org policy row, a new `calibration.yaml` mapping, or nondeterministic upstream model outputs. Callers who log signals plus policy_version plus model_versions can therefore replay any historical score exactly.

```
REPLAY MODEL
+-----------+   +-----------+   +------------------+   +--------+
| signals   +-->| policy    +-->| evaluate()       +-->| score  |
| spoof 82  |   | weights   |   | fixed order,     |   | 23 LOW |
| sim 0.88  |   | bands     |   | no randomness,   |   | triggers
| dsp {...} |   | version   |   | no clock, no net |   | explain|
+-----------+   +-----------+   +------------------+   +--------+
     |               |                    |
     +---- log all three -----------------+
           = bit-identical replay later
BREAKS IF: policy file, org row, calibration map, or model
weights change without versioning the evidence record
```

### Q29: How would you evaluate this system with EER and minDCF?

Equal error rate is the operating point where false accept rate equals false reject rate, swept by moving one decision threshold across labeled bona fide versus spoof trials. Minimum detection cost function goes further by weighting misses versus false alarms plus a prior target probability, which matches security deployments where a missed spoof costs more than an extra review. The correct rig scores a fixed labeled set through `predict()` in `services/ai-service/app/models/aasist_wrapper.py`, sweeps the raw cutoff from 0 to 1, plots detection error tradeoff curves, and reports both EER and minDCF with confidence intervals. A second rig sweeps ECAPA cosine cutoffs over same-speaker versus impostor pairs from `verify_speaker()` in `services/ai-service/app/models/ecapa_wrapper.py`. A third end-to-end rig sweeps final risk bands in `services/ai-service/app/risk/engine.py` to show how fusion moves the tradeoff versus either model alone.

```
EVAL RIG
labeled trials ---> score each ---> sweep threshold ---> curve + metrics
+----------------+  +------------+  +------------------+  +----------+
| bona fide clips|  | AASIST raw |  | cutoff 0.00-1.00 |  | EER    |
| spoof clips    +->| 0-1 score  +->| FAR vs FRR       +->| minDCF |
| (held-out)     |  | per clip   |  | DET curve        |  | report |
+----------------+  +------------+  +------------------+  +----------+
repeat for ECAPA cosine sweep (same vs impostor pairs)
repeat for fused risk sweep (final bands in engine.py)
```

### Q30: What does AASIST evaluation mean concretely for VoxVerity right now?

The evaluation block in `services/ai-service/app/models/calibration.yaml` names ASVspoof2019 LA eval plus a custom VoxVerity set, but both list equal error rate as TBD with last evaluated dated 2026-09-05. That means no in-repo measured accuracy number can be quoted to judges yet, and any benchmark from upstream papers does not transfer automatically to this deployment. Honest evaluation here requires running the local ONNX wrapper over held-out clips, including tones, noise, short clips, and replay chains, then recording EER plus score histograms. Results feed back into calibration cutoffs, engine weights, and documented limits rather than marketing claims. Until that run lands, every claim stays at the level of spoof signal behavior with explicit out-of-domain warnings.

```
STATUS TODAY                    PATH TO CREDIBLE NUMBER
+--------------------------+    +----------------------------------+
| calibration.yaml:        |    | 1. collect held-out set (real,   |
| ASVspoof2019 LA EER=TBD  |    |    TTS, VC, replay, noise)       |
| custom set EER=TBD       +--->| 2. run local ONNX wrapper        |
| upstream papers != local |    | 3. sweep cutoff -> EER + minDCF  |
| deployment number        |    | 4. set cutoffs + weights on data |
+--------------------------+    | 5. publish date + set + metrics  |
                                +----------------------------------+
Until step 5: say spoof signal, not fraud proof
```

## Rapid-fire one-liners

| # | Question | One-line answer |
|---|----------|-----------------|
| 1 | What does AASIST-L output? | Bona fide model score 0-1 plus 0-100 display score with severity label. |
| 2 | What is class 0? | Bona fide class, verified because natural speech fires class 0. |
| 3 | What runtime runs AASIST-L? | onnxruntime CPU provider over model_artifacts slash aasist-l.onnx. |
| 4 | What is ECAPA output? | 192-dim speaker embedding compared with cosine similarity. |
| 5 | ECAPA match cutoff? | 0.70 likely same speaker, 0.85 high confidence. |
| 6 | Enroll vs verify? | Enroll stores a reference vector, verify compares a new clip to it. |
| 7 | Default top risk weight? | Spoof detection at 0.40 in DEFAULT_POLICY. |
| 8 | No-speech rule? | Clamp fused risk to at most 8 and note no speech detected. |
| 9 | CPU torch why? | Default CUDA torch OOMs 512 MB hosts, so CPU index pins are used. |
| 10 | Score or verdict? | Always model score or spoof signal, never an absolute fraud verdict. |
