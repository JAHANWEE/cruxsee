# Instructions for User

## Phase 1 — Infrastructure Setup (Complete)

### What was completed:
- ✅ GitHub Actions workflow (`.github/workflows/deploy.yml`)
- ✅ Multi-stage Dockerfile (`docker/Dockerfile`) with `web` and `api` targets
- ✅ Production `docker/docker-compose.yml` (caddy, web, api, postgres)
- ✅ `docker/Caddyfile` for reverse proxy + auto SSL
- ✅ `next.config.js` updated with `output: "standalone"`
- ✅ Cleaned up @teachyst and Streamyst references
- ✅ API default port set to 4000

---

### Actions YOU must perform:

#### 1. GitHub Repository Settings
- Go to your repo → Settings → Actions → General
- Under "Workflow permissions", enable **"Read and write permissions"**
- This allows the workflow to push images to GHCR

#### 2. Add GitHub Secrets
Go to repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret       | Value                                          |
| --------------| ------------------------------------------------|
| `VM_HOST`    | Your VM IP address (e.g., `143.198.x.x`)       |
| `VM_USER`    | SSH user on VM (e.g., `root` or `deploy`)      |
| `VM_SSH_KEY` | Private SSH key for that user (paste full key) |

#### 3. Setup the VM
SSH into your VM and run:

```bash
# Create project directory
mkdir -p ~/cruxsee && cd ~/cruxsee

# Copy the production compose and Caddyfile from this repo's docker/ folder
# OR scp them:
# scp docker/docker-compose.yml docker/Caddyfile user@your-vm:~/cruxsee/

# Create .env file
cat > .env << 'EOF'
GITHUB_REPO=your-github-username/cruxsee
POSTGRES_USER=cruxsee
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE
POSTGRES_DB=cruxsee
DATABASE_URL=postgresql://cruxsee:YOUR_STRONG_PASSWORD_HERE@postgres:5432/cruxsee
EOF

# Login to GHCR (use a GitHub PAT with packages:read scope)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### 4. DNS Records
Point these A records to your VM IP:

| Record | Type | Value |
|--------|------|-------|
| `home.cruxsee.in` | A | VM_IP |
| `chat.cruxsee.in` | A | VM_IP |
| `api.cruxsee.in` | A | VM_IP |

> Note: `cruxsee.in` and `www.cruxsee.in` will be added later when the landing page moves to the root domain.

#### 5. First Deploy
After all above is done, push to `main`:
```bash
git add -A && git commit -m "feat: phase 1 — deployment infrastructure" && git push origin main
```

#### 6. Verify
- Check GitHub Actions tab for green workflow
- Visit `https://api.cruxsee.in/health` — should return `{"message":"healthy","healthy":true}`
- Visit `https://home.cruxsee.in` — should show the Next.js app

---

### Blockers / Dependencies
- VM must have Docker + Docker Compose installed
- VM must have Caddy installed OR use the containerized Caddy (already in compose)
- DNS propagation can take up to 48h (usually minutes with Cloudflare)
- GitHub PAT on VM needs `read:packages` scope for pulling GHCR images
