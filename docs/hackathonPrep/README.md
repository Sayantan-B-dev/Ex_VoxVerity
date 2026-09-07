# Hackathon Prep - Judge Q&A Packs

180 questions with answers (6 files x 30). Each file: Q1-Q20 medium with
explanations, Q21-Q30 hard with ASCII diagrams, plus a rapid-fire table.

| File | Topic | Start here if judges ask... |
|---|---|---|
| `01-blockchain-evidence.md` | Evidence hashing + on-chain registry | "What do you store on-chain?" |
| `02-total-pipeline.md` | End-to-end call-to-evidence flow | "Walk me through the system" |
| `03-ai-integration.md` | AASIST-L, ECAPA, risk engine | "How does the AI actually work?" |
| `04-ai-training-voiceprint.md` | Voiceprint enrollment ("training") | "How did you train the model?" (we didn't - read the intro first) |
| `05-websocket-webrtc.md` | Realtime sockets + call signaling | "Why WebSockets? What about WebRTC?" |
| `06-security-demo.md` | Auth, threat model, deployment, demo script | "Is it secure?" + the 60-second demo script |

Honesty rules (judges probe these): risk scores are policy outputs, not
probabilities. AASIST-L is anti-spoofing, not a universal clone detector.
No PSTN interception, no raw audio on-chain, human stays in the loop.
