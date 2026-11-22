/**
 * src/controllers/adminTrackingController.js
 * Admin tracking of assignment submissions: group-wise and student-wise views.
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

    // 1. Fetch assignment details
    const assignmentResult = await pool.query(
      'SELECT id, title, description, due_date, onedrive_link, assign_to_all FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    // 2. Fetch assigned groups
    let groupsQuery;
    let queryParams;

    if (assignment.assign_to_all) {
      groupsQuery = 'SELECT id, name, created_at FROM groups ORDER BY name ASC';
      queryParams = [];
    } else {
      groupsQuery = `
        SELECT g.id, g.name, g.created_at
        FROM groups g
        JOIN assignment_groups ag ON g.id = ag.group_id
        WHERE ag.assignment_id = $1
        ORDER BY g.name ASC
      `;
      queryParams = [assignmentId];
    }

    const groupsResult = await pool.query(groupsQuery, queryParams);
    const assignedGroups = groupsResult.rows;

    // 3. For each group, get submission status and member list
    const groupWise = [];
    const studentWise = [];

    for (const group of assignedGroups) {
      // Check submission for this group
      const subResult = await pool.query(
        `SELECT s.id, s.confirmed_at, u.id AS confirmed_by_id, u.name AS confirmed_by_name, u.email AS confirmed_by_email
         FROM submissions s
         JOIN users u ON u.id = s.confirmed_by
         WHERE s.assignment_id = $1 AND s.group_id = $2`,
        [assignmentId, group.id]
      );

      const submission = subResult.rows.length > 0 ? subResult.rows[0] : null;
      const status = submission ? 'confirmed' : 'pending';

      // Fetch group members
      const membersResult = await pool.query(
        `SELECT u.id, u.name, u.email, gm.joined_at
         FROM users u
         JOIN group_members gm ON u.id = gm.user_id
         WHERE gm.group_id = $1
         ORDER BY u.name ASC`,
        [group.id]
      );

      const members = membersResult.rows;

      groupWise.push({
        group_id: group.id,
        group_name: group.name,
        status,
        confirmed_at: submission ? submission.confirmed_at : null,
        confirmed_by: submission
          ? {
              id: submission.confirmed_by_id,
              name: submission.confirmed_by_name,
              email: submission.confirmed_by_email,
            }
          : null,
        members,
      });

      for (const member of members) {
        studentWise.push({
          student_id: member.id,
          student_name: member.name,
          student_email: member.email,
          group_id: group.id,
          group_name: group.name,
          status,
          confirmed_at: submission ? submission.confirmed_at : null,
          confirmed_by_name: submission ? submission.confirmed_by_name : null,
        });
      }
    }

    return res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        onedrive_link: assignment.onedrive_link,
        assign_to_all: assignment.assign_to_all,
      },
      summary: {
        total_assigned_groups: assignedGroups.length,
        confirmed_groups: groupWise.filter((g) => g.status === 'confirmed').length,
        pending_groups: groupWise.filter((g) => g.status === 'pending').length,
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
