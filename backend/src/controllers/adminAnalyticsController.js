/**
 * src/controllers/adminAnalyticsController.js
 * Admin overview analytics: student, group, assignment counts, completion rates, and per-assignment chart data.
 * Scoped strictly to the logged-in admin's created assignments.
 */

const pool = require('../db/pool');

/**
 * GET /api/admin/analytics
 * Returns aggregate metrics and per-assignment stats scoped to req.user.id.
 */
const getAnalytics = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    // 1. Total students (global context for university)
    const studentsRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'"
    );
    const totalStudents = studentsRes.rows[0].count;

    // 2. Total groups (global context for university)
    const groupsRes = await pool.query('SELECT COUNT(*)::int AS count FROM groups');
    const totalGroups = groupsRes.rows[0].count;

    // 3. Total assignments created by this admin
    const assignmentsRes = await pool.query(
      'SELECT COUNT(*)::int AS count FROM assignments WHERE created_by = $1',
      [adminId]
    );
    const totalAssignments = assignmentsRes.rows[0].count;

    // 4. Total confirmed submissions for this admin's assignments
    const submissionsRes = await pool.query(
      `SELECT COUNT(*)::int AS count 
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE a.created_by = $1`,
      [adminId]
    );
    const totalConfirmedSubmissions = submissionsRes.rows[0].count;

    // 5. Per-assignment breakdown for this admin
    const perAssignmentRes = await pool.query(
      `
      SELECT 
        a.id,
        a.title,
        a.assign_mode,
        CASE 
          WHEN a.assign_mode = 'all' THEN (SELECT COUNT(*)::int FROM groups)
          WHEN a.assign_mode = 'groups' THEN (SELECT COUNT(*)::int FROM assignment_groups ag WHERE ag.assignment_id = a.id)
          ELSE (SELECT COUNT(*)::int FROM assignment_students ast WHERE ast.assignment_id = a.id)
        END AS total_assigned,
        (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS confirmed
      FROM assignments a
      WHERE a.created_by = $1
      ORDER BY a.created_at ASC
    `,
      [adminId]
    );

    let totalExpectedSubmissions = 0;
    const perAssignment = perAssignmentRes.rows.map((row) => {
      totalExpectedSubmissions += row.total_assigned;
      const pending = Math.max(0, row.total_assigned - row.confirmed);
      return {
        id: row.id,
        title: row.title,
        total_assigned: row.total_assigned,
        confirmed: row.confirmed,
        pending,
      };
    });

    // 6. Overall completion percentage for this admin's assignments
    const overallCompletionPercentage =
      totalExpectedSubmissions > 0
        ? Math.round((totalConfirmedSubmissions / totalExpectedSubmissions) * 100)
        : 0;

    return res.json({
      total_students: totalStudents,
      total_groups: totalGroups,
      total_assignments: totalAssignments,
      total_confirmed_submissions: totalConfirmedSubmissions,
      overall_completion_percentage: overallCompletionPercentage,
      per_assignment: perAssignment,
      admin_subject: req.user.subject || 'General',
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAnalytics,
};
