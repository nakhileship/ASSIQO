# ASSIQO — Student, Group & Assignment Management System

> **ASSIQO** is a modern, responsive full-stack platform designed for universities and academic bootcamps. It streamlines multi-admin subject assignments, team formation, OneDrive-based distribution, individual and group submission tracking, and real-time professor analytics.

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

ASSIQO bridges the gap between collaborative coursework and professor grading workflows across multiple subjects and academic departments. Instead of managing chaotic spreadsheets and shared folder links, ASSIQO provides structured group accountability and clear progress visibility.

### Student Experience
- **Dynamic Dashboard (`/dashboard`)**:
  - Live progress bar tracking completed vs. pending assignments.
  - Top status pill indicator: **Group: `<name>`** (purple) or **Individual (no group)** (amber) with direct navigation to group management.
  - Each card displays a course **Subject badge** (e.g. *Data Structures*, *Web Development*), the assigned **Professor name**, and submission category (`👥 Group submission` or `👤 Individual submission`).
  - Interactive status badges: `Pending`, `Submitted`, and `Overdue`.
  - Direct OneDrive submission links that open securely in a new tab (`rel="noopener noreferrer"`).
  - Dual filter controls: Status tabs (**All**, **Pending**, **Submitted**) + **Subject dropdown** filter.
- **Two-Step Submission Confirmation Modal (`SubmitConfirmModal`)**:
  - **Step 1:** Verifies that the student has uploaded completed work to the OneDrive folder.
  - **Step 2:** Context-aware confirmation:
    - *For grouped students:* Confirms submission for the entire group with group-wide status updates.
    - *For ungrouped students:* Confirms individual submission recorded directly under the student's ID.
  - Immediate optimistic UI update with graceful `409 Conflict` resolution if another team member submitted concurrently.
- **My Group Management (`/group`)**:
  - Form new project teams or manage existing teammates.
  - Add teammates by email with instant error handling (user not found, user already in a group).
  - Member list with "You" self-identifier tag, role indicators, and join timestamps.
  - Leave group and remove member actions with safety confirmation dialogues.

### Professor / Admin Experience
- **Multi-Admin Subject Isolation**:
  - Professors provide their teaching subject upon registration (e.g. *Data Structures*, *Web Development*).
  - Dashboards, assignments, analytics charts, and tracking rosters automatically scope strictly to the authenticated professor's authored coursework.
- **Admin Dashboard (`/admin`)**:
  - Subject badge prominently displayed in the header.
  - 5 high-level KPI cards: Total Students, Total Groups, Total Assignments, Total Confirmed Submissions, and Overall Completion Percentage.
  - Interactive **Recharts** stacked bar chart showing Per-Assignment completion metrics (Confirmed vs. Pending targets) with custom tooltips.
  - Quick action shortcut to create new assignments.
- **Assignment Management (`/admin/assignments`)**:
  - Complete list of assignments with status progress bars, subject tags, and scope badges.
  - **Create / Edit Assignment Modal**:
    - Title, description, and datetime-local picker for due dates.
    - Validated OneDrive submission URL input.
    - Three-way Assignment Scope:
      1. **All Students**: Available across all active students and groups.
      2. **Specific Groups**: Interactive multi-select checklist of active teams with member counts.
      3. **Specific Students**: Searchable checklist of individual learners with student email and team tags.
- **Dedicated Admin Groups Page (`/admin/groups`)**:
  - Comprehensive directory of all student teams presented in responsive cards.
  - Member list with name, email, member count badges, and formation date.
  - Real-time instant search by team name or student email.
- **Submission Tracking Detail (`/admin/assignments/:id`)**:
  - High-level progress header with overall confirmation percentage.
  - **Group-wise View Tab**: Lists all assigned teams, group members, status badges, who confirmed the submission, and the exact timestamp.
  - **Student-wise View Tab**: Complete student roster with individual submission category (`Group` vs. `Individual`), group name, status, and confirmation timestamps.
  - Real-time search filter and status filter (**All**, **Confirmed**, **Pending**).
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

