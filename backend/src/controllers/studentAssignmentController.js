/**
 * src/controllers/studentAssignmentController.js
 * Student assignment listing: visible to student's group, with group submission status.
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

module.exports = {
  getStudentAssignments,
};
