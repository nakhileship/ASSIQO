# ASSIQO — Student, Group & Assignment Management System

> **ASSIQO** is a modern, responsive full-stack platform designed for universities and academic bootcamps. It streamlines team formation, OneDrive-based assignment distribution, group-wide submission tracking, and real-time professor analytics.

---

## Table of Contents

- [1. Overview & Key Features](#1-overview--key-features)
  - [Student Experience](#student-experience)
  - [Professor / Admin Experience](#professor--admin-experience)
- [2. Tech Stack](#2-tech-stack)
- [3. Architecture Overview](#3-architecture-overview)
- [4. Database Schema & ER Diagram](#4-database-schema--er-diagram)
- [5. API Reference](#5-api-reference)
- [6. Setup & Run Instructions](#6-setup--run-instructions)
  - [Option A: With Docker Compose (Recommended)](#option-a-with-docker-compose-recommended)
  - [Option B: Local Development Without Docker](#option-b-local-development-without-docker)
  - [Environment Variables](#environment-variables)
- [7. Seeded Demo Credentials](#7-seeded-demo-credentials)
- [8. Key Design Decisions](#8-key-design-decisions)
- [9. Production Deployment Guide](#9-production-deployment-guide)
  - [Database: Neon (Serverless PostgreSQL)](#database-neon-serverless-postgresql)
  - [Backend: Render (Web Service)](#backend-render-web-service)
  - [Frontend: Vercel (Single Page App)](#frontend-vercel-single-page-app)
- [10. Known Limitations & Roadmap](#10-known-limitations--roadmap)

---

## 1. Overview & Key Features

ASSIQO bridges the gap between collaborative coursework and professor grading workflows. Instead of managing chaotic spreadsheets and shared folder links, ASSIQO provides structured group accountability and clear progress visibility.

### Student Experience
- **Dynamic Dashboard (`/dashboard`)**:
  - Live progress bar tracking completed vs. pending group assignments.
  - Interactive status badges: `Pending`, `Submitted`, and `Overdue`.
  - Direct OneDrive submission links that open securely in a new tab (`rel="noopener noreferrer"`).
  - Filter tabs: **All**, **Pending**, and **Submitted**.
  - Un-grouped banner notification redirecting students to group creation if they have not joined a team.
- **Two-Step Submission Confirmation Modal (`SubmitConfirmModal`)**:
  - **Step 1:** Verifies that the student has actually uploaded files to the OneDrive folder.
  - **Step 2:** Explicit group confirmation warning that confirms submission for the entire group.
  - Immediate optimistic UI update with graceful `409 Conflict` resolution if another team member submitted concurrently.
- **My Group Management (`/group`)**:
  - Create a new project group or manage an existing team.
  - Add teammates by email with instant error handling (user not found, user already in a group).
  - Member list with "You" self-identifier tag, role indicators, and join timestamps.
  - Leave group and remove member actions with safety confirmation dialogues.

### Professor / Admin Experience
- **Admin Dashboard (`/admin`)**:
  - 5 high-level KPI cards: Total Students, Total Groups, Total Assignments, Total Confirmed Submissions, and Overall Completion Percentage.
  - Interactive **Recharts** stacked bar chart showing Per-Assignment completion metrics (Confirmed vs. Pending groups) with custom tooltips.
  - Quick action shortcut to create new assignments.
- **Assignment Management (`/admin/assignments`)**:
  - Complete list of assignments with status progress bars and group targeting badges.
  - **Create / Edit Assignment Modal**:
    - Title, description, and datetime-local picker for due dates.
    - Validated OneDrive submission URL input.
    - Scope toggle: **All Students** or **Specific Groups** with interactive group checklist and member counts.
- **Submission Tracking Detail (`/admin/assignments/:id`)**:
  - High-level progress header with overall confirmation percentage.
  - **Group-wise View Tab**: Lists all assigned teams, group members, status badges, who confirmed the submission, and the exact timestamp.
  - **Student-wise View Tab**: Breaks down submission status by individual student, displaying their group name and confirmation status.
  - Real-time search filter (searches by student name, email, or group name) and status filter (**All**, **Confirmed**, **Pending**).
  - Responsive tables with horizontal scroll support on mobile displays.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite | High-performance Single Page Application (SPA) |
| **Routing** | React Router DOM v6 | Protected client-side routing & role guards |
| **Styling** | Tailwind CSS, Inter font | Clean, modern UI with responsive breakpoints |
| **Data Viz** | Recharts | Stacked responsive bar chart for assignment analytics |
| **HTTP Client** | Axios | Configured with Bearer token interceptor and 401 redirect |
| **Backend** | Node.js, Express | Modular RESTful API |
| **Security** | Helmet, Express Rate Limit, CORS | HTTP security headers, anti-abuse rate limits, and origin checks |
| **Database** | PostgreSQL 16 | Relational data persistence with foreign keys and ACID transactions |
| **DB Driver** | `pg` (node-postgres) | Connection pooling with parameterized SQL (no ORM overhead) |
| **Auth** | JSON Web Tokens (JWT), bcryptjs | Stateless authorization with salted password hashing |
| **Validation** | Zod | Strict runtime schema parsing and error handling |
| **DevOps** | Docker, Docker Compose, Nginx | Multi-container reproducible development and production builds |

---

## 3. Architecture Overview

ASSIQO uses a decoupled client-server architecture with stateless token-based authorization and relational data persistence.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        UI["React 18 SPA (Vite + Tailwind CSS)"]
        AuthCtx["AuthContext (JWT in localStorage)"]
        AxiosInt["Axios Interceptor (Bearer Token)"]
    end

    subgraph ReverseProxy ["Web / Reverse Proxy"]
        Nginx["Nginx (Container Port 3000 / Vercel SPA)"]
    end

    subgraph BackendAPI ["Backend Layer (Express on Node.js)"]
        SecMiddleware["Security: Helmet + RateLimiter + CORS"]
        Router["Express Router (/api)"]
        AuthMiddleware["authMiddleware (JWT Verify)"]
        RoleMiddleware["requireRole('admin' | 'student')"]
        ZodValidator["validate(ZodSchema)"]
        Controllers["Controllers (Raw SQL Transactions)"]
    end

    subgraph DataStore ["Database Layer (PostgreSQL 16)"]
        Pool["pg.Pool Connection Pooler"]
        PostgresDB[("ASSIQO PostgreSQL Database\n(Users, Groups, Assignments, Submissions)")]
    end

    UI --> Nginx
    Nginx --> AxiosInt
    AxiosInt -->|REST API Requests| SecMiddleware
    SecMiddleware --> Router
    Router --> AuthMiddleware
    AuthMiddleware --> RoleMiddleware
    RoleMiddleware --> ZodValidator
    ZodValidator --> Controllers
    Controllers --> Pool
    Pool -->|Parameterized Queries & Transactions| PostgresDB
```

---

## 4. Database Schema & ER Diagram

The database consists of 6 relational tables designed with strict integrity constraints, foreign key cascades, and unique composite indexes.

```mermaid
erDiagram
    USERS ||--o{ GROUPS : "creates"
    USERS ||--o{ GROUP_MEMBERS : "belongs to"
    USERS ||--o{ ASSIGNMENTS : "authors (admin)"
    USERS ||--o{ SUBMISSIONS : "confirms"
    
    GROUPS ||--|{ GROUP_MEMBERS : "has"
    GROUPS ||--o{ ASSIGNMENT_GROUPS : "assigned to"
    GROUPS ||--o{ SUBMISSIONS : "submits"
    
    ASSIGNMENTS ||--o{ ASSIGNMENT_GROUPS : "targets"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role "student | admin"
        timestamp created_at
    }

    GROUPS {
        int id PK
        string name
        int created_by FK
        timestamp created_at
    }

    GROUP_MEMBERS {
        int group_id PK, FK
        int user_id PK, FK, UK "1 group per student"
        timestamp joined_at
    }

    ASSIGNMENTS {
        int id PK
        string title
        text description
        timestamp due_date
        text onedrive_link
        boolean assign_to_all
        int created_by FK
        timestamp created_at
    }

    ASSIGNMENT_GROUPS {
        int assignment_id PK, FK
        int group_id PK, FK
    }

    SUBMISSIONS {
        int id PK
        int assignment_id FK
        int group_id FK
        int confirmed_by FK
        timestamp confirmed_at
    }
```

### Table Definitions
1. **`users`**: Stores students and professors. Role is constrained to `('student', 'admin')`. Email is unique and lowercased.
2. **`groups`**: Student project teams created by an initial student.
3. **`group_members`**: Junction table mapping students to groups. The `UNIQUE (user_id)` constraint guarantees that **a student can belong to at most one group at a time**.
4. **`assignments`**: Course tasks created by professors with due dates and OneDrive cloud folders.
5. **`assignment_groups`**: Junction table mapping an assignment to specific groups when `assign_to_all = FALSE`.
6. **`submissions`**: Single source of truth for group submissions. The `UNIQUE (assignment_id, group_id)` constraint guarantees that **each group has exactly one submission record per assignment**.

---

## 5. API Reference

All protected endpoints require an `Authorization: Bearer <JWT>` header.

### Health Probe
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Liveness probe; returns server status and DB connection time |

### Authentication (`/api/auth`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register new student or admin (`name`, `email`, `password`, `role`) |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Login with email and password; returns JWT token and user info |
| `GET` | `/api/auth/me` | Authenticated | Retrieve the authenticated user's profile |

### Groups (`/api/groups`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `POST` | `/api/groups` | Student | Create a new group; user automatically becomes the first member |
| `GET` | `/api/groups/mine` | Student | Retrieve user's current group, member roster, and creator details |
| `POST` | `/api/groups/:id/members` | Student (Group Member) | Add a teammate to the group by student email |
| `DELETE` | `/api/groups/:id/members/:userId` | Student (Group Member) | Remove a teammate or leave group (deletes group if last member leaves) |

### Student Assignments (`/api/assignments`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/assignments` | Student | List assignments assigned to the student's group, with submission status |
| `POST` | `/api/assignments/:id/confirm` | Student (In Group) | Two-step confirmed submission for the user's entire team |

### Admin & Professor Management (`/api/admin`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/analytics` | Admin | Summary KPIs and per-assignment breakdown for stacked bar chart |
| `GET` | `/api/admin/assignments` | Admin | List all assignments with confirmation and pending counts |
| `POST` | `/api/admin/assignments` | Admin | Create assignment (`title`, `description`, `due_date`, `onedrive_link`, `assign_to_all`, `group_ids`) |
| `PUT` | `/api/admin/assignments/:id` | Admin | Update an existing assignment and its assigned group targets |
| `GET` | `/api/admin/groups` | Admin | List all existing student groups for assignment targeting checklist |
| `GET` | `/api/admin/assignments/:id/submissions` | Admin | Deep submission audit with both group-wise and student-wise rosters |

---

## 6. Setup & Run Instructions

### Option A: With Docker Compose (Recommended)

Requires Docker Desktop installed and running.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nakhileship/ASSIQO.git
   cd ASSIQO
   ```

2. **Start all services with Docker Compose:**
   ```bash
   docker compose up --build
   ```

   This boots up 3 isolated services:
   - **PostgreSQL 16** (`assiqo_db`) on port `5432` with auto-seeded demo records.
   - **Express API** (`assiqo_backend`) on port `5000` with live reload.
   - **Nginx + React** (`assiqo_frontend`) on port `3000`.

3. **Access the application:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

4. **Shutdown services:**
   ```bash
   docker compose down
   # Or reset volume and seed data:
   docker compose down -v
   ```

---

### Option B: Local Development Without Docker

#### Prerequisites
- Node.js (v18 or v20+)
- PostgreSQL 14+ installed and running locally

#### 1. Setup Backend
```bash
cd backend
npm install

# Create local environment file
cp .env.example .env
```

Configure `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/assiqo_db
JWT_SECRET=super_secret_development_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000,http://localhost:5173
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

Initialize the database schema and demo seed data:
```bash
# Run schema.sql and seed.sql automatically
npm run db:init

# Start development server with nodemon
npm run dev
```

#### 2. Setup Frontend
```bash
cd ../frontend
npm install

# Create frontend environment file
cp .env.example .env
```

Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Environment Variables

#### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | HTTP port the Express server listens on |
| `DATABASE_URL` | **Required** | — | PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname`) |
| `JWT_SECRET` | **Required** | — | Secret key used for signing and verifying JSON Web Tokens |
| `JWT_EXPIRES_IN` | Optional | `7d` | Token expiration duration |
| `CLIENT_URL` | Optional | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (comma-separated for multi-domain) |
| `NODE_ENV` | Optional | `development` | Setting to `production` enables SSL on PostgreSQL and trust proxy |

#### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | **Required** | `http://localhost:5000/api` | Full base URL for the backend API |

---

## 7. Seeded Demo Credentials

All seeded test users share the password: `password123`

| Name | Email | Role | Initial Group Membership |
|---|---|---|---|
| **Prof. Admin** | `admin@assiqo.dev` | `admin` | *N/A (Professor account)* |
| **Alice Walker** | `alice@assiqo.dev` | `student` | **Team Alpha** (Creator) |
| **Bob Harris** | `bob@assiqo.dev` | `student` | **Team Alpha** (Member) |
| **Carol Danvers** | `carol@assiqo.dev` | `student` | *No Group (Ungrouped)* |
| **Dave Miller** | `dave@assiqo.dev` | `student` | *No Group (Ungrouped)* |

---

## 8. Key Design Decisions

1. **Group-Level Submissions (Single Record per Group & Assignment)**:
   - In group projects, grading and submission state belong to the team, not separate disconnected students.
   - By creating a `submissions` table with a `UNIQUE (assignment_id, group_id)` constraint, confirming a submission marks it for every student in the team instantly. The `confirmed_by` column preserves individual accountability by recording exactly which teammate finalized the submission.

2. **Strict One Group Per Student Policy**:
   - Enforced directly at the database engine level via `UNIQUE (user_id)` on `group_members`.
   - Eliminates split-loyalty edge cases where a student could belong to competing teams on the same assignment.

3. **Stateless JWT Authorization with Role Guard Middleware**:
   - Eliminates server-side session memory overhead.
   - Express route middleware (`authMiddleware` and `requireRole`) verifies the signature and validates roles in linear time, guaranteeing admin endpoints are impenetrable to students.

4. **Two-Step Submission Confirmation Modal**:
   - Prevents accidental one-click submissions. Step 1 forces verification that work was uploaded to the cloud folder. Step 2 requires explicit group-wide confirmation. If two students submit simultaneously, the backend rejects the second request with `409 Conflict`, which the UI handles smoothly without losing state.

5. **Raw SQL with Parameterized Queries (`pg`)**:
   - Instead of heavyweight ORMs that obscure queries, ASSIQO uses standard PostgreSQL queries with parameterized placeholders (`$1, $2`).
   - Guarantees zero SQL injection vulnerabilities, explicit indexing, and clean ACID transaction blocks (`BEGIN`, `COMMIT`, `ROLLBACK`) for multi-write operations like group creation and assignment targeting.

6. **Zod Validation on All Requests**:
   - Schema validation runs before any controller logic executes.
   - Sanitizes inputs (e.g. trimming strings, lowercasing emails, URL validation for OneDrive links) and provides predictable `{ error: "message" }` responses.

---

## 9. Production Deployment Guide

### Database: Neon (Serverless PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) and create a project named `assiqo-db`.
2. Copy the Connection String (starts with `postgresql://...`).
3. Ensure SSL mode is enabled (Neon provides `?sslmode=require`).
4. Run migrations and seeds against your Neon database from your local machine:
   ```bash
   DATABASE_URL="postgresql://<user>:<password>@<neon-host>/assiqo-db?sslmode=require" npm run db:init
   ```

### Backend: Render (Web Service)
1. Sign up at [render.com](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository `nakhileship/ASSIQO`.
3. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Neon connection string)*
   - `JWT_SECRET`: *(A secure 64-character random string)*
   - `CLIENT_URL`: `https://your-assiqo-frontend.vercel.app`
5. Click **Deploy**. Note your backend URL (e.g., `https://assiqo-backend.onrender.com`).

### Frontend: Vercel (Single Page App)
1. Sign up at [vercel.com](https://vercel.com) and click **Add New > Project**.
2. Select your `ASSIQO` repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_URL`: `https://assiqo-backend.onrender.com/api`
5. The included `vercel.json` and `public/_redirects` automatically rewrite all routes to `/index.html` to support client-side React Router navigation.
6. Click **Deploy**.

---

## 10. Known Limitations & Roadmap

While ASSIQO fulfills all core requirements for group coursework tracking, future iterations will introduce:
- **Email Invitations & Notifications**: Real-time email dispatch (SendGrid / Resend) notifying students when an assignment is posted or when a teammate confirms submission.
- **Direct File Upload & Storage**: S3 / Azure Blob Storage integration with file type verification and antivirus scanning alongside external OneDrive links.
- **Admin Invite Tokens**: Restrict admin account creation via invite codes or domain-based whitelist rather than open role selection during registration.
- **Password Reset**: Self-service forgot-password workflow via time-limited cryptographically secure tokens.
- **Real-Time Websocket Updates**: Socket.io or SSE integration for live dashboard updates when submissions or team memberships change.
