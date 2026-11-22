/**
 * src/controllers/studentAssignmentController.js
 * Student assignment listing and group submission confirmation.
 */

const pool = require('../db/pool');

/**
 * GET /api/assignments
 * Returns assignments visible to student's group.
 * If student is not in a group, returns { has_group: false, assignments: [] }.
 */
const getStudentAssignments = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Check student's group membership
    const groupResult = await pool.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [studentId]
    );

    if (groupResult.rows.length === 0) {
      return res.json({
        has_group: false,
        assignments: [],
      });
    }

    const groupId = groupResult.rows[0].group_id;

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.due_date,
        a.onedrive_link,
        a.assign_to_all,
        a.created_at,
        s.id AS submission_id,
        s.confirmed_at,
        u.name AS confirmed_by_name
      FROM assignments a
      LEFT JOIN submissions s 
        ON s.assignment_id = a.id AND s.group_id = $1
      LEFT JOIN users u 
        ON u.id = s.confirmed_by
      WHERE 
        a.assign_to_all = TRUE
        OR EXISTS (
          SELECT 1 FROM assignment_groups ag 
          WHERE ag.assignment_id = a.id AND ag.group_id = $1
        )
      ORDER BY a.due_date ASC
    `;

    const result = await pool.query(query, [groupId]);

    const assignments = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      onedrive_link: row.onedrive_link,
      assign_to_all: row.assign_to_all,
      created_at: row.created_at,
      submission: {
        submitted: row.submission_id !== null,
        confirmed_by_name: row.confirmed_by_name || null,
        confirmed_at: row.confirmed_at || null,
      },
    }));

    return res.json({
      has_group: true,
      group_id: groupId,
      assignments,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/assignments/:id/confirm
 * Confirms submission for the student's group.
 * Rejects with 409 if already confirmed.
 */
const confirmSubmission = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const studentId = req.user.id;

    // 1. Must be in a group
    const groupResult = await pool.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [studentId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(400).json({ error: 'You must be in a group to confirm submission' });
    }

    const groupId = groupResult.rows[0].group_id;

    // 2. Check assignment exists and is visible to that group
    const assignmentResult = await pool.query(
      'SELECT id, title, assign_to_all FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (!assignment.assign_to_all) {
      const visibilityCheck = await pool.query(
        'SELECT 1 FROM assignment_groups WHERE assignment_id = $1 AND group_id = $2',
        [assignmentId, groupId]
      );
      if (visibilityCheck.rows.length === 0) {
        return res.status(403).json({ error: 'This assignment is not assigned to your group' });
      }
    }

    // 3. Check if already confirmed
    const existingSubmission = await pool.query(
      'SELECT id FROM submissions WHERE assignment_id = $1 AND group_id = $2',
      [assignmentId, groupId]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ error: 'Already confirmed' });
    }

    // 4. Record submission
    const insertResult = await pool.query(
      `INSERT INTO submissions (assignment_id, group_id, confirmed_by)
       VALUES ($1, $2, $3)
       RETURNING id, assignment_id, group_id, confirmed_by, confirmed_at`,
      [assignmentId, groupId, studentId]
    );

    return res.status(201).json({
      message: 'Submission confirmed successfully',
      submission: {
        ...insertResult.rows[0],
        confirmed_by_name: req.user.name,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already confirmed' });
    }
    return next(err);
  }
};

module.exports = {
  getStudentAssignments,
  confirmSubmission,
};
