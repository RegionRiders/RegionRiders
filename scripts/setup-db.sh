#!/bin/bash

# Database Setup Script
# Sets up the PostgreSQL database for RegionRiders

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

success() {
    echo -e "${GREEN}SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

error() {
    echo -e "${RED}ERROR:${NC} $1"
}

# Header
echo ""
echo "RegionRiders Database Setup"
echo "============================"
echo ""

# Check if Docker is installed
info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    error "Docker is not installed!"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
success "Docker found"

# Check if Docker Compose is available
info "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose is not installed!"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
success "Docker Compose found"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    warning ".env.local not found. Copying from .env.example..."
    cp .env.example .env.local
    success "Created .env.local"
    echo ""
    warning "Please update the database credentials in .env.local before continuing."
    echo "        Especially: POSTGRES_PASSWORD"
    echo ""
    read -p "Press Enter to continue after updating .env.local..."
fi

# Start PostgreSQL container
info "Starting PostgreSQL container..."
yarn db:up

echo ""
info "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is responding
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-regionriders_user} > /dev/null 2>&1; then
        success "PostgreSQL is ready!"
        break
    fi

    attempt=$((attempt + 1))
    echo "   Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    error "PostgreSQL failed to start within the expected time"
    exit 1
fi

# Install dependencies
echo ""
info "Installing dependencies..."
yarn install

# Apply database schema
echo ""
info "Generating and applying database schema..."
yarn db:push

# Success message
echo ""
success "Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the development server: yarn dev"
echo "  2. Open Drizzle Studio: yarn db:studio"
echo "  3. Run tests: yarn test"
echo ""
echo "Useful commands:"
echo "  • View database logs: docker-compose logs -f postgres"
echo "  • Stop database: yarn db:down"
echo "  • Reset database: yarn db:reset"
echo ""

