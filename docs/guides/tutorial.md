# VoxVerity Complete Tutorial

**Step-by-step guide from entry to end**

---

## Before You Start

### Prerequisites
- Node.js 24 LTS installed
- Python 3.13.x installed
- Git installed
- Chrome browser (recommended)
- MetaMask (optional, for blockchain)

### Start the Application

**Terminal 1 - AI Service:**
```bash
cd services/ai-service
.venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Web App:**
```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Page 1: Landing Page (`/`)

**What you see:**
- Navigation bar with Logo, Features, How it Works, Pricing, Sign In, Get Started
- Hero section: "Real-Time Voice Integrity Verification"
- Problem section: Why caller ID is broken
- How It Works: 4-step flow (Capture → Analyze → Score → Act)
- Evidence Layers: DSP, AASIST-L, ECAPA-TDNN, Risk Engine
- Privacy section: 6 privacy commitments
- Technology section: All tech stack badges
- CTA: "Ready to Verify Voice Integrity?"
- Footer: Help, Status, Privacy, Terms

**What to do:**
1. Scroll through the entire page
2. Click "Get Started" → goes to /register
3. Click "Sign In" → goes to /login

---

## Page 2: Register (`/register`)

**What you see:**
- Name, Email, Password, Confirm Password fields
- "Sign up" button
- "Already have an account? Sign in" link
- "or sign up with" divider
- Google and GitHub OAuth buttons

**What to do:**
1. Enter a name (e.g., "Test User")
2. Enter an email (e.g., "test@example.com")
3. Enter a password (min 8 characters)
4. Confirm the password
5. Click "Sign up"

**What happens:**
- If using Supabase: Creates account, may need email confirmation
- If using mock: Shows success message

---

## Page 3: Login (`/login`)

**What you see:**
- Email and Password fields
- "Forgot your password?" link
- "Sign in" button
- "Don't have an account? Sign up" link
- "or continue with" divider
- Google and GitHub OAuth buttons

**What to do:**
1. Enter your email
2. Enter your password
3. Click "Sign in"

**What happens:**
- Validates credentials
- Redirects to /dashboard

---

## Page 4: Dashboard (`/dashboard`)

**What you see:**
- Header: Organization name, notification bell, user menu
- KPI Cards: Active Sessions, Risk Score, Alerts, Incidents
- AI Service Status card
- Recent Alerts list
- Quick Actions grid (Live Monitor, Audio Lab, Verify Speaker, View Reports)
- Open Incidents table

**What to do:**
1. Review the KPI numbers
2. Check AI Service status (should say "Online" if running)
3. Click "Live Monitor" quick action → goes to /live
4. Click "Audio Lab" quick action → goes to /lab/audio

---

## Page 5: Live Monitor (`/live`)

**What you see:**
- Connection status indicator (Connected/Disconnected)
- Audio Capture section with Start/Stop button
- When active: Audio Level meter, Waveform canvas, Spectrum canvas
- Risk Score card (updates in real-time)
- Spoof Signal card
- Acoustic Dynamics card
- Peak Level card
- DSP Metric cards (RMS, Crest Factor, Dynamic Range, etc.)
- Quality Flags badges
- Risk Trend chart (when data available)
- Alerts section
- Chunk Timeline

**What to do:**
1. Click "Start Capture"
2. Grant microphone permission when browser asks
3. Speak into your microphone
4. Watch the waveform and spectrum update
5. Watch the Risk Score change
6. Speak louder/quieter to see changes
7. Stay silent to see silence detection
8. Click "Stop Capture" when done

**What you should see:**
- Audio Level meter moves with your voice
- Waveform shows your voice pattern
- Spectrum shows frequency distribution
- Risk Score updates every 3 seconds
- DSP metrics populate with real values
- Quality flags appear (silence_detected, etc.)

---

## Page 6: Calls (`/calls`)

**What you see:**
- Search bar
- Filter buttons (All, Low, Medium, High, Critical)
- Table with columns: Session, Source, Time, Duration, Risk, Status, Alerts

**What to do:**
1. Type in search bar to filter calls
2. Click severity filters
3. Click "View" on any call → goes to /calls/[id]

---

## Page 7: Call Detail (`/calls/[id]`)

