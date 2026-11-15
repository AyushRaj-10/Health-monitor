# Privacy-Aware Remote Patient Monitoring System using Edge Computing and IoMT

> **Stage 1**: Project Foundation & Medical SaaS Website UI  
> **Stage 2**: Authentication & Patient Management (Current Stage)  
> Academic Mini-Project in Internet of Medical Things (IoMT), Edge Computing, and Differential Privacy.

---

## 🏥 Project Overview

Continuous physiological surveillance in centralized Remote Patient Monitoring (RPM) architectures exposes sensitive patient vitals to data interception, server-side deanonymization risks, and high cloud transmission latency. 

This project implements a **Privacy-Aware Remote Patient Monitoring System** combining:
1. **Secure Authentication & RBAC**: JWT Access Tokens, HttpOnly Cookie Refresh Tokens with session rotation, and Role-Based Access Control (`ADMIN`, `DOCTOR`, `NURSE`).
2. **Patient Management Subsystem**: Full CRUD operations with PostgreSQL, Prisma ORM, input validation (Zod), pagination, and search.
3. **IoMT Wearable Telemetry Ingestion**: Continuous biometrics (Heart Rate, SpO2, Blood Pressure, Respiration, Temperature).
4. **Edge Computing Preprocessing**: Decentralized edge gateways performing local anomaly detection (<25ms) and data minimization (saving ~78% bandwidth).
5. **Local Differential Privacy ($\epsilon, \delta$-DP)**: Laplace perturbation mechanism bounded by privacy loss budgets ($\epsilon=0.5$), ensuring mathematical privacy guarantees.

---

## 🧱 Repository Structure

```
.
├── frontend/                     # React + Vite + TypeScript Clinical Web Application
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # In-memory token & silent refresh session provider
│   │   ├── components/           # Reusable UI components
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.tsx # Route guard enforcing authentication & roles
│   │   │   ├── layout/           # Sidebar, Navbar, PageHeader, MainLayout
│   │   │   ├── common/           # StatCard, StatusBadge, LoadingState, EmptyState, ErrorState
│   │   │   ├── patients/         # PatientTable, CreatePatientModal, EditPatientModal
│   │   │   ├── charts/           # HeartRateChart, SpO2Chart, MultiVitalChart
│   │   │   └── alerts/           # AlertItemComponent
│   │   ├── pages/                # All 10 Application Pages
│   │   │   ├── Login.tsx         # Real PostgreSQL login with quick seeded role switcher
│   │   │   ├── Dashboard.tsx     # Real patient counts & live telemetry roster
│   │   │   ├── Patients.tsx      # Real PostgreSQL patient list, pagination, search & CRUD
│   │   │   ├── PatientDetails.tsx# Real single-patient medical chart from PostgreSQL
│   │   │   ├── LiveMonitoring.tsx# Multi-patient synchronized live telemetry wall
│   │   │   ├── Alerts.tsx        # Clinical triage & acknowledgment center
│   │   │   ├── Analytics.tsx     # Edge bandwidth savings & anomaly statistics
│   │   │   ├── PrivacyDashboard.tsx # Differential privacy (ε, δ) & compliance monitor
│   │   │   ├── AuditLogs.tsx     # Hash-chained immutable access logs
│   │   │   └── Settings.tsx      # Edge thresholds, ε-budget sliders, sensor rates
│   │   ├── types/
│   │   │   ├── auth.ts           # User, Role, and LoginResponse types
│   │   │   ├── patient.ts        # BackendPatient, Pagination, and Input types
│   │   │   └── index.ts          # Core domain telemetry interfaces
│   │   ├── services/
│   │   │   └── api.ts            # Axios with interceptors, in-memory token, and API methods
│   │   ├── App.tsx               # Protected React Router tree
│   │   └── main.tsx              # Application mount with AuthProvider & QueryClientProvider
│   ├── tailwind.config.js        # Medical dark teal/black (#050B0A) theme
│   └── vite.config.ts            # Vite bundler, proxy to backend & code splitting
│
├── backend/                      # Node.js + Express + Prisma ORM Backend API
│   ├── prisma/
│   │   ├── schema.prisma         # Models: User, RefreshToken, Patient, EdgeDevice, Vital, Alert
│   │   └── seed.js               # Database seed script (Bcrypt users & 7 initial patients)
│   ├── src/
│   │   ├── config/               # Environment & Prisma client configuration
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Login, refresh token, logout, me, register-doctor
│   │   │   └── patient.controller.js # Patient CRUD, pagination, search, doctor assignment
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js    # authenticateToken, requireRole('ADMIN', ...)
│   │   │   └── error.middleware.js   # Centralized error handling & 404 handler
│   │   ├── routes/
│   │   │   ├── auth.routes.js        # /api/auth routes with rate limiting
│   │   │   ├── patient.routes.js     # /api/patients protected CRUD endpoints
│   │   │   └── health.routes.js      # /api/health diagnostics
│   │   ├── utils/
│   │   │   └── token.js              # Access token, random refresh token, SHA-256 hash
│   │   ├── validations/
│   │   │   ├── auth.validation.js    # Zod schemas for login and registerDoctor
│   │   │   └── patient.validation.js # Zod schemas for createPatient and updatePatient
│   │   ├── app.js                    # Express setup with Helmet, CORS, CookieParser
│   │   └── index.js                  # Server entry point with graceful shutdown
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

## 🔐 Database Models (Prisma)

### 1. `User` Model
```prisma
model User {
  id            String            @id @default(uuid())
  name          String
  email         String            @unique
  passwordHash  String
  role          Role              @default(DOCTOR) // ADMIN, DOCTOR, NURSE
  isActive      Boolean           @default(true)
  department    String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  patients      Patient[]         @relation("DoctorPatients")
  refreshTokens RefreshToken[]
}
```

### 2. `Patient` Model
```prisma
model Patient {
  id                 String        @id @default(uuid())
  patientCode        String        @unique
  name               String
  dateOfBirth        DateTime
  gender             String
  contactInformation String?
  assignedDoctorId   String?
  assignedDoctor     User?         @relation("DoctorPatients", fields: [assignedDoctorId], references: [id], onDelete: SetNull)
  medicalHistory     String?
  condition          String?       @default("Under Observation")
  riskLevel          RiskLevel     @default(LOW)
  roomOrLocation     String?
  status             PatientStatus @default(ACTIVE)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}
