# Cruxsee ⚡️

> **See the crux , ignore the fluff**
>
> Your AI operator for email, calendar, and everyday workflows. Think less. Execute faster.

Cruxsee is not just another chatbot. It is a production-grade **AI Operator Platform** designed to help you execute tasks directly from a sleek, keyboard-first interface. With an aesthetic inspired by Apple Spotlight and modern minimal design, Cruxsee lets you command your digital life with unprecedented speed.

---

## 🌟 Features

- **Keyboard-First Command Palette:** Press `Cmd + K` anywhere to bring up a globally accessible, macOS Spotlight-style glassmorphic command palette. Instantly start a new chat, schedule events, or check HackerNews.
- **Agentic Workflow Engine:** Instead of just chatting, Cruxsee uses advanced reasoning to execute external tools. It drafts emails, checks your calendar, and pulls live data directly into your workspace.
- **Interactive Action Cards:** Tool executions are fully transparent. Whether it's drafting a Gmail, scheduling an event, or fetching the top 10 HackerNews stories, everything is rendered as beautiful, interactive UI cards.
- **Human-in-the-Loop Confirmation:** Cruxsee never executes destructive or external actions autonomously. You always have full visibility and approval over emails sent or calendar invites dispatched.
- **Markdown & Code Ready:** Beautiful markdown rendering with streaming support and syntax-highlighted code blocks for your technical queries.
- **Lightning Fast UI:** Built with Next.js and Tailwind CSS, featuring micro-interactions, dark mode, and sleek animations that feel premium and responsive.

---

## 🏗 Architecture

Cruxsee is built on a scalable **Turborepo** monorepo architecture, leveraging the best modern web technologies:

- **Frontend:** Next.js, React, Tailwind CSS, Lucide Icons, `cmdk`
- **Backend:** Node.js, tRPC (Optional/Legacy Starter), PostgreSQL
- **ORM:** Prisma
- **Authentication:** Better Auth (Google OAuth)
- **Deployment:** Docker, Caddy (Reverse Proxy), GitHub Actions for CI/CD

### Repository Structure
```text
cruxsee/
├── apps/
│   ├── web/        # Next.js Chat & Workspace interface
│   └── landing/    # Marketing website (cruxsee.in)
├── packages/
│   ├── ui/         # Shared UI components
│   ├── db/         # Prisma schema and database clients
│   └── config/     # ESLint, TypeScript, and Tailwind configurations
├── docker/         # Dockerfiles and docker-compose configurations
└── .github/        # GitHub Actions for automated deployment
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- `pnpm` package manager
- PostgreSQL database
- Google Cloud Console Project (for OAuth keys)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/JAHANWEE/cruxsee.git
cd cruxsee
pnpm install
```

### 2. Environment Variables
Create a `.env` file in the root of the project. You will need:
```env
# Database
POSTGRES_PASSWORD=<your-db-password>
DATABASE_URL="postgresql://user:password@localhost:5432/cruxsee"

# Authentication
BETTER_AUTH_SECRET=<random-secret-string> # Generate using: openssl rand -base64 32
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# AI & Integrations
OPENAI_API_KEY=<your-openai-key>
CORSAIR_KEK=<32-byte-hex-encryption-key> # Generate using: openssl rand -hex 32
```

### 3. Database Setup
Ensure your PostgreSQL instance is running, then push the Prisma schema to the database:
```bash
pnpm db:push
```

### 4. Run the Development Server
```bash
pnpm dev
```
The workspace will be available at `http://localhost:3000`. 

*(Note: API backend will typically run on port `4000`. Ensure your Google OAuth Authorized Redirect URIs match your local ports).*

---

## 🛳 Production Deployment

Cruxsee is designed to be self-hosted on a Linux VM using Docker and Caddy as a reverse proxy. 

Deployment is entirely automated:
1. `git push origin main`
2. GitHub Actions builds the Docker images.
3. The VM pulls the latest images via `docker-compose`.
4. Caddy routes traffic seamlessly with automatic SSL.

---

## 🤝 Philosophy

1. **High Signal-to-Noise Ratio:** We hide the clutter. If it isn't actionable or insightful, it's not on the screen.
2. **Speed is a Feature:** The fewer clicks required, the better. Rely heavily on keyboard shortcuts.
3. **Calm Aesthetic:** Deep blacks, subtle glassmorphism, and smooth typography. The tool should feel like an extension of your operating system.

---

*Cruxsee — Think less. Execute faster.*