ASSIQO uses a decoupled client-server architecture with stateless token-based authorization, per-admin role isolation, and relational data persistence.

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
        AuthMiddleware["authMiddleware (JWT Verify & User Load)"]
        RoleMiddleware["requireRole('admin' | 'student')"]
        ZodValidator["validate(ZodSchema)"]
        Controllers["Controllers (Scoped SQL Transactions)"]
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

The database consists of 7 relational tables designed with strict integrity constraints, foreign key cascades, and partial unique indexes for hybrid submission modes.

```mermaid
erDiagram
    USERS ||--o{ GROUPS : "creates"
    USERS ||--o{ GROUP_MEMBERS : "belongs to"
    USERS ||--o{ ASSIGNMENTS : "authors (admin)"
    USERS ||--o{ ASSIGNMENT_STUDENTS : "targeted individually"
    USERS ||--o{ SUBMISSIONS : "confirms / submits"
    
    GROUPS ||--|{ GROUP_MEMBERS : "has"
    GROUPS ||--o{ ASSIGNMENT_GROUPS : "assigned to"
    GROUPS ||--o{ SUBMISSIONS : "submits (group)"
    
    ASSIGNMENTS ||--o{ ASSIGNMENT_GROUPS : "targets groups"
    ASSIGNMENTS ||--o{ ASSIGNMENT_STUDENTS : "targets students"
    ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role "student | admin"
        string subject "admin course (nullable)"
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
        string assign_mode "all | groups | students"
        int created_by FK
        timestamp created_at
    }

    ASSIGNMENT_GROUPS {
        int assignment_id PK, FK
        int group_id PK, FK
    }

    ASSIGNMENT_STUDENTS {
        int assignment_id PK, FK
        int user_id PK, FK
    }

    SUBMISSIONS {
        int id PK
        int assignment_id FK
        int group_id "FK, nullable"
        int user_id "FK, nullable"
        int confirmed_by FK
        timestamp confirmed_at
    }
```

### Table Definitions
1. **`users`**: Stores students and professors. Role is constrained to `('student', 'admin')`. The `subject` column holds the professor's taught discipline (e.g. *Data Structures*).
2. **`groups`**: Student project teams created by an initial student.
3. **`group_members`**: Junction table mapping students to groups. The `UNIQUE (user_id)` constraint guarantees that **a student can belong to at most one group at a time**.
4. **`assignments`**: Course tasks created by professors with due dates, OneDrive cloud folders, and `assign_mode` (`'all'`, `'groups'`, `'students'`).
5. **`assignment_groups`**: Junction table mapping an assignment to target groups when `assign_mode = 'groups'`.
6. **`assignment_students`**: Junction table mapping an assignment to target individual students when `assign_mode = 'students'`.
7. **`submissions`**: Single source of truth for all confirmed submissions.
   - Enforces a CHECK constraint: `(group_id IS NOT NULL AND user_id IS NULL) OR (group_id IS NULL AND user_id IS NOT NULL)`.
   - Partial unique index on `(assignment_id, group_id) WHERE group_id IS NOT NULL` prevents duplicate group submissions.
   - Partial unique index on `(assignment_id, user_id) WHERE user_id IS NOT NULL` prevents duplicate individual submissions.

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
| `POST` | `/api/auth/register` | Public (Rate-limited) | Register student or admin (`name`, `email`, `password`, `role`, `subject` [required for admins]) |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Login with email and password; returns JWT token, user info, and subject |
| `GET` | `/api/auth/me` | Authenticated | Retrieve the authenticated user's profile and subject |

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
| `GET` | `/api/assignments` | Student | List assignments visible to student (mode=all, group assigned, or student assigned), with subject, admin name, submission type, and student context |
| `POST` | `/api/assignments/:id/confirm` | Student | Two-step confirmed submission: group-level if in a group, individual submission if ungrouped |

### Admin & Professor Management (`/api/admin`)
| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/analytics` | Admin | Summary KPIs and per-assignment chart data scoped strictly to this admin's created assignments |
| `GET` | `/api/admin/assignments` | Admin | List assignments authored by the authenticated professor with confirmed/pending counts |
| `POST` | `/api/admin/assignments` | Admin | Create assignment (`title`, `description`, `due_date`, `onedrive_link`, `assign_mode`, `group_ids`, `student_ids`) |
| `PUT` | `/api/admin/assignments/:id` | Admin | Update assignment owned by this admin (returns 403 if not author) |
| `GET` | `/api/admin/groups` | Admin | List all student groups with member count and full roster array (`id`, `name`, `email`) |
| `GET` | `/api/admin/students` | Admin | List all students with `id`, `name`, `email`, and `group_name` |
| `GET` | `/api/admin/assignments/:id/submissions` | Admin | Deep tracking roster scoped to this admin's assignment with group-wise and student-wise views |

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

Initialize the database schema, run migrations, and load seed data:
```bash
# Run schema.sql, all migrations in order, and seed.sql automatically
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

