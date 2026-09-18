# Mike OSS — Local Development & Setup Guide (`setup.md`)

This guide outlines how to configure, develop, and run the entire **Mike OSS** application stack locally using Docker Desktop, npm, and the included `Justfile`.

---

## 1. Architecture: Storage & Databases Explained

When inspecting `docker-compose.yml`, you will notice several storage-related services. Here is how they work together:

| Service | Technology / Image | Purpose & Data Stored |
| :--- | :--- | :--- |
| **`db`** | `supabase/postgres:17.6.1.136` | **The core relational database engine.** PostgreSQL 17 with Supabase `auth` schema, roles, and `pgvector` extension. All relational tables (users, projects, chats) live here. |
| **`db-init`** | `supabase/postgres:17.6.1.136` | **Ephemeral one-shot migration runner.** Uses the `psql` client to run `schema.sql` and migrations, then exits (`restart: "no"`). *It is not a separate database server.* |
| **`storage`** | `rustfs/rustfs:latest` | **S3-compatible Object Storage.** A fast alternative to AWS S3 / MinIO for unstructured binary blobs (uploaded PDFs, DOCX, XLSX files, memory files, workflow assets). |
| **`redis`** | `redis:7-alpine` | **In-memory cache & message broker.** Backs BullMQ job queues for asynchronous document conversion (LibreOffice) and tabular data extraction. |

> **Note**: There is **only one PostgreSQL database** (`db`). The application does not run a duplicate or separate "regular Postgres".

---

## 2. Quick Start: Interactive Development Mode

If you are developing or testing features and want **instant hot-reloading** for both frontend and backend:

### Step 1: Initialize Environment & Dependencies
```bash
just setup
# or: npm run setup && npm install
```

### Step 2: Run Development Mode
```bash
just dev
# or: npm run dev
```

**What `just dev` does:**
1. Verifies that Docker Desktop is running.
2. Automatically boots the background infrastructure in Docker (`db`, `auth`, `rest`, `gateway`, `storage`, `redis`, `mailpit`).
3. Concurrently starts the **Express backend** (`tsx watch src/index.ts`) on port 3001 and the **Next.js frontend** (`next dev`) on port 3000.
4. Streams colored, prefixed logs to your terminal with full hot-reloading on save.
5. Cleanly terminates all child processes when you press `Ctrl+C`.

Navigate to **[http://localhost:3000](http://localhost:3000)** to test the live application!

---

## 3. Production Docker: Build, Run & Health Check

To test or deploy the production-ready application stack (optimized Next.js build, production Express API, isolated internal ports, and automated health checks):

### Start Production Stack
```bash
just prod
# or: npm run prod
```

**What this command does:**
1. Builds production images: `mike-frontend:production` and `mike-backend:production`.
2. Starts the production stack using `docker-compose.prod.yml`.
3. Isolates internal ports (database 54322, redis 6379, rustfs console 9001 are closed to the host).
4. Runs `scripts/check-prod.js`, which polls container health checks and verifies:
   - Backend API `/health` endpoint (`{ ok: true }`)
   - Frontend application availability (`http://localhost:3000`)
   - Supabase PostgREST & Auth gateway (`http://localhost:54321/rest/v1/`)
5. Confirms operational status before returning.

### Inspect Production Status & Logs
```bash
just check-prod      # Run health verification
just logs-prod       # View live production logs
just down-prod       # Stop production containers
```

---

## 4. Local Service Endpoints

When running in development (`just dev` / `just up`):

| Service | Local URL / Address | Description & Credentials |
| :--- | :--- | :--- |
| **Web Application** | `http://localhost:3000` | Next.js Frontend |
| **Backend API** | `http://localhost:3001` | Express API (proxied via `http://localhost:3000/api`) |
| **Supabase Gateway** | `http://localhost:54321` | Auth & PostgREST API gateway |
| **Mailpit Inbox** | `http://localhost:8025` | Web inbox capturing local Auth emails |
| **RustFS Console** | `http://localhost:9001` | S3 Storage Console (`rustfsadmin` / `rustfsadmin`) |
| **RustFS S3 Endpoint**| `http://localhost:9000` | S3 Object Storage API |
| **Postgres Database**| `localhost:54322` | Host access (`postgres` / `postgres`, db: `postgres`) |
| **Redis** | `localhost:6379` | BullMQ Job Queue Store |

---

## 5. `Justfile` Command Reference

| Command | Action |
| :--- | :--- |
| `just setup` | Initializes `.env` files, generates secrets, and installs node modules. |
| `just dev` | Runs Docker infra + frontend & backend concurrently with hot-reloading. |
| `just up` | Starts all containerized services via `docker-compose.yml`. |
| `just down` | Stops and removes all development containers. |
| `just status` | Displays container status (`docker compose ps`). |
| `just logs` | Tails live container logs (`docker compose logs -f`). |
| `just prod` | Starts and health-checks the production stack (`docker-compose.prod.yml`). |
| `just down-prod` | Stops production containers. |
| `just check-prod` | Runs automated production health verification script. |
| `just test` | Runs unit/integration test suites across backend and frontend. |

---

## 6. Configuring AI Model Providers

### Cloud LLM Providers (OpenAI, Anthropic, Gemini, OpenRouter)
Edit `backend/.env` (or set via **Settings > API Keys** in the web UI):
```env
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### Local Models via Ollama
1. Install and start [Ollama](https://ollama.com).
2. Pull your model:
   ```bash
   ollama pull llama3.2
   ```
3. Open Mike — models detected by `ollama list` appear automatically under **Local** models.
