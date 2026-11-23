-- =============================================================
-- ASSIQO Seed Data
--
-- All passwords are "password123" hashed with bcrypt (cost 10).
-- Hash: $2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m
-- =============================================================

-- ── Users ────────────────────────────────────────────────────────────────────
INSERT INTO users (name, email, password_hash, role, subject) VALUES
  -- Admins / Professors (2 with distinct subjects)
  ('Prof. Alan Turing',   'admin@assiqo.dev',    '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'admin', 'Data Structures'),
  ('Prof. Grace Hopper',  'webadmin@assiqo.dev', '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'admin', 'Web Development'),
  -- Students
  ('Alice Johnson',       'alice@assiqo.dev',    '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student', NULL),
  ('Bob Smith',           'bob@assiqo.dev',      '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student', NULL),
  ('Carol White',         'carol@assiqo.dev',    '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student', NULL),
  ('Dave Brown',          'dave@assiqo.dev',     '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student', NULL)
ON CONFLICT (email) DO UPDATE 
  SET password_hash = EXCLUDED.password_hash,
      subject       = EXCLUDED.subject,
      name          = EXCLUDED.name;

-- ── Sample group (created by Alice) ──────────────────────────────────────────
INSERT INTO groups (name, created_by)
  SELECT 'Team Alpha', id FROM users WHERE email = 'alice@assiqo.dev'
ON CONFLICT DO NOTHING;

-- ── Members: Alice + Bob in Team Alpha ───────────────────────────────────────
INSERT INTO group_members (group_id, user_id)
  SELECT g.id, u.id
  FROM   groups g
  JOIN   users  u ON u.email IN ('alice@assiqo.dev', 'bob@assiqo.dev')
  WHERE  g.name = 'Team Alpha'
ON CONFLICT DO NOTHING;

-- ── Sample assignment 1 (Data Structures, Prof. Turing, mode: all) ────────────
INSERT INTO assignments (title, description, due_date, onedrive_link, assign_mode, created_by)
  SELECT
    'Data Structures & Trees Milestone',
    'Submit your team binary search tree and heap implementation benchmarks.',
    NOW() + INTERVAL '7 days',
    'https://onedrive.live.com/data-structures-milestone',
    'all',
    id
  FROM users WHERE email = 'admin@assiqo.dev'
ON CONFLICT DO NOTHING;

-- ── Sample assignment 2 (Web Development, Prof. Hopper, mode: all) ────────────
INSERT INTO assignments (title, description, due_date, onedrive_link, assign_mode, created_by)
  SELECT
    'Responsive Portfolio & Web App',
    'Submit your frontend React dashboard with accessibility compliance and tests.',
    NOW() + INTERVAL '10 days',
    'https://onedrive.live.com/web-dev-portfolio',
    'all',
    id
  FROM users WHERE email = 'webadmin@assiqo.dev'
ON CONFLICT DO NOTHING;
