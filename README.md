# 🔐 LegacyLock — Zero-Knowledge Digital Inheritance Platform

LegacyLock is a secure, automated digital legacy and asset handover platform. It allows users to store sensitive credentials, legal documents, and digital assets in an end-to-end encrypted vault. In the event of prolonged inactivity or demise, an automated heartbeat check-in system safely initiates a multi-stage escalation protocol to transfer designated digital assets to trusted nominees.

---

## 🌟 Key Features

1. **Zero-Knowledge Client-Side Cryptography**
   - AES-256-GCM encryption with PBKDF2 key derivation (600,000 iterations).
   - Data Encryption Keys (DEK) are wrapped client-side; plaintext credentials never reach the server.
   - Emergency recovery kits with cryptographic shards.

2. **Automated Heartbeat & Inactivity Check-In**
   - Configurable check-in cadence (30 / 60 / 90 days) with customizable grace periods.
   - Multi-channel notification dispatch (Email, SMS, Push).
   - Idempotent confirmation endpoints and pause/resume capabilities.

3. **Escalation & Claims Verification Pipeline**
   - Multi-stage state machine: Active → Grace Period → Contact Verification → Review → Release.
   - Nominee management with SHA-256 invitation tokens.
   - Claim submission with simulated AI OCR for automated death certificate and identity verification.

4. **Multi-Party Controlled Asset Release**
   - Configurable release policies and approval thresholds.
   - Time-limited, watermarked, single-use download tokens.
   - Comprehensive, tamper-evident audit logging for every action.

---

## 🏗️ Architecture

- **Frontend**: 51 responsive, production-styled UI views built with HTML5, TailwindCSS, Material Icons, and vanilla JavaScript (`app.js`, `crypto.js`).
- **Backend**: NestJS (TypeScript strict mode) with modular clean architecture.
- **Database & Persistence**:
  - **Prisma ORM** with PostgreSQL 16 schema (12 models).
  - **Resilient Fallback Mode**: When running without an active PostgreSQL/Docker instance, an intelligent in-memory JSON persistence engine (`dev-storage.json`) ensures seamless local execution and evaluation.

---

## 📂 Project Structure

```
locklegacy/
├── DOC-20260830-WA0017/          # 51 Frontend Views & Client-side Crypto
│   ├── app.js                   # Application Controller & API Bridge
│   ├── crypto.js                # Web Crypto API (AES-GCM / PBKDF2)
│   ├── index.html               # Landing & Welcome
│   ├── sign-in.html             # User Authentication
│   ├── encrypted-vault.html     # Vault Records & Categorization
│   ├── check-in-policy.html     # Heartbeat Scheduling
│   └── ...                      # Nominees, Dossier, Claims, Audit views
├── backend/                     # NestJS API Server
│   ├── src/
│   │   ├── auth/                # JWT Auth, Bcrypt, Registration
│   │   ├── vault/               # Encrypted Record CRUD & Key Envelope
│   │   ├── checkin/             # Policy, Confirmation, Pause/Resume
│   │   ├── nominee/             # Trusted Persons & Token Dispatch
│   │   ├── claim/               # Claim Submission & Dossier
│   │   ├── ai/                  # OCR Extraction & Verification
│   │   ├── release/             # Multi-party Approval & Watermarked Tokens
│   │   ├── audit/               # Immutable Security Audit Logging
│   │   ├── notification/        # Notification Dispatcher
│   │   ├── prisma/              # Resilient Database Service
│   │   └── common/              # Pipes, Guards, Decorators
│   ├── prisma/schema.prisma     # 12 Data Models
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml           # PostgreSQL 16 & Redis 7 stack
├── start.bat                    # 1-Click Windows Batch Launcher
├── start.ps1                    # 1-Click Windows PowerShell Launcher
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- (Optional) [Docker](https://www.docker.com/) for PostgreSQL + Redis

### Option 1: One-Click Startup (Windows)
Double-click `start.bat` or execute in PowerShell:
```powershell
.\start.ps1
```
This automatically starts the backend server on `http://localhost:3000` and launches the frontend UI.

### Option 2: Manual Setup

1. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start the Backend API**:
   ```bash
   npm run build
   npm run start:dev
   ```
   The API will be available at `http://localhost:3000/api/v1`.

4. **Launch the Frontend**:
   Open `DOC-20260830-WA0017/index.html` in your browser or serve using a static file server:
   ```bash
   npx serve DOC-20260830-WA0017
   ```

---

## 🧪 Verified API Endpoints

All core flows are covered and verified end-to-end:

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Register new user with hashed password |
| **Auth** | `POST` | `/api/v1/auth/login` | Authenticate user & return JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Refresh expired access tokens |
| **Vault** | `POST` | `/api/v1/vault/setup` | Store wrapped DEK and salt envelope |
| **Vault** | `POST` | `/api/v1/vault/unlock` | Fetch key material for client decryption |
| **Vault** | `POST` | `/api/v1/vault/records` | Create encrypted vault record |
| **Vault** | `GET` | `/api/v1/vault/records` | List all encrypted user records |
| **Check-In** | `GET` | `/api/v1/checkin/policy` | Retrieve user check-in policy |
| **Check-In** | `POST` | `/api/v1/checkin/confirm` | Idempotent heartbeat confirmation |
| **Nominees** | `POST` | `/api/v1/nominees` | Add trusted nominee/executor |
| **Nominees** | `POST` | `/api/v1/nominees/:id/invite` | Generate SHA-256 invite token |
| **Claims** | `POST` | `/api/v1/claims` | Initiate nominee claim case |
| **Claims** | `POST` | `/api/v1/claims/:id/evidence` | Submit death certificate & run OCR |
| **Release** | `POST` | `/api/v1/release/:id/token` | Issue watermarked download token |

---

## 🔒 Security Specifications

- **Key Derivation**: PBKDF2 with SHA-256 and 600,000 iterations.
- **Symmetric Encryption**: AES-GCM 256-bit with unique 96-bit initialization vectors (IVs).
- **Authentication**: Stateless JSON Web Tokens (JWT) with secure HTTP-only cookie support.
- **Audit Trails**: Non-repudiation logging storing actor identity, timestamps, IP metadata, and operation outcomes.

---

## 📄 License
Proprietary / Academic Project — Developed for LegacyLock Platform Demonstration.
