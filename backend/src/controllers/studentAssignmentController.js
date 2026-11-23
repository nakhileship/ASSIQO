/**
 * src/controllers/studentAssignmentController.js
 * Student assignment listing and submission confirmation (group and individual).
 */

const pool = require('../db/pool');

/**
 * GET /api/assignments
 * Returns assignments visible to the student (mode='all', group in assignment_groups, or student in assignment_students).
 * Includes subject, admin_name, submission status, and student_context.
 */
const getStudentAssignments = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // Check student's group membership
    const groupResult = await pool.query(
      `SELECT g.id AS group_id, g.name AS group_name
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1`,
      [studentId]
    );

    const hasGroup = groupResult.rows.length > 0;
    const groupId = hasGroup ? groupResult.rows[0].group_id : null;
    const groupName = hasGroup ? groupResult.rows[0].group_name : null;

    const studentContext = {
      type: hasGroup ? 'group' : 'individual',
      group_name: groupName,
    };

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.due_date,
        a.onedrive_link,
        a.assign_mode,
        a.created_at,
        creator.name AS admin_name,
        COALESCE(creator.subject, 'General') AS subject,
        s.id AS submission_id,
        s.confirmed_at,
        sub_user.name AS confirmed_by_name
      FROM assignments a
      JOIN users creator ON creator.id = a.created_by
      LEFT JOIN submissions s 
        ON s.assignment_id = a.id AND (
          (a.assign_mode = 'students' AND s.user_id = $2)
          OR (a.assign_mode != 'students' AND $1::int IS NOT NULL AND s.group_id = $1::int)
          OR (a.assign_mode != 'students' AND $1::int IS NULL AND s.user_id = $2)
        )
      LEFT JOIN users sub_user ON sub_user.id = s.confirmed_by
      WHERE 
        a.assign_mode = 'all'
        OR ($1::int IS NOT NULL AND EXISTS (
          SELECT 1 FROM assignment_groups ag 
          WHERE ag.assignment_id = a.id AND ag.group_id = $1::int
        ))
        OR EXISTS (
          SELECT 1 FROM assignment_students ast 
          WHERE ast.assignment_id = a.id AND ast.user_id = $2
        )
      ORDER BY a.due_date ASC
    `;

    const result = await pool.query(query, [groupId, studentId]);

    const assignments = result.rows.map((row) => {
      const isIndividual = row.assign_mode === 'students' || !hasGroup;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        due_date: row.due_date,
        onedrive_link: row.onedrive_link,
        assign_mode: row.assign_mode,
        assign_to_all: row.assign_mode === 'all',
        subject: row.subject,
        admin_name: row.admin_name,
        submission_type: isIndividual ? 'individual' : 'group',
        created_at: row.created_at,
        submission: {
          submitted: row.submission_id !== null,
          confirmed_by_name: row.confirmed_by_name || null,
          confirmed_at: row.confirmed_at || null,
        },
      };
    });

    return res.json({
      has_group: hasGroup,
      group_id: groupId,
      student_context: studentContext,
      assignments,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/assignments/:id/confirm
 * Confirms submission for the student (group-level if in group, individual if not).
 * Returns 409 if already confirmed.
 */
const confirmSubmission = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const studentId = req.user.id;

    // Check student's group membership
    const groupResult = await pool.query(
      `SELECT g.id AS group_id, g.name AS group_name
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1`,
      [studentId]
    );

    const hasGroup = groupResult.rows.length > 0;
    const groupId = hasGroup ? groupResult.rows[0].group_id : null;

    // Check assignment existence and visibility
    const assignmentResult = await pool.query(
      'SELECT id, title, assign_mode FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    // Check assignment visibility for student
    let isTargeted = false;
    if (assignment.assign_mode === 'all') {
      isTargeted = true;
    } else {
      if (hasGroup) {
        const groupTarget = await pool.query(
          'SELECT 1 FROM assignment_groups WHERE assignment_id = $1 AND group_id = $2',
          [assignmentId, groupId]
        );
        if (groupTarget.rows.length > 0) isTargeted = true;
      }

      if (!isTargeted) {
        const studentTarget = await pool.query(
          'SELECT 1 FROM assignment_students WHERE assignment_id = $1 AND user_id = $2',
          [assignmentId, studentId]
        );
        if (studentTarget.rows.length > 0) isTargeted = true;
      }
    }

    if (!isTargeted) {
      return res.status(403).json({ error: 'This assignment is not assigned to you' });
    }

    const isIndividualSubmission = assignment.assign_mode === 'students' || !hasGroup;

    // Check if already confirmed
    let existingSubmission;
    if (!isIndividualSubmission) {
      existingSubmission = await pool.query(
        'SELECT id FROM submissions WHERE assignment_id = $1 AND group_id = $2',
        [assignmentId, groupId]
      );
    } else {
      existingSubmission = await pool.query(
        'SELECT id FROM submissions WHERE assignment_id = $1 AND user_id = $2',
        [assignmentId, studentId]
      );
    }

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ error: 'Already confirmed' });
    }

    // Record submission
    let insertResult;
    if (!isIndividualSubmission) {
      insertResult = await pool.query(
        `INSERT INTO submissions (assignment_id, group_id, user_id, confirmed_by)
         VALUES ($1, $2, NULL, $3)
         RETURNING id, assignment_id, group_id, user_id, confirmed_by, confirmed_at`,
        [assignmentId, groupId, studentId]
      );
    } else {
      insertResult = await pool.query(
        `INSERT INTO submissions (assignment_id, group_id, user_id, confirmed_by)
         VALUES ($1, NULL, $2, $3)
         RETURNING id, assignment_id, group_id, user_id, confirmed_by, confirmed_at`,
        [assignmentId, studentId, studentId]
      );
    }

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
