/**
 * src/controllers/adminTrackingController.js
 * Admin tracking of assignment submissions: group-wise and student-wise views.
 * Scoped strictly to assignments created by req.user.id.
 */

const pool = require('../db/pool');

/**
 * GET /api/admin/assignments/:id/submissions
 * Returns group-wise and student-wise submission statuses for an assignment.
 */
const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const adminId = req.user.id;

    // 1. Fetch assignment details and verify ownership
    const assignmentResult = await pool.query(
      `SELECT id, title, description, due_date, onedrive_link, assign_mode, created_by 
       FROM assignments 
       WHERE id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (assignment.created_by !== adminId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this assignment' });
    }

    // 2. Fetch all submissions for this assignment
    const subsResult = await pool.query(
      `SELECT s.id, s.group_id, s.user_id, s.confirmed_at, 
              u.id AS confirmed_by_id, u.name AS confirmed_by_name, u.email AS confirmed_by_email
       FROM submissions s
       JOIN users u ON u.id = s.confirmed_by
       WHERE s.assignment_id = $1`,
      [assignmentId]
    );

    const groupSubmissions = new Map();
    const userSubmissions = new Map();
    for (const sub of subsResult.rows) {
      if (sub.group_id) groupSubmissions.set(sub.group_id, sub);
      if (sub.user_id) userSubmissions.set(sub.user_id, sub);
    }

    // 3. Fetch groups for group-wise tab
    let groupsQuery;
    let groupsParams = [];

    if (assignment.assign_mode === 'all') {
      groupsQuery = `
        SELECT g.id, g.name, g.created_at,
               COUNT(gm.user_id)::int AS member_count,
               COALESCE(
                 json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL),
                 '[]'
               ) AS members
        FROM groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN users u ON gm.user_id = u.id
        GROUP BY g.id, g.name, g.created_at
        ORDER BY g.name ASC
      `;
    } else if (assignment.assign_mode === 'groups') {
      groupsQuery = `
        SELECT g.id, g.name, g.created_at,
               COUNT(gm.user_id)::int AS member_count,
               COALESCE(
                 json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL),
                 '[]'
               ) AS members
        FROM groups g
        JOIN assignment_groups ag ON g.id = ag.group_id
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE ag.assignment_id = $1
        GROUP BY g.id, g.name, g.created_at
        ORDER BY g.name ASC
      `;
      groupsParams = [assignmentId];
    } else {
      // students mode: show groups of targeted students
      groupsQuery = `
        SELECT g.id, g.name, g.created_at,
               COUNT(gm.user_id)::int AS member_count,
               COALESCE(
                 json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email)) FILTER (WHERE u.id IS NOT NULL),
                 '[]'
               ) AS members
        FROM groups g
        JOIN group_members gm_target ON g.id = gm_target.group_id
        JOIN assignment_students ast ON gm_target.user_id = ast.user_id
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE ast.assignment_id = $1
        GROUP BY g.id, g.name, g.created_at
        ORDER BY g.name ASC
      `;
      groupsParams = [assignmentId];
    }

    const groupsResult = await pool.query(groupsQuery, groupsParams);
    const assignedGroups = groupsResult.rows;

    const groupWise = assignedGroups.map((g) => {
      const sub = groupSubmissions.get(g.id);
      const status = sub ? 'confirmed' : 'pending';

      return {
        group_id: g.id,
        group_name: g.name,
        status,
        confirmed_at: sub ? sub.confirmed_at : null,
        confirmed_by: sub
          ? {
              id: sub.confirmed_by_id,
              name: sub.confirmed_by_name,
              email: sub.confirmed_by_email,
            }
          : null,
        members: g.members || [],
      };
    });

    // 4. Fetch students for student-wise tab
    let studentsQuery;
    let studentsParams = [];

    if (assignment.assign_mode === 'all') {
      studentsQuery = `
        SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email,
               g.id AS group_id, g.name AS group_name
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE u.role = 'student'
        ORDER BY u.name ASC
      `;
    } else if (assignment.assign_mode === 'groups') {
      studentsQuery = `
        SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email,
               g.id AS group_id, g.name AS group_name
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        JOIN groups g ON gm.group_id = g.id
        JOIN assignment_groups ag ON g.id = ag.group_id
        WHERE ag.assignment_id = $1 AND u.role = 'student'
        ORDER BY u.name ASC
      `;
      studentsParams = [assignmentId];
    } else {
      // students mode
      studentsQuery = `
        SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email,
               g.id AS group_id, g.name AS group_name
        FROM users u
        JOIN assignment_students ast ON u.id = ast.user_id
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN groups g ON gm.group_id = g.id
        WHERE ast.assignment_id = $1 AND u.role = 'student'
        ORDER BY u.name ASC
      `;
      studentsParams = [assignmentId];
    }

    const studentsResult = await pool.query(studentsQuery, studentsParams);

    const studentWise = studentsResult.rows.map((s) => {
      const isIndividualMode = assignment.assign_mode === 'students';
      const hasNoGroup = !s.group_id;
      const submissionType = (isIndividualMode || hasNoGroup) ? 'Individual' : 'Group';

      let sub = null;
      if (s.group_id && groupSubmissions.has(s.group_id)) {
        sub = groupSubmissions.get(s.group_id);
      }
      if (!sub && userSubmissions.has(s.student_id)) {
        sub = userSubmissions.get(s.student_id);
      }

      const status = sub ? 'confirmed' : 'pending';

      return {
        student_id: s.student_id,
        student_name: s.student_name,
        student_email: s.student_email,
        group_id: s.group_id,
        group_name: s.group_name || '—',
        type: submissionType,
        status,
        confirmed_at: sub ? sub.confirmed_at : null,
        confirmed_by_name: sub ? sub.confirmed_by_name : null,
      };
    });

    const isStudentMode = assignment.assign_mode === 'students';
    const totalAssignedUnits = isStudentMode ? studentWise.length : groupWise.length;
    const confirmedUnits = isStudentMode
      ? studentWise.filter((s) => s.status === 'confirmed').length
      : groupWise.filter((g) => g.status === 'confirmed').length;

    return res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        onedrive_link: assignment.onedrive_link,
        assign_mode: assignment.assign_mode,
        assign_to_all: assignment.assign_mode === 'all',
      },
      summary: {
        total_assigned_groups: totalAssignedUnits,
        confirmed_groups: confirmedUnits,
        pending_groups: Math.max(0, totalAssignedUnits - confirmedUnits),
        total_students: studentWise.length,
      },
      group_wise: groupWise,
      student_wise: studentWise,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAssignmentSubmissions,
};
