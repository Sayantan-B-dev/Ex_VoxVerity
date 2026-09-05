# VoxVerity Release Checklist

**Version:** 0.1.0
**Date:** September 2026
**Type:** SIH Prototype Release Candidate

---

## Pre-Release Verification

### Build Verification
- [ ] `npm run build` passes with no errors
- [ ] TypeScript compilation succeeds
- [ ] No console errors in browser
- [ ] All routes render without errors

### AI Service Verification
- [ ] FastAPI starts without errors
- [ ] `/health` endpoint returns healthy
- [ ] `/ready` endpoint returns ready
- [ ] `/version` shows correct model status
- [ ] AASIST-L loads (or graceful fallback)
- [ ] ECAPA-TDNN loads (or graceful fallback)

### Authentication Verification
- [ ] Email/password login works
- [ ] OAuth buttons display correctly
- [ ] Session persists on refresh
- [ ] Protected routes redirect unauthenticated users
- [ ] Sign-out clears session

### Realtime Pipeline Verification
- [ ] WebSocket connects successfully
- [ ] Audio chunks are processed
- [ ] Risk updates are received
- [ ] Alerts trigger on high risk
- [ ] Backpressure works under load

### Data Integrity Verification
- [ ] Evidence manifest generates correctly
- [ ] SHA-256 hash is deterministic
- [ ] Verification returns correct results
- [ ] Audit events are recorded

### Security Verification
- [ ] Security headers present in responses
- [ ] Rate limiting active on API
- [ ] No secrets in client bundle
- [ ] No raw audio in logs

---

## Version Verification

### Web Application
- Next.js: 16.x
- React: 19.x
- TypeScript: 5.x

### AI Service
- Python: 3.13.x
- FastAPI: 0.115.x
- PyTorch: 2.x

### Models
- AASIST-L: v1.0 (MIT)
- ECAPA-TDNN: v1.0 (Apache-2.0)

### Database
- Supabase PostgreSQL
- RLS enabled on all tables

### Blockchain
- Polygon Amoy (Chain ID: 80002)
- Solidity 0.8.24

---

## Known Limitations

### Model Limitations
1. AASIST-L performs best on in-domain data (ASVspoof2019)
2. Out-of-domain performance is significantly worse
3. Requires minimum 4 seconds of audio for reliable inference
4. ECAPA-TDNN similarity is not identity proof

### System Limitations
1. In-memory stores (no persistence across restarts)
2. Single-instance deployment only
3. No horizontal scaling
4. No production authentication (demo only)

### Privacy Considerations
1. Raw audio processed in memory, not stored by default
2. Blockchain registration is optional
3. No PII in analytics dashboards
4. Audit logs avoid secrets and raw audio

---

## Deployment Notes

### Development
```bash
npm run dev          # Web app on port 3000
uvicorn app.main:app --reload  # AI service on port 8000
```

### Staging/Production
- Deploy web app to Vercel/Netlify
- Deploy AI service to Python host with WebSocket support
- Configure Supabase production project
- Set up Polygon Amoy wallet for blockchain

### Environment Variables
See `.env.example` for required variables.

---

## Sign-Off

- [ ] Code review complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Release notes drafted
- [ ] Known limitations documented
- [ ] Deployment verified

**Release Candidate:** VoxVerity v0.1.0
**Status:** Ready for SIH Demonstration
