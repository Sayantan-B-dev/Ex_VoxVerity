# VoxVerity Deployment Guide

**Version:** 0.1.0
**Last Updated:** September 2026

---

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│   Next.js Web App   │────▶│   FastAPI AI Service │
│   (Port 3000)       │     │   (Port 8000)        │
└─────────────────────┘     └─────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Supabase          │     │   Polygon Amoy       │
│   (PostgreSQL)      │     │   (Blockchain)       │
└─────────────────────┘     └─────────────────────┘
```

---

## Local Development

### Prerequisites
- Node.js 24 LTS
- Python 3.13.x
- Git

### Setup
```bash
# Clone and install
git clone https://github.com/Sayantan-B-dev/Ex_VoxVerity.git
cd Ex_VoxVerity
npm install

# Python environment
cd services/ai-service
python -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
cd ../..

# Environment config
cp .env.example apps/web/.env.local
# Edit with your Supabase credentials
```

### Running Locally
```bash
# Terminal 1: AI Service
cd services/ai-service
.venv/Scripts/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Web App
npm run dev
```

### Access
- Web App: http://localhost:3000
- AI Service: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Production Deployment

### Web Application (Vercel)

1. Push to GitHub
2. Connect repository to Vercel
3. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add environment variables in Vercel dashboard
5. Deploy

### AI Service (Python Host)

1. Choose a Python-compatible host:
   - Railway
   - Render
   - Fly.io
   - AWS ECS
   - Google Cloud Run

2. Configure:
   - Python 3.13
   - Port 8000
   - WebSocket support enabled
   - Long-running process (not serverless)

3. Set environment variables

4. Deploy with WebSocket support

### Database (Supabase)

1. Create Supabase project
2. Run SQL migrations:
   - `supabase/migrations/001_initial_auth_and_profiles.sql`
   - `supabase/migrations/002_full_schema.sql`
3. Enable RLS on all tables
4. Configure auth providers

### Blockchain (Polygon Amoy)

1. Fund wallet with test MATIC
2. Deploy contract:
   ```bash
   cd blockchain
   npm install
   npx hardhat run scripts/deploy.js --network amoy
   ```
3. Update contract address in environment

---

## Environment Variables

### Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Service
NEXT_PUBLIC_AI_SERVICE_URL=https://your-ai-service.com
AI_SERVICE_API_KEY=your-api-key
```

### Optional
```env
# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Blockchain
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=your-private-key
VOICE_REGISTRY_ADDRESS=your-contract-address
```

---

## Monitoring

### Health Endpoints
- `GET /health` - Service health check
- `GET /ready` - Readiness check
- `GET /version` - Version and model status
- `GET /v1/performance` - Pipeline metrics

### Key Metrics
- Chunk processing latency
- Queue depth
- Model inference time
- Alert creation rate
- Error rate

---

## Scaling Considerations

### Current Limits
- Single-instance deployment
- In-memory stores
- No horizontal scaling

### Future Improvements
- Redis for session/alert storage
- PostgreSQL for all persistence
- Load balancer for AI service
- Model serving optimization

---

## Security Notes

- Never commit secrets to repository
- Use environment variables for all credentials
- Enable HTTPS in production
- Configure CORS for production domains
- Regular dependency audits

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Sayantan-B-dev/Ex_VoxVerity/issues
- Documentation: See docs/ directory
