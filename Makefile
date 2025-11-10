.PHONY: help install dev seed test build clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing root dependencies..."
	npm install

dev: ## Start development servers
	@echo "Starting development servers..."
	npm run dev

seed: ## Seed the database with sample data
	@echo "Seeding database..."
	cd backend && python seed_instruments.py
	cd backend && python seed_cpi.py
	cd backend && python seed_baskets.py
	cd backend && python backfill_prices.py
	@echo "Database seeded successfully!"

test: ## Run E2E tests
	@echo "Running E2E tests..."
	npx playwright test

test-headed: ## Run E2E tests in headed mode
	@echo "Running E2E tests in headed mode..."
	npx playwright test --headed

build: ## Build frontend for production
	@echo "Building frontend..."
	cd frontend && npm run build

clean: ## Clean up generated files
	@echo "Cleaning up..."
	rm -rf frontend/dist
	rm -rf backend/instance
	rm -rf backend/*.db
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

setup: install seed ## Complete setup (install + seed)
	@echo "Setup complete! Run 'make dev' to start development servers."

check: ## Check if all requirements are met
	@echo "Checking requirements..."
	@python3 --version || (echo "Python 3.10+ required" && exit 1)
	@node --version || (echo "Node.js 18+ required" && exit 1)
	@echo "All requirements met!"
