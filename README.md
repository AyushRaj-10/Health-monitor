# Privacy-Aware Remote Patient Monitoring System using Edge Computing and IoMT

> **Stage 1: Project Foundation & Medical SaaS Website UI**  
> Academic Mini-Project in Internet of Medical Things (IoMT), Edge Computing, and Differential Privacy.

---

## 🏥 Project Overview

Continuous physiological surveillance in centralized Remote Patient Monitoring (RPM) architectures exposes sensitive patient vitals to data interception, server-side deanonymization risks, and high cloud transmission latency. 

This project implements a **Privacy-Aware Remote Patient Monitoring System** combining:
1. **IoMT Wearable Telemetry Ingestion**: Continuous biometrics (Heart Rate, SpO2, Blood Pressure, Respiration, Temperature).
2. **Edge Computing Preprocessing**: Decentralized edge gateways (e.g., Raspberry Pi 4 / hospital telemetry hubs) performing local anomaly detection (<25ms) and data minimization (saving ~78% bandwidth).
3. **Local Differential Privacy ($\epsilon, \delta$-DP)**: Laplace perturbation mechanism bounded by privacy loss budgets ($\epsilon=0.5$), ensuring mathematical privacy guarantees against adversary reconstruction.
4. **Decentralized Audit & Cryptography**: AES-256-GCM / TLS 1.3 end-to-end security with immutable cryptographic audit logging.

---

## 🧱 Repository Structure

```
.
├── frontend/                     # React + Vite + TypeScript Clinical Web Application
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── layout/           # Sidebar, Navbar, PageHeader, MainLayout
│   │   │   ├── common/           # StatCard, StatusBadge, LoadingState, EmptyState, ErrorState
│   │   │   ├── patients/         # PatientTable, PatientCard
│   │   │   ├── charts/           # HeartRateChart, SpO2Chart, MultiVitalChart
│   │   │   └── alerts/           # AlertItemComponent
│   │   ├── pages/                # All 10 Application Pages
│   │   │   ├── Login.tsx         # Clinician & staff sign-in with quick role selector
│   │   │   ├── Dashboard.tsx     # Medical SaaS telemetry command center
│   │   │   ├── Patients.tsx      # Patient directory with risk filtering & search
│   │   │   ├── PatientDetails.tsx# In-depth biometric inspection & edge telemetry
│   │   │   ├── LiveMonitoring.tsx# Multi-patient synchronized live telemetry wall
│   │   │   ├── Alerts.tsx        # Clinical triage & acknowledgment center
│   │   │   ├── Analytics.tsx     # Edge bandwidth savings & anomaly statistics
│   │   │   ├── PrivacyDashboard.tsx # Differential privacy (ε, δ) & compliance monitor
│   │   │   ├── AuditLogs.tsx     # Hash-chained immutable access logs
│   │   │   └── Settings.tsx      # Edge thresholds, ε-budget sliders, sensor rates
│   │   ├── data/                 # Comprehensive clinical IoMT mock datasets
│   │   ├── types/                # Strict TypeScript domain interfaces
│   │   ├── services/             # Axios instance & TanStack Query configuration
│   │   ├── App.tsx               # React Router routes
│   │   └── main.tsx              # Application mount & Providers
│   ├── tailwind.config.js        # Medical dark teal/black (#050B0A) theme
│   └── vite.config.ts            # Vite bundler, proxy to backend & code splitting
│
├── backend/                      # Node.js + Express + Prisma ORM Backend API
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL schema (User, Patient, EdgeDevice, Vital, Alert, Audit)
│   │   └── seed.js               # Initial database seed script
│   ├── src/
│   │   ├── config/               # Environment & Prisma client configuration
│   │   ├── routes/               # Express endpoints (GET /api/health)
│   │   ├── middlewares/          # Centralized error handling & 404 handler
│   │   ├── app.js                # Express app setup (Helmet, CORS, Morgan)
│   │   └── index.js              # Server entry point with graceful shutdown
│   ├── .env                      # Active server & DB environment configuration
│   └── .env.example              # Environment variables template
│
├── edge/                         # Edge Computing & Differential Privacy Module
│   ├── config/edge-node.json     # Edge node hardware & privacy configuration
│   ├── src/edge-processor.js     # Laplace DP noise generation & edge pre-filtering
│   └── README.md                 # Edge computing architecture documentation
│
├── docker-compose.yml            # PostgreSQL 16 container setup
└── package.json                  # Root runner scripts (concurrent dev)
```

---

## 🎨 UI & Design Architecture

