# VoxVerity - How to Run Everything

Everything runs locally. Three services: **Web App** (Next.js), **AI Service** (FastAPI/Python), **Blockchain** (Hardhat).

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 24 LTS | https://nodejs.org |
| Python | 3.13.x | https://python.org/downloads |
| Git | Latest | https://git-scm.com |

---

## Step 1: Clone and Install

```bash
# Clone the repo
git clone https://github.com/Sayantan-B-dev/Ex_VoxVerity.git
cd Ex_VoxVerity

# Install web app dependencies
cd apps/web
npm install
cd ../..

# Install blockchain dependencies
cd blockchain
npm install
cd ..
```

---

## Step 2: Set Up Environment Variables

```bash
# Copy the template to the actual env file
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` in your editor and fill in these values:

### Required (Web App won't start without these)

```env
# Auth secret - generate with:
#   npx auth secret
AUTH_SECRET=your-generated-secret-here

# Supabase - get from https://supabase.com dashboard -> Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# AI service URL
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

### Optional (Google/GitHub OAuth)

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Optional (Blockchain)

```env
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
VOICE_REGISTRY_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
CHAIN_ID=80002
```

---

## Step 3: Set Up the Database

1. Go to https://supabase.com and open your project
2. Go to **SQL Editor**
3. Run these SQL files in order:
   - `supabase/migrations/001_initial_auth_and_profiles.sql`
   - `supabase/migrations/002_full_schema.sql`

---

## Step 4: Set Up Python Virtual Environment

```bash
cd services/ai-service

# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Go back to root
cd ../..
```

---

## Step 5: Start Everything

Open **3 separate terminals** (one for each service).

### Terminal 1: Web App (Next.js)

```bash
cd apps/web
npm run dev
```

Opens at: **http://localhost:3000**

### Terminal 2: AI Service (FastAPI)

```bash
cd services/ai-service

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Start the server
uvicorn app.main:app --reload --port 8000
```

Opens at: **http://localhost:8000**

API docs at: **http://localhost:8000/docs**

### Terminal 3: Blockchain (Optional)

Only needed if you want to deploy the smart contract to Polygon Amoy.

```bash
cd blockchain

# Deploy the contract
npx hardhat run scripts/deploy.js --network amoy
```

After deployment, copy the contract address into `apps/web/.env.local`:
```env
VOICE_REGISTRY_ADDRESS=0xYOUR_NEW_CONTRACT_ADDRESS
```

---

## Quick Start Summary (Copy-Paste)

**Terminal 1:**
```bash
cd apps/web && npm run dev
```

**Terminal 2:**
```bash
cd services/ai-service && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
```

**Terminal 3 (optional blockchain):**
```bash
cd blockchain && npx hardhat run scripts/deploy.js --network amoy
```

---

## Verify Everything Works

1. Open **http://localhost:3000** in your browser
2. You should see the landing page
3. Click **Sign In** or **Register** to create an account
4. After login, go to **Live Monitor** and click **Start Capture**
5. The WebSocket should connect to `ws://localhost:8000` and show "Connected"

### Health Checks

| Service | URL | Expected Response |
|---------|-----|-------------------|
| Web App | http://localhost:3000 | Landing page loads |
| AI Service | http://localhost:8000/health | `{"status": "healthy"}` |
| AI Service Docs | http://localhost:8000/docs | Swagger UI |
| Blockchain | N/A | Contract deployed to Amoy |

---

## Troubleshooting

### "WebSocket connection error"
- **Cause:** AI service is not running
- **Fix:** Start the AI service in Terminal 2 (see Step 5)

### "Cannot reach AI service"
- **Cause:** Wrong URL in `.env.local`
- **Fix:** Make sure `NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000`

### "MissingSecret" error
- **Cause:** `AUTH_SECRET` not set
- **Fix:** Run `npx auth secret` in `apps/web/` and paste the output into `.env.local`

### Python import errors
- **Cause:** Virtual environment not activated
- **Fix:** Activate `.venv` before running uvicorn

### "Unsupported provider: provider is not enabled"
- **Cause:** OAuth provider not configured in Supabase
- **Fix:** Enable Google/GitHub in Supabase Dashboard -> Authentication -> Providers (or use email/password)

### Port 3000 already in use
- **Fix:** Kill the process or use a different port: `npm run dev -- -p 3001`

### Port 8000 already in use
- **Fix:** Kill the process or use a different port: `uvicorn app.main:app --reload --port 8001`

---

## File Structure Quick Reference

```
voxverity/
  apps/web/           <- Next.js web app (port 3000)
    .env.local        <- Your secrets (NOT committed)
  services/ai-service/ <- FastAPI AI service (port 8000)
    .venv/            <- Python virtual environment
    requirements.txt  <- Python dependencies
  blockchain/         <- Hardhat smart contract
    .env              <- Blockchain secrets (NOT committed)
    contracts/        <- Solidity contracts
    scripts/          <- Deployment scripts
  supabase/           <- Database migrations
    migrations/       <- SQL files to run in Supabase
```
