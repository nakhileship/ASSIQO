/**
 * src/controllers/adminAssignmentController.js
 * Admin assignment CRUD: create, update, and list assignments with group submission counts.
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
  assign_to_all: z.boolean(),
  group_ids: z.array(z.number().int().positive()).optional().default([]),
});

/**
 * POST /api/admin/assignments
 * Body: { title, description, due_date, onedrive_link, assign_to_all, group_ids }
 */
const createAssignment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parseResult = assignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { title, description, due_date, onedrive_link, assign_to_all, group_ids } =
      parseResult.data;
    const adminId = req.user.id;

    if (!assign_to_all) {
      if (!group_ids || group_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one group must be specified when assign_to_all is false' });
      }

      // Verify all group_ids exist
      const existingGroups = await client.query(
        'SELECT id FROM groups WHERE id = ANY($1::int[])',
        [group_ids]
      );
      if (existingGroups.rows.length !== group_ids.length) {
        return res.status(400).json({ error: 'One or more specified groups do not exist' });
      }
    }

    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, due_date, onedrive_link, assign_to_all, created_by, created_at`,
      [title, description || null, new Date(due_date), onedrive_link, assign_to_all, adminId]
    );

    const assignment = insertResult.rows[0];

    if (!assign_to_all && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
          [assignment.id, gid]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Assignment created successfully',
      assignment: {
        ...assignment,
        assigned_group_ids: assign_to_all ? [] : group_ids,
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
 * Body: { title, description, due_date, onedrive_link, assign_to_all, group_ids }
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

    const { title, description, due_date, onedrive_link, assign_to_all, group_ids } =
      parseResult.data;

    // Check assignment existence
    const existing = await client.query('SELECT id FROM assignments WHERE id = $1', [assignmentId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assign_to_all) {
      if (!group_ids || group_ids.length === 0) {
        return res
          .status(400)
          .json({ error: 'At least one group must be specified when assign_to_all is false' });
      }

      // Verify all group_ids exist
      const existingGroups = await client.query(
        'SELECT id FROM groups WHERE id = ANY($1::int[])',
        [group_ids]
      );
      if (existingGroups.rows.length !== group_ids.length) {
        return res.status(400).json({ error: 'One or more specified groups do not exist' });
      }
    }

    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE assignments
       SET title = $1, description = $2, due_date = $3, onedrive_link = $4, assign_to_all = $5
       WHERE id = $6
       RETURNING id, title, description, due_date, onedrive_link, assign_to_all, created_by, created_at`,
      [title, description || null, new Date(due_date), onedrive_link, assign_to_all, assignmentId]
    );

    // Replace assignment_groups rows
    await client.query('DELETE FROM assignment_groups WHERE assignment_id = $1', [assignmentId]);

    if (!assign_to_all && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          'INSERT INTO assignment_groups (assignment_id, group_id) VALUES ($1, $2)',
          [assignmentId, gid]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Assignment updated successfully',
      assignment: {
        ...updateResult.rows[0],
        assigned_group_ids: assign_to_all ? [] : group_ids,
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
 * Lists all assignments with total assigned groups, confirmed count, and pending count.
 */
const getAssignments = async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.title, 
        a.description, 
        a.due_date, 
        a.onedrive_link, 
        a.assign_to_all, 
        a.created_at,
        CASE 
          WHEN a.assign_to_all = TRUE THEN (SELECT COUNT(*)::int FROM groups)
          ELSE (SELECT COUNT(*)::int FROM assignment_groups ag WHERE ag.assignment_id = a.id)
        END AS total_assigned_groups,
        (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS confirmed_count,
        ARRAY(SELECT group_id FROM assignment_groups WHERE assignment_id = a.id) AS assigned_group_ids
      FROM assignments a
      ORDER BY a.created_at DESC
    `);

    const assignments = result.rows.map((row) => ({
      ...row,
      pending_count: Math.max(0, row.total_assigned_groups - row.confirmed_count),
    }));

    return res.json({ assignments });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssignment,
  updateAssignment,
  getAssignments,
};