**What you see:**
- Session info card (ID, source, duration, status)
- DSP Metrics card
- Quality Flags
- Risk Assessment
- Timeline of events

**What to do:**
1. Review all the analysis data
2. Check risk score and contributing factors

---

## Page 8: Alerts (`/alerts`)

**What you see:**
- Filter buttons (All, Unacknowledged, Critical, High, Medium, Low)
- Alert cards with severity badge, risk score, recommendation
- "Acknowledge" button on unacknowledged alerts
- "View" button

**What to do:**
1. Filter by severity
2. Click "Acknowledge" on an alert
3. Click "View" for details

---

## Page 9: Incidents (`/incidents`)

**What you see:**
- Filter buttons (All, Active, Open, Investigating, etc.)
- Table with: ID, Status, Session, Risk, Owner, Evidence, Opened
- "View" button

**What to do:**
1. Filter by status
2. Click "View" on any incident → goes to /incidents/[id]

---

## Page 10: Incident Detail (`/incidents/[id]`)

**What you see:**
- Incident info (ID, status, owner)
- Timeline of events
- Linked alerts
- Evidence records
- Notes section
- Resolution options

**What to do:**
1. Review the timeline
2. Add notes
3. Update status (Open → Investigating → Resolved)

---

## Page 11: Verification (`/verification`)

**What you see:**
- Tab buttons: Verification Workflow, Speaker Enrollment, Speaker Verify
- Verification Workflow tab: List of verification requests
- Speaker Enrollment tab: Upload reference audio, enter User ID
- Speaker Verify tab: Upload test audio, enter User ID to verify against

**What to do:**

### Enrollment:
1. Click "Speaker Enrollment" tab
2. Enter a User ID (e.g., "user-001")
3. Enter a Name (optional)
4. Upload a reference audio file (WAV)
5. Click "Enroll Speaker"

### Verification:
1. Click "Speaker Verify" tab
2. Enter the enrolled User ID
3. Upload a test audio file
4. Click "Verify Speaker"
5. See similarity score and match result

---

## Page 12: Audio Lab (`/lab/audio`)

**What you see:**
- Upload area (drag & drop or click)
- "Analyze File" and "Clear" buttons
- After upload: Analysis results

**Results show:**
- Aggregated Analysis (risk score, contributing signals, model attribution)
- Acoustic Behavior Descriptor (score, contributing factors, quality flags)
- Spoof Detection (AASIST-L score, confidence)
- DSP Metrics (all 12 metrics)

**What to do:**
1. Click the upload area
2. Select a WAV file
3. Click "Analyze File"
4. Wait for results
5. Review all sections

**What you should see:**
- Risk score (0-100)
- Severity (LOW/MEDIUM/HIGH/CRITICAL)
- Spoof detection score
- Acoustic dynamics score
- All DSP metrics with values
- Quality flags

---

## Page 13: WebRTC Demo Call (`/lab/live`)

**What you see:**
- Room ID input (leave blank for random)
- "Join as Caller" and "Join as Receiver" buttons
- Instructions

**What to do:**
1. Open this page in **two browser tabs**
2. Tab 1: Enter a Room ID (e.g., "demo-123"), click "Join as Caller"
3. Tab 2: Enter the same Room ID, click "Join as Receiver"
4. Tab 1 (Caller): Speak into microphone
5. Tab 2 (Receiver): Hears the caller and analyzes audio

**What you should see:**
- Both tabs show "Call Active"
- Receiver sees remote audio level
- Analysis runs on the received audio

---

## Page 14: Analytics (`/analytics`)

**What you see:**
- Risk Distribution bar chart
- Model Performance table
- Language Coverage grid
- Evaluation Matrix table

**What to do:**
1. Review risk distribution
2. Check model evaluation status
3. See which languages are evaluated

---

## Page 15: Threat Intelligence (`/threat-intelligence`)

**What you see:**
- Threat Summary cards (Active Threats, Campaigns, Last 24h)
- Threat Types table (Synthetic Voice, Replay Attack, etc.)
- Campaigns list
- Recent Findings list

**What to do:**
1. Review threat types and trends
2. Check active campaigns
3. Review recent findings

---

## Page 16: Evidence & Blockchain (`/blockchain`)

