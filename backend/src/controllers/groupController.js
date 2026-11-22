/**
 * src/controllers/groupController.js
 * Student-only group management: create, view mine, add member, remove member/leave.
 */

const { z } = require('zod');
const pool = require('../db/pool');

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters').max(100),
});

const addMemberSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

/**
 * POST /api/groups
 * Creates a group and adds the creator as a member.
 * Rejects with 409 if the student is already in a group.
 */
const createGroup = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parseResult = createGroupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { name } = parseResult.data;
    const userId = req.user.id;

    // Check if creator is already in a group
    const existing = await client.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of a group' });
    }

    await client.query('BEGIN');

    // Create group
    const groupResult = await client.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at',
      [name, userId]
    );
    const newGroup = groupResult.rows[0];

    // Add creator to group_members
    await client.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [newGroup.id, userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Group created successfully',
      group: {
        ...newGroup,
        members: [
          {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
          },
        ],
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
 * GET /api/groups/mine
 * Returns the authenticated student's group with its members, or null.
 */
const getMyGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const groupResult = await pool.query(
      `SELECT g.id, g.name, g.created_by, g.created_at
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1`,
      [userId]
    );

    if (groupResult.rows.length === 0) {
      return res.json({ group: null });
    }

    const group = groupResult.rows[0];

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, gm.joined_at
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [group.id]
    );

    return res.json({
      group: {
        ...group,
        members: membersResult.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/groups/:id/members
 * Body: { email }
 * Only a member of that group can add.
 * Target user must exist, have role student, and not already be in any group.
 */
const addMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const parseResult = addMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { email } = parseResult.data;
    const requesterId = req.user.id;

    // Check group exists
    const groupCheck = await pool.query('SELECT id, name FROM groups WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check requester is a member of this group
    const requesterCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, requesterId]
    );
    if (requesterCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only members of this group can add new members' });
    }

    // Find target user by email
    const userCheck = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const targetUser = userCheck.rows[0];

    // Must be student
    if (targetUser.role !== 'student') {
      return res.status(400).json({ error: 'Only students can be added to groups' });
    }

    // Must not already be in ANY group
    const membershipCheck = await pool.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [targetUser.id]
    );
    if (membershipCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Student is already a member of a group' });
    }

    // Add member
    await pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, targetUser.id]
    );

    return res.status(201).json({
      message: 'Member added successfully',
      member: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/groups/:id/members/:userId
 * Only a member of that group can remove.
 * Student can remove themselves (leave).
 * If the last member leaves, delete the group.
 */
const removeMember = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const groupId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);

    if (isNaN(groupId) || isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid group or user ID' });
    }

    const requesterId = req.user.id;

    // Check group exists
    const groupCheck = await client.query('SELECT id FROM groups WHERE id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check requester is member of this group
    const requesterCheck = await client.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, requesterId]
    );
    if (requesterCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only members of this group can remove members' });
    }

    // Check target is member of this group
    const targetCheck = await client.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );
    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User is not a member of this group' });
    }

    await client.query('BEGIN');

    // Remove member
    await client.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );

    // Count remaining members
    const countResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM group_members WHERE group_id = $1',
      [groupId]
    );

    const remainingCount = countResult.rows[0].count;

    let groupDeleted = false;
    if (remainingCount === 0) {
      await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
      groupDeleted = true;
    }

    await client.query('COMMIT');

    return res.json({
      message: groupDeleted
        ? 'Last member left; group was deleted'
        : 'Member removed successfully',
      remaining_members: remainingCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  createGroup,
  getMyGroup,
  addMember,
  removeMember,
};
