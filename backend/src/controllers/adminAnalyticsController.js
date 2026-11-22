/**
 * src/controllers/adminAnalyticsController.js
 * Admin overview analytics: student, group, assignment counts, completion rates, and per-assignment chart data.
 */

const pool = require('../db/pool');

/**
 * GET /api/admin/analytics
 * Returns aggregate metrics and per-assignment stats for Recharts visualization.
 */
const getAnalytics = async (_req, res, next) => {
  try {
    // 1. Total students
    const studentsRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'student'"
    );
    const totalStudents = studentsRes.rows[0].count;

    // 2. Total groups
    const groupsRes = await pool.query('SELECT COUNT(*)::int AS count FROM groups');
    const totalGroups = groupsRes.rows[0].count;

    // 3. Total assignments
    const assignmentsRes = await pool.query('SELECT COUNT(*)::int AS count FROM assignments');
    const totalAssignments = assignmentsRes.rows[0].count;

    // 4. Total confirmed submissions
    const submissionsRes = await pool.query('SELECT COUNT(*)::int AS count FROM submissions');
    const totalConfirmedSubmissions = submissionsRes.rows[0].count;

    // 5. Per-assignment breakdown
    const perAssignmentRes = await pool.query(`
      SELECT 
        a.id,
        a.title,
        CASE 
          WHEN a.assign_to_all = TRUE THEN (SELECT COUNT(*)::int FROM groups)
          ELSE (SELECT COUNT(*)::int FROM assignment_groups ag WHERE ag.assignment_id = a.id)
        END AS total_assigned,
        (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS confirmed
      FROM assignments a
      ORDER BY a.created_at ASC
    `);

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

    // 6. Overall completion percentage
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
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAnalytics,
};