**What you see:**
- Contract Status card (Network, Address, Chain ID, Status)
- Verify Evidence section (input Evidence ID, click Verify)
- How It Works explanation

**What to do:**
1. Enter an Evidence ID
2. Click "Verify Evidence"
3. See verification result (VERIFIED or MISMATCH)

---

## Page 17: Audit Trail (`/audit`)

**What you see:**
- Event count
- Filter buttons (All, specific actions)
- Event list with severity indicator, action, user, session, timestamp

**What to do:**
1. Filter by action type
2. Review security-relevant events
3. Check user actions

---

## Page 18: Integrations (`/integrations`)

**What you see:**
- Active Source card (WebRTC)
- Available Adapters list (Telephony, SIP, Twilio, Meeting Platforms)
- Source-Agnostic Architecture explanation

**What to do:**
1. Review active adapter
2. Check adapter requirements
3. Review legal requirements for each

---

## Page 19: Models (`/models`)

**What you see:**
- Model cards (AASIST-L, ECAPA-TDNN)
- Status, version, license info
- Load/unload controls

**What to do:**
1. Check model status
2. View model metadata

---

## Page 20: Settings (`/settings`)

**What you see:**
- Link cards for: Profile, Security, Notifications, Privacy, Risk Thresholds

**Sub-pages:**

### Profile (`/settings/profile`)
- Name, Email, Role display
- Save button

### Security (`/settings/security`)
- Change Password section
- Active Sessions list

### Notifications (`/settings/notifications`)
- Email Notifications toggle
- Browser Notifications toggle
- Critical Alerts Only toggle

### Privacy (`/settings/privacy`)
- Audio Retention dropdown
- Data Retention dropdown
- Save Privacy Settings button

### Risk Thresholds (`/settings/risk`)
- Low Max, Medium Max, High Max inputs
- Save Thresholds button

---

## Page 21: Admin (`/admin`)

**What you see:**
- Link cards for: Users, Organizations, Roles, Models, System

**Sub-pages:**

### Users (`/admin/users`)
- User table with Role dropdown
- Role changes

### Organizations (`/admin/organizations`)
- Organization list
- Create Organization button

### Roles (`/admin/roles`)
- Role definitions
- Permission matrix

### Models (`/admin/models`)
- Model registry
- Deployment status

### System (`/admin/system`)
- System status
- Configuration

---

## The Complete Flow

### Demo Scenario (15 minutes)

1. **Start services** (AI + Web)
2. **Open landing page** → Explain the product
3. **Register/Login** → Show authentication
4. **Dashboard** → Show KPIs and status
5. **Audio Lab** → Upload test file, show analysis
6. **Live Monitor** → Start capture, speak, show real-time analysis
7. **Alerts** → Show alert creation on high risk
8. **Incidents** → Show incident workflow
9. **Verification** → Enroll speaker, verify
10. **Blockchain** → Show evidence verification
11. **Analytics** → Show risk distribution
12. **Audit** → Show security trail

---

## Troubleshooting

### "WebSocket connection error"
- AI service not running
- Start: `uvicorn app.main:app --reload --port 8000`

### "Failed to fetch"
- AI service not running
- Check: http://localhost:8000/health

### "Microphone permission denied"
- Click lock icon in browser address bar
- Enable microphone
- Refresh page

### "Audio file not supported"
- Use WAV format (PCM 16-bit)
- Max 50MB

### Dashboard shows mock data
- AI service not connected
- Check NEXT_PUBLIC_AI_SERVICE_URL in .env.local

### No risk updates in Live Monitor
- WebSocket not connected
- Check AI service is running
- Check browser console for errors

---

## Key Concepts

### Risk Score (0-100)
- 0-25: LOW (natural speech patterns)
- 26-50: MEDIUM (some anomalies)
- 51-75: HIGH (significant anomalies)
- 76-100: CRITICAL (strong synthetic indicators)

### Analysis Pipeline
```
Audio → DSP Metrics → AASIST-L → ECAPA-TDNN → Risk Engine → Alert
```

### Evidence Integrity
```
Analysis Results → Canonical JSON → SHA-256 Hash → Blockchain
```

### Privacy by Design
- Raw audio processed in memory, not stored
- Only hashes on blockchain
- No PII in logs
- Explicit consent required
