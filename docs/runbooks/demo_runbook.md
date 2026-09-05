# VoxVerity End-to-End Demo Runbook

**Version:** 1.0
**Last Updated:** September 2026
**Purpose:** Repeatable SIH demonstration from login through realtime detection to blockchain verification

---

## Prerequisites

### Software Requirements
- Node.js 24 LTS
- Python 3.13.x
- Git
- Modern browser (Chrome/Edge recommended)

### Environment Setup
```bash
# 1. Clone repository
git clone https://github.com/Sayantan-B-dev/Ex_VoxVerity.git
cd Ex_VoxVerity

# 2. Install web dependencies
npm install

# 3. Install AI service dependencies
cd services/ai-service
python -m venv .venv
.venv/Scripts/activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cd ../..

# 4. Configure environment
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase credentials

# 5. Install blockchain dependencies (optional)
cd blockchain
npm install
cd ..
```

### Required Credentials
- Supabase project URL and keys (for database)
- Google/GitHub OAuth credentials (optional, for OAuth demo)
- Polygon Amoy wallet (optional, for blockchain demo)

---

## Demo Script

### Scenario: Voice Integrity Verification

**Duration:** 15-20 minutes
**Audience:** SIH evaluators, security analysts

### Step 1: System Overview (2 min)

1. Open http://localhost:3000
2. Show landing page with product explanation
3. Highlight key features:
   - Real-time voice analysis
   - Multi-signal risk scoring
   - Evidence integrity with blockchain

### Step 2: Authentication (2 min)

1. Navigate to /login
2. Show email/password login
3. Show OAuth options (Google/GitHub)
4. Login and reach dashboard
5. Show user session management

### Step 3: Dashboard Overview (2 min)

1. Show dashboard with KPI cards
2. Explain risk score visualization
3. Show recent alerts and incidents
4. Navigate to different modules via sidebar

### Step 4: Audio Lab Analysis (3 min)

1. Navigate to /lab/audio
2. Upload a test WAV file
3. Show DSP metrics results
4. Show human-pattern descriptor
5. Show spoof detection (AASIST-L)
6. Show aggregated risk assessment

### Step 5: Real-time Monitoring (4 min)

1. Navigate to /live
2. Click "Start Capture"
3. Grant microphone permission
4. Speak into microphone
5. Show:
   - Live waveform visualization
   - Audio level meter
   - Real-time risk updates
   - Chunk analysis timeline
6. Show risk trend chart updating

### Step 6: Alerts and Incidents (2 min)

1. Navigate to /alerts
2. Show alert list with severity filters
3. Acknowledge an alert
4. Navigate to /incidents
5. Show incident timeline
6. Show evidence package

### Step 7: Speaker Verification (2 min)

1. Navigate to /verification
2. Click "Speaker Enrollment" tab
3. Upload reference audio
4. Enter user ID
5. Click "Verify Speaker" tab
6. Upload test audio
7. Show similarity score

### Step 8: Blockchain Evidence (1 min)

1. Navigate to /blockchain
2. Show contract status
3. Enter an evidence ID
4. Click "Verify Evidence"
5. Show hash verification result

### Step 9: Analytics and Governance (2 min)

1. Navigate to /analytics
2. Show risk distribution chart
3. Show model performance table
4. Navigate to /audit
5. Show audit trail with filters

---

## Operator Checklist

### Pre-Demo
- [ ] AI service running on port 8000
- [ ] Web app running on port 3000
- [ ] Database connected (or mock data available)
- [ ] Test audio files ready in docs/demo/
- [ ] Browser cache cleared
- [ ] Microphone permission granted

### During Demo
- [ ] Landing page loads correctly
- [ ] Login works (email or OAuth)
- [ ] Dashboard shows data
- [ ] Audio lab accepts file upload
- [ ] Real-time monitoring connects
- [ ] Alerts appear on high risk
- [ ] Evidence verification works

### Post-Demo
- [ ] Stop AI service
- [ ] Stop web app
- [ ] Review audit logs
- [ ] Document any issues

---

## Troubleshooting Guide

### Common Issues

#### "AI service not running"
```bash
cd services/ai-service
.venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

#### "WebSocket connection failed"
- Check AI service is running on port 8000
- Check firewall allows WebSocket connections
- Try refreshing the page

#### "Microphone permission denied"
- Click the lock icon in browser address bar
- Enable microphone permission
- Refresh the page

#### "Audio file not supported"
- Use WAV format (PCM 16-bit)
- Max file size: 50MB
- Check file is not corrupted

#### "Supabase connection error"
- Check apps/web/.env.local has correct credentials
- Verify Supabase project is active
- Check network connectivity

#### "Build fails"
```bash
rm -rf apps/web/.next
npm run build
```

#### "Python import errors"
```bash
cd services/ai-service
.venv/Scripts/activate
pip install -r requirements.txt
```

### Performance Issues

#### High latency
- Check CPU usage during inference
- Reduce audio chunk size if needed
- Consider disabling AASIST-L for faster response

#### Memory issues
- Restart AI service periodically
- Monitor queue depth via /v1/performance
- Reduce max queue size if needed

---

## Demo Data

### Test Audio Files
Place test audio files in `docs/demo/`:
- `natural_speech.wav` - Human speech sample
- `synthetic_voice.wav` - TTS-generated audio (if available)
- `noisy_audio.wav` - Audio with background noise
- `silence.wav` - Silent audio file

### Expected Results

| File | Risk Score | Severity | Spoof Signal |
|------|------------|----------|--------------|
| natural_speech.wav | 20-40 | LOW | 0.7-0.9 |
| synthetic_voice.wav | 60-80 | HIGH | 0.2-0.4 |
| noisy_audio.wav | 30-50 | MEDIUM | 0.5-0.7 |
| silence.wav | 40-60 | MEDIUM | 0.5 |

---

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Optional
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=your-private-key
```

---

## Notes

- This is a prototype demonstration, not production deployment
- Model accuracy claims must match actual evaluation results
- Blockchain registration is optional for demo
- Raw audio is never stored permanently by default
- All analysis results include model version metadata
