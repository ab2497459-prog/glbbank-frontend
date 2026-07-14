const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByIdentifier, findUserById } = require('../services/userStore');
const { findAccountByNumber } = require('../services/accountStore');
const validate = require('../middleware/validate');
const router = express.Router();

const generateToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', validate.validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, mobile, studentId, facultyId, merchantId } = req.body;
    // If attempting to create a manager, require an authenticated admin token
    if (String(role).toLowerCase() === 'manager') {
      try {
        const authHeader = req.headers.authorization || req.headers.Authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        if (!token) return res.status(401).json({ message: 'Admin token required to create manager' });
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== 'admin') return res.status(403).json({ message: 'Only admins can create manager users' });
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired admin token' });
      }
    }

    const user = await createUser({
      name,
      email,
      password,
      role: role || 'student',
      mobile,
      studentId,
      facultyId,
      merchantId
    });

    if (user.error) {
      return res.status(400).json({ message: user.error });
    }

    res.status(201).json({
      message: 'User registered successfully',
      token: generateToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', validate.validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await findUserByIdentifier(email);

    if (!user) {
      const account = await findAccountByNumber(email);
      if (account) {
        user = await findUserById(account.userId);
      }
    }

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        studentId: user.studentId,
        facultyId: user.facultyId,
        merchantId: user.merchantId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
