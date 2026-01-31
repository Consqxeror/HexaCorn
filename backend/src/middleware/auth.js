const jwt = require('jsonwebtoken');
const { User } = require('../models');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Missing authentication token' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', async (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
      const dbUser = await User.findByPk(user.id);
      if (!dbUser) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      if (!dbUser.isActive) {
        return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
      }

      req.user = {
        id: dbUser.id,
        role: dbUser.role,
        isVerifiedCr: dbUser.isVerifiedCr,
        mustChangePassword: dbUser.mustChangePassword,
        departmentId: dbUser.departmentId,
        divisionId: dbUser.divisionId,
        semester: dbUser.semester,
        fullName: dbUser.fullName,
        contactNumber: dbUser.contactNumber,
      };
      next();
    } catch (e) {
      console.error('Auth middleware error', e);
      return res.status(500).json({ message: 'Authentication failed' });
    }
  });
}

module.exports = { authenticateToken };
