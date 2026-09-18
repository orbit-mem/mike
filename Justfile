# Justfile for Mike OSS local development
set shell := ["powershell.exe", "-Command"]

# Default recipe: list available commands
default:
    just --list

# Set up local environment files and install node dependencies
setup: init-env install-deps

# Initialize local environment (.env and backend/.env with generated secrets)
init-env:
    node scripts/init-env.js

# Install node dependencies across root, backend, frontend, and word-addin
install-deps:
    npm install
    npm install --prefix backend
    npm install --prefix frontend
    npm install --prefix word-addin

# Build and start all services via Docker Compose in detached mode
up:
    docker compose up --build -d

# Stop and remove all Docker Compose containers
down:
    docker compose down

# View status of Docker Compose services
status:
    docker compose ps

# Tail Docker Compose logs
logs:
    docker compose logs -f

# Restart Docker Compose services
restart:
    docker compose restart

# Run backend and frontend test suites
test:
    npm test --prefix backend
    npm test --prefix frontend

# Run backend development server locally (outside Docker)
dev-backend:
    npm run dev --prefix backend

# Run frontend development server locally (outside Docker)
dev-frontend:
    npm run dev --prefix frontend

# Run unified development environment (Docker infra + concurrent hot-reloading frontend and backend)
dev:
    node scripts/dev.js

# Build, start, and verify the production Docker stack
prod:
    docker compose -f docker-compose.prod.yml up --build -d
    node scripts/check-prod.js

# Alias for prod
up-prod: prod

# Stop and remove production Docker containers
down-prod:
    docker compose -f docker-compose.prod.yml down

# Check production service health
check-prod:
    node scripts/check-prod.js

# Tail production Docker logs
logs-prod:
    docker compose -f docker-compose.prod.yml logs -f

