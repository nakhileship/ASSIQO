-- =============================================================
-- ASSIQO Database Schema
-- Run order: schema first, then seed.
-- =============================================================

-- Users: students and admins (professors)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('student', 'admin')),
  subject       TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Groups: student-formed teams
CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  created_by  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Group members: each student belongs to at most ONE group (enforced by UNIQUE on user_id)
CREATE TABLE IF NOT EXISTS group_members (
  group_id  INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  UNIQUE (user_id)   -- a student can be in only one group at a time
);

-- Assignments: created by admins/professors
CREATE TABLE IF NOT EXISTS assignments (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  due_date       TIMESTAMPTZ  NOT NULL,
  onedrive_link  TEXT,
  assign_mode    VARCHAR(20)  NOT NULL DEFAULT 'all' CHECK (assign_mode IN ('all', 'groups', 'students')),
  created_by     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Assignment <-> Group mapping (relevant when assign_mode = 'groups')
CREATE TABLE IF NOT EXISTS assignment_groups (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id      INTEGER NOT NULL REFERENCES groups(id)      ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, group_id)
);

-- Assignment <-> Student mapping (relevant when assign_mode = 'students')
CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, user_id)
);

-- Submissions: exactly one record per (assignment, group) or (assignment, user)
CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INTEGER     NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  group_id      INTEGER     REFERENCES groups(id)      ON DELETE CASCADE,
  user_id       INTEGER     REFERENCES users(id)       ON DELETE CASCADE,
  confirmed_by  INTEGER     NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  confirmed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_submissions_target CHECK (
    (group_id IS NOT NULL AND user_id IS NULL) OR
    (group_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_assignment_group 
  ON submissions (assignment_id, group_id) 
  WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_assignment_user 
  ON submissions (assignment_id, user_id) 
  WHERE user_id IS NOT NULL;