The user interface implements a **premium, dark teal medical SaaS theme**:
- **Background**: `#050B0A` (Deep surgical black/teal)
- **Surfaces & Cards**: `#0B1514`, `#10211F`, `#162E2A`
- **Borders**: `#193833`, `#254E47`
- **Accents**: Emerald (`#10b981`), Teal (`#14b8a6`), Cyan (`#06b6d4`)
- **Semantic Badges**:
  - Critical / High Risk: Rose (`#f43f5e`)
  - Warning / Attention: Amber (`#f59e0b`)
  - Normal / Stable: Emerald (`#10b981`)
  - Edge / Encrypted: Teal (`#14b8a6`)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v22.11.0)
- **PostgreSQL**: Either running locally on port 5432 or via Docker

---

### 2. Database Setup

#### Option A: Using Docker (Fastest)
```bash
docker compose up -d
```

#### Option B: Using Local PostgreSQL
Ensure PostgreSQL is running and a database named `iomt_rpm` exists:
```bash
createdb iomt_rpm
```

Verify your connection string in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iomt_rpm?schema=public"
```

Push the Prisma schema and seed initial records:
```bash
cd backend
npx prisma db push
node prisma/seed.js
cd ..
```

---

### 3. Running the Entire System

From the project root:
```bash
# Run both Backend API and Frontend concurrently
npm run dev
```

Or run each service individually:

#### Terminal 1 — Backend API
```bash
cd backend
npm run dev
# Running on http://localhost:5001
# Health check: http://localhost:5001/api/health
```

#### Terminal 2 — Frontend Clinical Portal
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

#### Terminal 3 — Edge Simulator (Optional Test)
```bash
cd edge
npm run simulate
```

---

## 🩺 Endpoints & Routes

### Backend API
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root API project metadata |
| `GET` | `/api/health` | Comprehensive health check: uptime, PostgreSQL status, latency, memory usage, and edge subsystem status |

#### Sample Response (`GET /api/health`):
```json
{
  "status": "healthy",
  "service": "Privacy-Aware Remote Patient Monitoring System API",
  "version": "1.0.0",
  "timestamp": "2026-11-15T12:55:22.608Z",
  "uptime": { "seconds": 45, "formatted": "0h 0m 45s" },
  "database": {
    "status": "connected",
    "provider": "PostgreSQL (Prisma)",
    "latency": "2ms"
  },
  "edgeSubsystem": {
    "status": "ready",
    "architecture": "Decentralized IoMT Edge Gateway",
    "differentialPrivacyEngine": "active",
    "anonymizationMode": "k-anonymity (k=5)"
  }
}
```

### Frontend Routes
| Route | Page Name | Description |
|---|---|---|
| `/login` | **Login Portal** | Role-based clinical authentication (Cardiologist, Nurse, Privacy Officer, Edge Admin) |
| `/dashboard` | **Dashboard** | Total patients, active streams, critical alerts, heart rate chart, SpO2 chart, patient table |
| `/patients` | **Patients** | Roster directory with search, risk filters (Critical, High, Moderate, Low), and grid/table views |
| `/patients/:id` | **Patient Details** | Comprehensive biometrics, IoMT hardware status, edge DP budget, clinician notes |
| `/monitoring` | **Live Monitoring** | Synchronized multi-patient telemetry wall with ECG waveform simulation and edge latency meters |
| `/alerts` | **Alerts** | Clinical triage center with acknowledge and resolve workflows |
| `/analytics` | **Analytics** | Edge bandwidth reduction (78.4% saved), triage latency comparison (14ms vs 385ms), and anomaly distribution |
| `/privacy` | **Privacy Dashboard** | Laplace differential privacy ($\epsilon=0.5$), budget tracking, AES-256-GCM encryption, and HIPAA compliance |
| `/audit-logs` | **Audit Logs** | Immutable, hash-chained access logs with cryptographic signatures |
| `/settings` | **Settings** | Configuration for $\epsilon$ privacy budgets, Laplace/Gaussian mechanisms, anomaly triggers, and buffer retention |

---

## 🛡️ Stage 1 Constraints & Next Stages

In accordance with Stage 1 specifications:
- **Authentication**: UI role selector with demo profiles is implemented; real JWT/OAuth2 authentication will be introduced in subsequent stages.
- **Monitoring Data**: High-fidelity clinical mock datasets are utilized for UI responsiveness and visual validation.
- **Backend API Integration**: Backend foundation, database schema, Prisma connection, and `/api/health` endpoint are fully verified. Telemetry APIs and live WebSocket/MQTT synchronization will connect the frontend in Stage 2.
