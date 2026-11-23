-- =============================================================
-- Migration: 002_multi_admin.sql
-- Multi-admin subjects, individual assignment, grouped/single labels
-- =============================================================

-- 1. Users: add nullable subject column
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. Assignments: replace assign_to_all with assign_mode ('all', 'groups', 'students')
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assign_mode VARCHAR(20) DEFAULT 'all' CHECK (assign_mode IN ('all', 'groups', 'students'));

-- Migrate existing assign_to_all data if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'assign_to_all'
  ) THEN
    UPDATE assignments 
    SET assign_mode = CASE 
      WHEN assign_to_all = FALSE THEN 'groups' 
      ELSE 'all' 
    END
    WHERE assign_mode IS NULL OR assign_mode = 'all';

    ALTER TABLE assignments DROP COLUMN assign_to_all;
  END IF;
END $$;

ALTER TABLE assignments ALTER COLUMN assign_mode SET NOT NULL;

-- 3. Assignment Students mapping table
CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  PRIMARY KEY (assignment_id, user_id)
);

-- 4. Submissions: allow individual submissions (user_id) alongside group submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE submissions ALTER COLUMN group_id DROP NOT NULL;

-- Ensure check constraint that exactly one of group_id or user_id is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_target'
  ) THEN
    ALTER TABLE submissions ADD CONSTRAINT chk_submissions_target CHECK (
      (group_id IS NOT NULL AND user_id IS NULL) OR
      (group_id IS NULL AND user_id IS NOT NULL)
    );
  END IF;
END $$;

-- Drop old unique constraint (assignment_id, group_id) if it exists as a constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'submissions_assignment_id_group_id_key'
  ) THEN
    ALTER TABLE submissions DROP CONSTRAINT submissions_assignment_id_group_id_key;
  END IF;
END $$;

-- Create partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_assignment_group 
  ON submissions (assignment_id, group_id) 
  WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_assignment_user 
  ON submissions (assignment_id, user_id) 
  WHERE user_id IS NOT NULL;
