# StockBuddy

A South African educational investing platform for paper trading and portfolio building. Focus on clarity, compliance, and growth of financial literacy.

## 🎯 Features

- **Educational Focus**: Paper trading only, no real money
- **South African Market**: JSE Top 40, ETFs, REITs
- **Portfolio Simulation**: Performance tracking vs inflation
- **Compliance**: Clear disclaimers throughout
- **Mobile-First**: Responsive design
- **Curated Baskets**: Model portfolios for different goals
- **Financial Literacy**: Built-in learning resources

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite works for development)

### Installation

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd stockbuddy
   ```

2. **Install dependencies:**
   ```bash
   # Install all dependencies
   npm run install:all
   
   # Or install separately:
   npm run install:backend  # Python dependencies
   npm run install:frontend # Node.js dependencies
   ```

3. **Seed the database:**
   ```bash
   npm run seed
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```
   
   This runs:
   - Frontend: http://localhost:8000
   - Backend: http://localhost:5000

## 📁 Project Structure

```
stockbuddy/
├── frontend/          # React + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main application pages
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Static assets
│   └── package.json
├── backend/           # Flask + SQLAlchemy + Alembic
│   ├── app/            # Application modules
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   ├── migrations/      # Database migrations
│   ├── seeds/           # Data seeding scripts
│   ├── app.py           # Main Flask application
│   ├── models.py        # Database models
│   └── requirements.txt
├── tests/             # E2E tests with Playwright
├── data/              # Seed CSVs for JSE tickers, CPI
└── README.md
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#0ea5e9) - Trust and stability
- **Success**: Green (#22c55e) - Positive returns
- **Danger**: Red (#ef4444) - Losses and warnings
- **Warning**: Yellow (#f59e0b) - Cautions and alerts

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, accessible contrast

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Primary (blue), Secondary (gray), Success (green), Danger (red)
- **Forms**: Clean inputs with focus states
- **Charts**: Chart.js with consistent styling

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `POST /api/onboarding` - Complete user onboarding
- `GET /api/instruments` - List instruments with filters
- `GET /api/instruments/:symbol` - Get instrument details
- `GET /api/portfolio/:user_id` - Get user portfolio
- `POST /api/portfolio/apply-basket` - Apply model basket
- `POST /api/simulate/performance` - Simulate portfolio performance
- `POST /api/simulate/income` - Simulate income vs inflation
- `POST /api/trade/sim` - Execute paper trade
- `GET /api/baskets` - List model baskets

## 📊 Database Schema

### Core Tables
- **users**: User profiles and preferences
- **instruments**: JSE instruments (ETFs, shares, REITs)
- **prices**: Historical price data
- **baskets**: Curated model portfolios
- **user_portfolios**: User portfolio allocations
- **user_positions**: Paper trading positions
- **user_trades**: Trade history
- **cpi**: Consumer Price Index data

## 🧪 Testing

### E2E Tests
```bash
# Install Playwright
npx playwright install

# Run tests
npx playwright test

# Run tests in headed mode
npx playwright test --headed
```

### Test Coverage
- Onboarding flow completion
- Compliance banner visibility
- Portfolio dashboard functionality
- Paper trading execution

## 🚀 Deployment

### Option 2: Cheapest review setup (Render backend + GitHub Pages frontend)
This approach keeps the Flask API live on Render’s free tier while serving the static React build from GitHub Pages.

1. **Prep the repo**
   - Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL=https://<your-render-app>.onrender.com`.
   - Ensure `render.yaml` stays at the repo root (Render uses it as a blueprint).
   - Commit everything to a public GitHub repo (required for both platforms).

2. **Launch the backend on Render**
   - Create a new Web Service from the GitHub repo and let Render auto-read `render.yaml`.
   - Confirm environment variables: `PYTHONPATH=backend`, `FLASK_APP=backend/app.py`, `FLASK_ENV=production`.
   - In the “Disks” tab, make sure the `/opt/render/project/src/backend/instance` mount (1 GB) exists so SQLite persists.
   - After the first deploy, open a Render shell and seed data: `cd backend && python backfill_prices.py`.

3. **Point the frontend at Render**
   - Update `frontend/.env` with the deployed Render URL.
   - Run `cd frontend && npm install && npm run build` locally to verify API calls succeed via `apiFetch`.

4. **Publish to GitHub Pages**
   - `cd frontend`
   - `npm run deploy` (this builds and pushes `dist/` to the `gh-pages` branch using the `homepage` URL).
   - GitHub will host the static site at `https://derrickmohlala.github.io/stockbuddy`.

5. **Smoke test**
   - Open the GitHub Pages URL, confirm the Network tab shows calls to the Render backend, and walk through Portfolio/Health toggles.

### Production Setup (self-managed VPS)
1. **Environment Variables:**
   ```bash
   export FLASK_ENV=production
   export DATABASE_URL=postgresql://user:pass@host:port/db
   ```

2. **Build Frontend:**
   ```bash
   npm run build
   ```

3. **Run Backend:**
   ```bash
   npm start
   ```

### Docker (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📈 Performance

### Lighthouse Scores (Target)
- **Performance**: ≥ 85
- **Accessibility**: Pass
- **Best Practices**: Pass
- **SEO**: Pass

### Optimization
- Lazy loading for charts
- Image optimization
- Code splitting
- Caching strategies

## 🔒 Compliance & Legal

### Educational Disclaimer
This platform is for educational purposes only. All trading is simulated. Not financial advice.

### Data Privacy
- Local data storage
- No third-party sharing
- User data export available
- GDPR compliant

### Regulatory Compliance
- Educational focus only
- Clear disclaimers throughout
- No real money transactions
- Transparent about simulation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 🎉 Acknowledgments

- EasyEquities for UX inspiration
- JSE for market data
- Stats SA for CPI data
- Open source community

---

**Remember**: This is an educational platform. Always consult qualified financial advisors for real investment decisions.
