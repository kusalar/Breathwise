# BreatheWise AI

> **Breathe Smarter. Live Healthier. Breathe Better.**

BreatheWise AI is a production-grade, GenAI-powered environmental health and sustainability assistant engineered to help families and communities navigate severe winter smog and urban air pollution. The platform translates atmospheric science and multi-pollutant telemetry into low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to location and lifestyle.

---

## Architecture & Production Stack

| Layer | Technologies | Details |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React 18, Server & Client Components, Turbopack |
| **Language** | TypeScript (Strict Mode) | Zero `any` policy, strict type safety |
| **AI Integration** | Google Gemini (`@google/genai` v3.6.1) | Primary: `gemini-3.8-flash`, Fallback: `gemini-3.5-flash-lite`, Deterministic local fallback |
| **Environmental Telemetry** | Open-Meteo Air Quality & Weather APIs | Copernicus CAMS & ECMWF models, CPCB-breakpoint-based indicative index |
| **Authentication & Database** | Firebase Authentication & Cloud Firestore | Firebase Spark Plan ($0.00 ceiling), region: `asia-south1`, Firebase Admin SDK |
| **Styling** | Tailwind CSS 3.4 | Climate-tech design tokens, Lucide icons, Dark/Light theme |
| **Validation** | Zod v4 | Runtime schema validation for query params, payloads & data |
| **Caching & Rate Limiting** | In-Memory Server TTL Cache | 15-minute sliding TTL cache with IP/User sliding-window rate limiters |
| **Testing** | Vitest 5 & Playwright | 287 unit/integration tests, 28 browser E2E tests (Desktop & Mobile) |
| **Deployment** | Vercel | Production edge CDN, automated HTTPS, environment segregation |

---

## Key Features

1. **Environmental Air Quality & Weather Telemetry**:
   - Real-time multi-pollutant tracking: $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, and $\text{O}_3$.
   - CPCB-breakpoint-based indicative sub-index calculations adhering to Indian National Air Quality Index (NAQI) technical standards.
   - Transparent disclosure distinguishing model-based indicative calculations from 24-hour continuous regulatory CAAQMS station reporting.
   - Missing-pollutant handling with explicit unavailable indicators (`N/A`) rather than assuming zero values.

2. **Multi-Model AI Failover Architecture**:
   - Primary model: `gemini-3.8-flash` for high-fidelity reasoning, prompt expansion, and personalized health recommendations.
   - Secondary model: `gemini-3.5-flash-lite` for instantaneous failover under rate limits or high-latency scenarios.
   - Deterministic offline fallback engine providing scientifically grounded recommendations even during API disruptions or offline mode.

3. **Family & Household Protection**:
   - Sensitive group vulnerability mapping (children, elderly, respiratory, cardiovascular).
   - Dynamic exposure mitigation strategies, N95/HEPA filtration advice, and ventilation scheduling.

4. **Dynamic Low-Emission Daily Routines**:
   - Location-specific ventilation window identification using dispersion forecasts and wind vectors.
   - Diurnal smog peak avoidance for exercise and commute planning.

5. **Sustainability Accounting & Impact Tracking**:
   - Evidence-based carbon offset computations backed by empirical research (CRRI 2018, NEERI 2016, CEA 2024, BEE 2021).
   - Real-time tracking of avoided emissions from public transport, active mobility, and energy conservation.

6. **Medical Safety Boundaries & Guardrails**:
   - Non-diagnostic clinical safety boundaries with automatic triage and emergency redirection (112/102 in India).

---

## Installation & Setup

### Prerequisites

- Node.js `v20.x` or higher (tested on Node `v22.17.0`)
- npm `v10.x` or higher

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/kusalar/Breathwise.git
cd Breathwise
npm install
```

### 2. Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
# Application Configuration
NEXT_PUBLIC_APP_NAME="BreatheWise AI"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_ENV="production"

# Google Gemini API (Server-side)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_FALLBACK_MODEL="gemini-3.5-flash-lite"

# Firebase Client Configuration (Spark Plan Compatible)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="breathewise-ai-536e4.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="breathewise-ai-536e4"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID="breathewise-ai-536e4"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@breathewise-ai-536e4.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

*Note: BreatheWise AI runs out-of-the-box in secure fallback mode even without external API credentials.*

---

## Quality & Verification Commands

| Command | Action | Baseline Status |
|---|---|---|
| `npm run typecheck` | TypeScript strict type-check (`tsc --noEmit`) | 0 errors |
| `npm run lint` | ESLint 9 verification across all source files | 0 warnings |
| `npm run test` | Vitest unit & integration test suites | 287 passing (100%) |
| `npm run test:e2e` | Playwright end-to-end browser tests | 28 passing (Chromium & Mobile) |
| `npm run build` | Compiles production Next.js build | 34 routes verified |
| `npm run start` | Starts optimized production server | Production ready |

---

## License

This project is released under the [MIT License](LICENSE).
