const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { listUsers, findUserById, updateUser, deleteUser } = require('../services/userStore');
const validate = require('../middleware/validate');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const role = req.query.role;
    const allUsers = await listUsers();
    const visibleUsers = ['admin', 'manager', 'employee'].includes(req.user.role)
      ? (role ? allUsers.filter(user => user.role === role) : allUsers)
      : [await findUserById(req.user._id)].filter(Boolean);

    res.json(visibleUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (!['admin', 'manager', 'employee'].includes(req.user.role) && req.user._id !== targetId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const user = await findUserById(targetId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', auth, admin, async (req, res) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, validate.validateUserUpdate, async (req, res) => {
  try {
    const targetId = req.params.id;
    const targetUser = await findUserById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Only admin or manager can update users; managers cannot update admins
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Cannot modify admin user' });
    }

    const updated = await updateUser(targetId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const targetUser = await findUserById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    if (targetUser.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }

    const ok = await deleteUser(targetId);
    if (!ok) return res.status(500).json({ message: 'Delete failed' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
