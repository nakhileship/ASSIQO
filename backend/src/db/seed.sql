-- =============================================================
-- ASSIQO Seed Data
--
-- All passwords are "password123" hashed with bcrypt (cost 10).
-- Hash: $2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m
-- =============================================================

-- ── Users ────────────────────────────────────────────────────────────────────
INSERT INTO users (name, email, password_hash, role) VALUES
  -- Admin / Professor
  ('Prof. Admin',   'admin@assiqo.dev',  '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'admin'),
  -- Students
  ('Alice Johnson', 'alice@assiqo.dev',  '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student'),
  ('Bob Smith',     'bob@assiqo.dev',    '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student'),
  ('Carol White',   'carol@assiqo.dev',  '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student'),
  ('Dave Brown',    'dave@assiqo.dev',   '$2a$10$HuTJEO0wjyfs2ihr5Yhzx.pqK18F1PRigfPmtIwkJtgQcxaQ7c66m', 'student')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

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

-- ── Sample assignment (assigned to all groups) ────────────────────────────────
INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
  SELECT
    'Project Proposal',
    'Submit a 2-page project proposal covering objectives, methodology, and timeline.',
    NOW() + INTERVAL '7 days',
    'https://onedrive.live.com/example-link-replace-me',
    TRUE,
    id
  FROM users WHERE email = 'admin@assiqo.dev'
ON CONFLICT DO NOTHING;
