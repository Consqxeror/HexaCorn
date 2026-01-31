const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Department, Division, CRApplication } = require('../models');

const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '7d';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      departmentId: user.departmentId,
      divisionId: user.divisionId,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      departmentId,
      divisionId,
      semester,
      contactNumber,
      email,
      password,
      applyAsCR,
    } = req.body;

    if (!fullName || !departmentId || !divisionId || !contactNumber || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!semester) {
      return res.status(400).json({ message: 'Semester is required' });
    }

    const existingContact = await User.findOne({ where: { contactNumber } });
    if (existingContact) {
      return res.status(409).json({ message: 'Contact number already registered' });
    }

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already registered' });
      }
    }

    const department = await Department.findByPk(departmentId);
    const division = await Division.findByPk(divisionId);

    if (!department || !division) {
      return res.status(400).json({ message: 'Invalid department or division' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const wantsCr = Boolean(applyAsCR);

    const user = await User.create({
      fullName,
      departmentId,
      divisionId,
      semester: String(semester),
      contactNumber,
      email: email || null,
      passwordHash,
      role: wantsCr ? 'cr_pending' : 'student',
      isActive: true,
    });

    if (wantsCr) {
      await CRApplication.create({
        userId: user.id,
        contactNumber,
        departmentId,
        divisionId,
        status: 'pending',
      });
    }

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        divisionId: user.divisionId,
        semester: user.semester,
      },
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ message: 'Failed to register user' });
  }
});

// Allow existing students to apply as CR later
router.post('/apply-cr', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { id, departmentId, divisionId, contactNumber } = req.user;

    // Check existing pending/approved application
    const existing = await CRApplication.findOne({ where: { userId: id, status: 'pending' } });
    if (existing) {
      return res.status(409).json({ message: 'Application already pending' });
    }

    // Check CR cap (max 2 approved per dept-div)
    const approvedCount = await User.count({
      where: { role: 'cr', departmentId, divisionId },
    });
    if (approvedCount >= 2) {
      return res.status(400).json({ message: 'CR limit already reached for your division' });
    }

    await CRApplication.create({
      userId: id,
      contactNumber,
      departmentId,
      divisionId,
      status: 'pending',
    });

    // update user role to cr_pending
    const user = await User.findByPk(id);
    user.role = 'cr_pending';
    await user.save();

    return res.json({ message: 'CR application submitted and pending admin approval' });
  } catch (err) {
    console.error('Apply CR error', err);
    return res.status(500).json({ message: 'Failed to apply as CR' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ contactNumber: identifier }, { email: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
      return res.status(429).json({
        message: 'Too many wrong attempts. Please try again later.',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil,
      });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: 'Account is deactivated. Contact administrator.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        isVerifiedCr: user.isVerifiedCr,
        mustChangePassword: user.mustChangePassword,
        departmentId: user.departmentId,
        divisionId: user.divisionId,
        semester: user.semester,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ message: 'Failed to login' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error', err);
    return res.status(500).json({ message: 'Failed to change password' });
  }
});

router.post('/init-admin', async (req, res) => {
  try {
    const { fullName, contactNumber, email, password } = req.body;

    const existingAdmin = await User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already initialized' });
    }

    if (!fullName || !contactNumber || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await User.create({
      fullName,
      contactNumber,
      email: email || null,
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    const token = signToken(admin);

    return res.status(201).json({
      token,
      user: {
        id: admin.id,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error('Init admin error', err);
    return res.status(500).json({ message: 'Failed to create admin' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        isVerifiedCr: user.isVerifiedCr,
        mustChangePassword: user.mustChangePassword,
        departmentId: user.departmentId,
        divisionId: user.divisionId,
        semester: user.semester,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error('Me error', err);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
});

module.exports = router;
