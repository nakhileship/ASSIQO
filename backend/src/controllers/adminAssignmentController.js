/**
 * src/controllers/adminAssignmentController.js
 * Admin assignment CRUD: create, update, and list assignments scoped to the logged-in admin.
 * Supports assign_mode: 'all', 'groups', 'students'.
 */

const { z } = require('zod');
const pool = require('../db/pool');

const assignmentSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255),
  description: z.string().trim().optional().nullable(),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'due_date must be a valid date/time string',
  }),
  onedrive_link: z.string().trim().url('onedrive_link must be a valid URL'),
  assign_mode: z.enum(['all', 'groups', 'students']).optional(),
  assign_to_all: z.boolean().optional(),
  group_ids: z.array(z.number().int().positive()).optional().default([]),
  student_ids: z.array(z.number().int().positive()).optional().default([]),
});

/**
 * POST /api/admin/assignments
 * Body: { title, description, due_date, onedrive_link, assign_mode, group_ids, student_ids }
 */
const createAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parseResult = assignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const {
      title,
      description,
      due_date,
      onedrive_link,
      assign_mode: rawMode,
      assign_to_all,
      group_ids = [],
      student_ids = [],
    } = parseResult.data;

    const assign_mode = rawMode || (assign_to_all ? 'all' : 'groups');
    const adminId = req.user.id;

    if (assign_mode === 'groups') {
      if (!group_ids || group_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one group must be specified when assigning to groups' });
      }

      const existingGroups = await client.query(
        'SELECT id FROM groups WHERE id = ANY($1::int[])',
        [group_ids]
      );
      if (existingGroups.rows.length !== group_ids.length) {
        return res.status(400).json({ error: 'One or more specified groups do not exist' });
      }
    } else if (assign_mode === 'students') {
      if (!student_ids || student_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one student must be specified when assigning to individual students' });
      }

      const existingStudents = await client.query(
        "SELECT id FROM users WHERE role = 'student' AND id = ANY($1::int[])",
        [student_ids]
      );
      if (existingStudents.rows.length !== student_ids.length) {
        return res.status(400).json({ error: 'One or more specified students do not exist' });
      }
    }

    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_mode, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, due_date, onedrive_link, assign_mode, created_by, created_at`,
      [title, description || null, new Date(due_date), onedrive_link, assign_mode, adminId]
    );

    const assignment = insertResult.rows[0];

    if (assign_mode === 'groups' && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
          [assignment.id, gid]
        );
      }
    } else if (assign_mode === 'students' && student_ids.length > 0) {
      for (const uid of student_ids) {
        await client.query(
          'INSERT INTO assignment_students (assignment_id, user_id) VALUES ($1, $2)',
          [assignment.id, uid]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Assignment created successfully',
      assignment: {
        ...assignment,
        assign_to_all: assign_mode === 'all',
        assigned_group_ids: assign_mode === 'groups' ? group_ids : [],
        assigned_student_ids: assign_mode === 'students' ? student_ids : [],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/assignments/:id
 * Body: { title, description, due_date, onedrive_link, assign_mode, group_ids, student_ids }
 */
const updateAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const parseResult = assignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const {
      title,
      description,
      due_date,
      onedrive_link,
      assign_mode: rawMode,
      assign_to_all,
      group_ids = [],
      student_ids = [],
    } = parseResult.data;

    const assign_mode = rawMode || (assign_to_all ? 'all' : 'groups');

    // Check assignment existence and ownership (must be created_by = req.user.id)
    const existing = await client.query(
      'SELECT id, created_by FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (existing.rows[0].created_by !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only edit assignments you created' });
    }

    if (assign_mode === 'groups') {
      if (!group_ids || group_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one group must be specified when assigning to groups' });
      }

      const existingGroups = await client.query(
        'SELECT id FROM groups WHERE id = ANY($1::int[])',
        [group_ids]
      );
      if (existingGroups.rows.length !== group_ids.length) {
        return res.status(400).json({ error: 'One or more specified groups do not exist' });
      }
    } else if (assign_mode === 'students') {
      if (!student_ids || student_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one student must be specified when assigning to individual students' });
      }

      const existingStudents = await client.query(
        "SELECT id FROM users WHERE role = 'student' AND id = ANY($1::int[])",
        [student_ids]
      );
      if (existingStudents.rows.length !== student_ids.length) {
        return res.status(400).json({ error: 'One or more specified students do not exist' });
      }
    }

    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, onedrive_link = $4, assign_mode = $5
       WHERE id = $6 AND created_by = $7
       RETURNING id, title, description, due_date, onedrive_link, assign_mode, created_by, created_at`,
      [title, description || null, new Date(due_date), onedrive_link, assign_mode, assignmentId, req.user.id]
    );

    // Replace mappings
    await client.query('DELETE FROM assignment_groups WHERE assignment_id = $1', [assignmentId]);
    await client.query('DELETE FROM assignment_students WHERE assignment_id = $1', [assignmentId]);

    if (assign_mode === 'groups' && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
          [assignmentId, gid]
        );
      }
    } else if (assign_mode === 'students' && student_ids.length > 0) {
      for (const uid of student_ids) {
        await client.query(
          'INSERT INTO assignment_students (assignment_id, user_id) VALUES ($1, $2)',
          [assignmentId, uid]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Assignment updated successfully',
      assignment: {
        ...updateResult.rows[0],
        assign_to_all: assign_mode === 'all',
        assigned_group_ids: assign_mode === 'groups' ? group_ids : [],
        assigned_student_ids: assign_mode === 'students' ? student_ids : [],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/admin/assignments
 * Lists assignments created by this admin with group/student target counts, confirmed count, and pending count.
 */
const getAssignments = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        a.id, 
        a.title, 
        a.description, 
        a.due_date, 
        a.onedrive_link, 
        a.assign_mode, 
        a.created_at,
        CASE 
          WHEN a.assign_mode = 'all' THEN (SELECT COUNT(*)::int FROM groups)
          WHEN a.assign_mode = 'groups' THEN (SELECT COUNT(*)::int FROM assignment_groups ag WHERE ag.assignment_id = a.id)
          ELSE (SELECT COUNT(*)::int FROM assignment_students ast WHERE ast.assignment_id = a.id)
        END AS total_assigned_groups,
        (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS confirmed_count,
        ARRAY(SELECT group_id FROM assignment_groups WHERE assignment_id = a.id) AS assigned_group_ids,
        ARRAY(SELECT user_id FROM assignment_students WHERE assignment_id = a.id) AS assigned_student_ids
      FROM assignments a
      WHERE a.created_by = $1
      ORDER BY a.created_at DESC
    `,
      [adminId]
    );

    const assignments = result.rows.map((row) => ({
      ...row,
      assign_to_all: row.assign_mode === 'all',
      pending_count: Math.max(0, row.total_assigned_groups - row.confirmed_count),
    }));

    return res.json({ assignments });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/admin/groups
 * Lists all student groups with their members (id, name, email) and member count.
 */
const getAdminGroups = async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        g.id, 
        g.name, 
        g.created_at,
        COUNT(gm.user_id)::int AS member_count,
        COALESCE(
          json_agg(
            json_build_object('id', u.id, 'name', u.name, 'email', u.email)
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users u ON gm.user_id = u.id
      GROUP BY g.id, g.name, g.created_at
      ORDER BY g.name ASC
    `);

    return res.json({ groups: result.rows });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/admin/students
 * Lists all students with their assigned group name (or null) and email.
 */
const getAdminStudents = async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        g.name AS group_name,
        g.id AS group_id
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN groups g ON gm.group_id = g.id
      WHERE u.role = 'student'
      ORDER BY u.name ASC
    `);

    return res.json({ students: result.rows });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssignment,
  updateAssignment,
  getAssignments,
  getAdminGroups,
  getAdminStudents,
};