```

### 3. `RefreshToken` Model (Secure Session Rotation)
```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  tokenHash String    @unique      // Stored as SHA-256 hash (never plaintext)
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId])
  @@index([expiresAt])
}
```

---

## 🔑 Seeded Demo Credentials (PostgreSQL)

| Role | Name | Email | Password | Access Rights |
|---|---|---|---|---|
| **ADMIN** | Dr. Gregory House, MD | `admin@iomt-health.org` | `Admin123!` | Full admin privileges, Doctor registration (`/api/auth/register-doctor`), Patient CRUD |
| **DOCTOR** | Dr. Elena Vance, MD | `dr.vance@iomt-health.org` | `Doctor123!` | Patient CRUD, Telemetry inspection, Clinical notes |
| **DOCTOR** | Dr. Aris Thorne, MD | `dr.thorne@iomt-health.org` | `Doctor123!` | Patient CRUD, Telemetry inspection |
| **NURSE** | Sarah Davis, RN | `nurse.davis@iomt-health.org` | `Nurse123!` | Patient viewing, Enrollment, Telemetry monitoring |

*(The Login UI includes one-click selector buttons to populate any of these accounts).*

---

## 📡 API Reference

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate Limited) | Validates email & password, sets HttpOnly refresh cookie, returns short-lived access JWT |
| `POST` | `/api/auth/refresh-token` | Public (Requires Cookie) | Verifies refresh cookie, rotates token in DB, issues new access token |
| `POST` | `/api/auth/logout` | Authenticated | Revokes refresh token in DB, clears HttpOnly cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated clinician profile |
| `POST` | `/api/auth/register-doctor` | **ADMIN Only** | Registers new doctor/staff with hashed password (no public registration of privileged accounts) |
| `GET` | `/api/auth/doctors` | Authenticated | Returns active doctors for assignment dropdowns |

### Patient Management Endpoints (`/api/patients`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/patients` | Authenticated | Paginated patient list with query filters (`page`, `limit`, `search`, `riskLevel`, `gender`, `status`) |
| `POST` | `/api/patients` | `ADMIN`, `DOCTOR`, `NURSE` | Validates input (Zod), verifies unique `patientCode`, assigns doctor, creates record |
| `GET` | `/api/patients/:id` | Authenticated | Retrieves single patient record with assigned doctor details |
| `PATCH` | `/api/patients/:id` | `ADMIN`, `DOCTOR`, `NURSE` | Updates patient clinical info, status, or doctor assignment |
| `DELETE` | `/api/patients/:id` | `ADMIN` or Assigned `DOCTOR` | Permanently deletes patient medical record |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v22.11.0)
- **PostgreSQL**: Running locally on port 5432 or via Docker

---

### 2. Database Setup & Migration

Ensure PostgreSQL is running, then run:
```bash
cd backend
# Push schema to PostgreSQL database
npx prisma db push

# Seed initial users (with Bcrypt hashing) and patients
node prisma/seed.js
cd ..
```

---

### 3. Running the Entire System

Run both backend and frontend concurrently from the root directory:
```bash
npm run dev
```

Or run individually:
- **Backend API**: `cd backend && npm run dev` (Port 5001)
- **Frontend App**: `cd frontend && npm run dev` (Port 5173)

---

## 🛡️ Security Features Implemented

1. **No Plaintext Passwords**:
   - All passwords hashed using `bcrypt` (10 salt rounds).
   - Password hashes are never exposed in user API responses.
2. **Token Security**:
   - Access tokens are short-lived (15 minutes).
   - Access tokens are stored **in React memory only** (`api.ts`), never written to `localStorage` or `sessionStorage` (preventing XSS persistence).
   - Refresh tokens are transmitted exclusively inside secure, `HttpOnly`, `SameSite` cookies with restricted path `/api/auth`.
   - Refresh tokens are stored in the database as SHA-256 hashes with automated session rotation upon every refresh.
3. **Strict Authorization & Route Protection**:
   - Frontend routes (`/dashboard`, `/patients`, `/patients/:id`, etc.) are guarded by `<ProtectedRoute />`.
   - Unauthenticated users are redirected to `/login`.
   - Backend APIs reject unauthorized requests with `401 Unauthorized` and `403 Forbidden`.
4. **Input Validation**:
   - All authentication and patient payloads validated using strict Zod schemas.
5. **Rate Limiting**:
   - Express rate limiting active on `/api/auth/login` and `/api/auth/refresh-token` (30 requests / 15 minutes).