| Name | Email | Role | Subject / Group Details |
|---|---|---|---|
| **Prof. Alan Turing** | `admin@assiqo.dev` | `admin` | **Subject:** *Data Structures* |
| **Prof. Grace Hopper** | `webadmin@assiqo.dev` | `admin` | **Subject:** *Web Development* |
| **Alice Johnson** | `alice@assiqo.dev` | `student` | **Team Alpha** (Group Creator) |
| **Bob Smith** | `bob@assiqo.dev` | `student` | **Team Alpha** (Group Member) |
| **Carol White** | `carol@assiqo.dev` | `student` | *No Group (Individual Learner)* |
| **Dave Brown** | `dave@assiqo.dev` | `student` | *No Group (Individual Learner)* |

---

## 8. Key Design Decisions

1. **Multi-Admin Subject Scoping**:
   - Professors manage independent subjects. Every assignment created is tied to `created_by = req.user.id`.
   - The analytics overview, assignment listings, and tracking dashboards filter strictly to the authenticated admin's own courses, preventing cross-professor contamination while keeping a single unified student body.

2. **Hybrid Group and Individual Submissions**:
   - Coursework can be assigned to **All Students**, **Specific Groups**, or **Specific Individual Students**.
   - If a student belongs to a group, confirming a submission records a group-level submission (`group_id`), instantly marking it submitted for all teammates.
   - If a student has no group, confirming creates an individual submission (`user_id`). The partial unique indexes on `submissions` guarantee that no group or student can submit more than once per task.

3. **Strict One Group Per Student Policy**:
   - Enforced directly at the database engine level via `UNIQUE (user_id)` on `group_members`.
   - Eliminates split-loyalty edge cases where a student could belong to competing teams on the same assignment.

4. **Stateless JWT Authorization with Role Guard Middleware**:
   - Eliminates server-side session memory overhead.
   - Route middleware (`authMiddleware` and `requireRole`) verifies cryptographic signatures and validates permissions, guaranteeing admin endpoints are inaccessible to students.

5. **Two-Step Submission Confirmation Modal**:
   - Prevents accidental one-click submissions. Step 1 forces verification that work was uploaded to the cloud folder. Step 2 provides dynamic confirmation tailored to group or individual context. Duplicate simultaneous submissions are rejected gracefully with `409 Conflict`.

6. **Raw SQL with Parameterized Queries (`pg`)**:
   - Instead of heavyweight ORMs, ASSIQO uses standard PostgreSQL queries with parameterized placeholders (`$1, $2`).
   - Guarantees zero SQL injection vulnerabilities, explicit indexing, and clean ACID transaction blocks (`BEGIN`, `COMMIT`, `ROLLBACK`) for multi-write operations.

7. **Zod Validation on All Requests**:
   - Schema validation runs before any controller logic executes.
   - Validates that admin accounts provide a teaching subject, checks due dates, sanitizes URLs, and guarantees consistent `{ error: "message" }` responses.

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

While ASSIQO fulfills all core requirements for university coursework tracking, future iterations will introduce:
- **Email Invitations & Notifications**: Real-time email dispatch (SendGrid / Resend) notifying students when an assignment is posted or when a teammate confirms submission.
- **Direct File Upload & Storage**: S3 / Azure Blob Storage integration with file type verification and antivirus scanning alongside external OneDrive links.
- **Admin Invite Tokens**: Restrict admin account creation via invite codes or domain-based whitelist rather than open role selection during registration.
- **Password Reset**: Self-service forgot-password workflow via time-limited cryptographically secure tokens.
- **Real-Time Websocket Updates**: Socket.io or SSE integration for live dashboard updates when submissions or team memberships change.
