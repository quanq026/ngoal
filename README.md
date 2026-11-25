<p align="center">
  <img src="apps/web/src/app/icon.svg" alt="nGoal logo" width="64" height="64" />
</p>

<h1 align="center">nGoal</h1>

<p align="center">
  A clean, self-hosted agile project tracker &amp; issue management platform with deep GitHub integration.
</p>

---

## Features

- **Work Items (Kanban & Table)** — Track issues across customizable workflow states, priorities, labels, checklists, due dates, saved views, and custom fields.
- **Cycles** — Plan time-boxed sprints with clear progress tracking.
- **Note Boards** — Freeform canvas for sticky notes and brainstorming beside your project.
- **Dashboards** — Build custom project dashboards with issue counts, breakdowns, burnup forecasts, throughput charts, activity feeds, and pulse heatmaps.
- **Deep GitHub Integration**:
  - 1-click **GitHub OAuth** connection per team or instance-wide via Team Settings → Git.
  - Project **GitHub Hub** (`/[team]/[project]/github`) with Pull Requests, Branches, Commits, and Bulk GitHub Issues Import.
  - 1-click **Create Branch** directly from any issue, plus automatic Kanban PR & CI status badges.
- **Teams & Workspaces** — Multi-team organization with role-based permissions, email notifications (SMTP / Resend), passkeys (WebAuthn), and server administration.

---

## Tech Stack

- **Web (`apps/web`)**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **API (`apps/api`)**: Bun, Elysia, Drizzle ORM, Better Auth
- **Database & Storage**: PostgreSQL 17, RustFS (S3-compatible object store for attachments)
- **Containerization**: Docker Compose + multi-stage Alpine builds

---

## Quick Start (Docker Compose)

1. **Create your environment file:**

   ```bash
   cp .env.example .env
   ```

   Generate real secrets for `BETTER_AUTH_SECRET` and `APP_ENCRYPTION_KEY`:

   ```bash
   openssl rand -base64 32
   ```

   Update `API_URL` and `APP_URL` in `.env` for your host/domain (defaults to `http://localhost:3010` and `http://localhost:3001`).

2. **Build and start the stack:**

   ```bash
   docker compose up -d --build
   ```

   Docker starts `postgres`, `minio` (RustFS), `migrate` (database migrations), `api` (`:3010`), and `web` (`:3001`).

3. **Open nGoal:**

   Visit `http://localhost:3001` — the first account you register becomes the instance administrator.

---

## Local Development

```bash
# 1. Start backing services (PostgreSQL + RustFS)
docker compose -f docker-compose.dev.yml up -d

# 2. Install workspace dependencies
bun install

# 3. Apply database migrations
bun run db:migrate

# 4. Run development servers
bun run dev
```

Or run the interactive setup helper:

```bash
bun run setup
```

---

## GitHub Integration Setup

To enable 1-click GitHub OAuth sign-in and repository sync:

1. Create a GitHub OAuth App with callback URL `<API_URL>/git/oauth/github/callback`.
2. Open **Team Settings → Git**, enter your **Client ID** and **Client Secret**, and save.
3. Click **Connect GitHub**, authorize repositories, and open **Repositories** in **Project Settings** to link a repo to your project.

---

## CI/CD & Production Deployment

nGoal ships with ready-to-use GitHub Actions workflows in [`.github/workflows/`](.github/workflows/):

- **`ci.yml`** — Runs TypeScript checks (`apps/api`, `apps/web`), Next.js production build validation, and Docker build dry-runs on every push to `main` and pull request.
- **`deploy.yml`** — Builds and publishes `ngoal-api` and `ngoal-web` images to GitHub Container Registry (`ghcr.io/<owner>/ngoal-api`, `ghcr.io/<owner>/ngoal-web`) on pushes to `main` or `v*` tags, and optionally deploys to your VPS via SSH.

### Enabling Automated VPS Deployment

On your server, clone `docker-compose.yml` and your configured `.env`, then add these **GitHub Repository Secrets**:

| Secret | Description |
| --- | --- |
| `DEPLOY_HOST` | Server IP or hostname (SSH deploy runs automatically once set) |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | Private SSH key authorized on the server |
| `DEPLOY_PATH` | Absolute directory on the server containing `docker-compose.yml` and `.env` |
| `DEPLOY_PORT` | *(Optional)* SSH port, defaults to `22` |

In production, set in `.env`:

```env
IMAGE_PREFIX=ghcr.io/quanq026/ngoal
VERSION=latest
```

---

## License

Licensed under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See [LICENSE](LICENSE) for full terms.

---

## Credits & Acknowledgments

**nGoal** is an independent project forked from and built upon the open-source codebase of **It's a Plan** by [**croffasia**](https://github.com/croffasia/itsaplan) (licensed under `AGPL-3.0-only`). Huge thanks to the original authors and contributors for laying the architectural foundation.
