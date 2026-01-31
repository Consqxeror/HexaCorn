const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { User, Content, Department, Division, CRApplication } = require('../models');
const { ensureSettings } = require('../middleware/maintenance');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
const brandingDir = path.join(uploadDir, 'branding');
if (!fs.existsSync(brandingDir)) {
  fs.mkdirSync(brandingDir, { recursive: true });
}

const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, brandingDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const brandingUpload = multer({
  storage: brandingStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(file.mimetype);
    if (!ok) return cb(new Error('Invalid logo file type'), false);
    return cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/settings', async (req, res) => {
  try {
    const settings = await ensureSettings();
    return res.json({
      settings: {
        collegeName: settings.collegeName,
        collegeLogoPath: settings.collegeLogoPath,
        academicYear: settings.academicYear,
        contactEmail: settings.contactEmail,
        collegeAddress: settings.collegeAddress,
        globalAnnouncement: settings.globalAnnouncement,
        globalAnnouncementTone: settings.globalAnnouncementTone,
        uploadMaxSizeMb: settings.uploadMaxSizeMb,
        uploadAllowedMimeTypes: settings.uploadAllowedMimeTypes,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  } catch (err) {
    console.error('Get settings error', err);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const {
      maintenanceMode,
      maintenanceMessage,
      collegeName,
      academicYear,
      contactEmail,
      collegeAddress,
      globalAnnouncement,
      globalAnnouncementTone,
      uploadMaxSizeMb,
      uploadAllowedMimeTypes,
    } = req.body;
    const settings = await ensureSettings();

    if (typeof collegeName !== 'undefined') settings.collegeName = collegeName || null;
    if (typeof academicYear !== 'undefined') settings.academicYear = academicYear || null;
    if (typeof contactEmail !== 'undefined') settings.contactEmail = contactEmail || null;
    if (typeof collegeAddress !== 'undefined') settings.collegeAddress = collegeAddress || null;

    if (typeof globalAnnouncement !== 'undefined') settings.globalAnnouncement = globalAnnouncement || null;
    if (typeof globalAnnouncementTone !== 'undefined') {
      const tone = String(globalAnnouncementTone || 'info');
      if (['info', 'success', 'warning', 'danger'].includes(tone)) settings.globalAnnouncementTone = tone;
    }

    if (typeof uploadMaxSizeMb !== 'undefined') {
      const mb = Number(uploadMaxSizeMb);
      if (Number.isFinite(mb) && mb > 0 && mb <= 100) settings.uploadMaxSizeMb = Math.floor(mb);
    }
    if (typeof uploadAllowedMimeTypes !== 'undefined') {
      const val = Array.isArray(uploadAllowedMimeTypes)
        ? uploadAllowedMimeTypes.join(',')
        : String(uploadAllowedMimeTypes || '');
      settings.uploadAllowedMimeTypes = val;
    }

    if (typeof maintenanceMode !== 'undefined') {
      settings.maintenanceMode = Boolean(maintenanceMode);
    }
    if (typeof maintenanceMessage !== 'undefined') {
      settings.maintenanceMessage = maintenanceMessage || null;
    }

    await settings.save();
    return res.json({
      settings: {
        collegeName: settings.collegeName,
        collegeLogoPath: settings.collegeLogoPath,
        academicYear: settings.academicYear,
        contactEmail: settings.contactEmail,
        collegeAddress: settings.collegeAddress,
        globalAnnouncement: settings.globalAnnouncement,
        globalAnnouncementTone: settings.globalAnnouncementTone,
        uploadMaxSizeMb: settings.uploadMaxSizeMb,
        uploadAllowedMimeTypes: settings.uploadAllowedMimeTypes,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  } catch (err) {
    console.error('Update settings error', err);
    return res.status(500).json({ message: 'Failed to update settings' });
  }
});

router.post('/settings/logo', brandingUpload.single('logo'), async (req, res) => {
  try {
    const settings = await ensureSettings();
    if (!req.file) {
      return res.status(400).json({ message: 'Logo file is required' });
    }

    settings.collegeLogoPath = path.join('uploads', 'branding', req.file.filename);
    await settings.save();

    return res.json({
      settings: {
        collegeName: settings.collegeName,
        collegeLogoPath: settings.collegeLogoPath,
        academicYear: settings.academicYear,
        contactEmail: settings.contactEmail,
        collegeAddress: settings.collegeAddress,
        globalAnnouncement: settings.globalAnnouncement,
        globalAnnouncementTone: settings.globalAnnouncementTone,
        uploadMaxSizeMb: settings.uploadMaxSizeMb,
        uploadAllowedMimeTypes: settings.uploadAllowedMimeTypes,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  } catch (err) {
    console.error('Upload college logo error', err);
    return res.status(500).json({ message: 'Failed to upload logo' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [studentsCount, crCount, pendingCrCount, totalContent] = await Promise.all([
      User.count({ where: { role: 'student' } }),
      User.count({ where: { role: 'cr' } }),
      User.count({ where: { role: 'cr_pending' } }),
      Content.count(),
    ]);

    return res.json({
      studentsCount,
      crCount,
      pendingCrCount,
      totalContent,
    });
  } catch (err) {
    console.error('Stats error', err);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await User.findAll({
      where: { role: 'student' },
      attributes: [
        'id',
        'fullName',
        'contactNumber',
        'email',
        'departmentId',
        'divisionId',
        'role',
        'isActive',
        'lastLoginAt',
      ],
      order: [['fullName', 'ASC']],
    });
    return res.json({ students });
  } catch (err) {
    console.error('List students error', err);
    return res.status(500).json({ message: 'Failed to list students' });
  }
});

router.patch('/students/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const { id } = req.params;

    const student = await User.findOne({ where: { id, role: 'student' } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.isActive = Boolean(isActive);
    await student.save();

    return res.json({
      id: student.id,
      isActive: student.isActive,
    });
  } catch (err) {
    console.error('Update student status error', err);
    return res.status(500).json({ message: 'Failed to update student status' });
  }
});

router.post('/crs', async (req, res) => {
  try {
    const {
      fullName,
      contactNumber,
      email,
      password,
      departmentId,
      divisionId,
    } = req.body;

    if (!fullName || !contactNumber || !password || !departmentId || !divisionId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingContact = await User.findOne({ where: { contactNumber } });
    if (existingContact) {
      return res.status(409).json({ message: 'Contact number already in use' });
    }

    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }
    }

    const currentCrCount = await User.count({
      where: {
        role: 'cr',
        departmentId,
        divisionId,
      },
    });

    if (currentCrCount >= 2) {
      return res.status(400).json({
        message: 'CR limit reached for this Department and Division (max 2)',
      });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const cr = await User.create({
      fullName,
      contactNumber,
      email: email || null,
      passwordHash,
      departmentId,
      divisionId,
      role: 'cr',
      isVerifiedCr: true,
      mustChangePassword: true,
      isActive: true,
    });

    return res.status(201).json({
      id: cr.id,
      fullName: cr.fullName,
      contactNumber: cr.contactNumber,
      email: cr.email,
      departmentId: cr.departmentId,
      divisionId: cr.divisionId,
      role: cr.role,
    });
  } catch (err) {
    console.error('Create CR error', err);
    return res.status(500).json({ message: 'Failed to create CR' });
  }
});

// Pending CR applications list
router.get('/cr-requests', async (req, res) => {
  try {
    const requests = await CRApplication.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, attributes: ['fullName', 'contactNumber', 'email', 'departmentId', 'divisionId'] },
        { model: Department, attributes: ['name'] },
        { model: Division, attributes: ['name'] },
      ],
      order: [['createdAt', 'ASC']],
    });
    return res.json({ requests });
  } catch (err) {
    console.error('List CR requests error', err);
    return res.status(500).json({ message: 'Failed to list CR requests' });
  }
});

// Approve CR application
router.patch('/cr-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await CRApplication.findByPk(id, { include: [User] });
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    // CR cap check
    const approvedCount = await User.count({
      where: {
        role: 'cr',
        departmentId: application.departmentId,
        divisionId: application.divisionId,
      },
    });
    if (approvedCount >= 2) {
      return res.status(400).json({ message: 'CR limit reached for this division' });
    }

    // Update user role
    const user = await User.findByPk(application.userId);
    user.role = 'cr';
    user.isVerifiedCr = true;
    user.mustChangePassword = true;
    await user.save();

    application.status = 'approved';
    await application.save();

    return res.json({ message: 'CR request approved', userId: user.id });
  } catch (err) {
    console.error('Approve CR error', err);
    return res.status(500).json({ message: 'Failed to approve request' });
  }
});

// Reject CR application
router.patch('/cr-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const application = await CRApplication.findByPk(id);
    if (!application || application.status !== 'pending') {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    // Reset user role to student
    const user = await User.findByPk(application.userId);
    user.role = 'student';
    await user.save();

    application.status = 'rejected';
    if (remark) application.adminRemark = remark;
    await application.save();

    return res.json({ message: 'CR request rejected', userId: user.id });
  } catch (err) {
    console.error('Reject CR error', err);
    return res.status(500).json({ message: 'Failed to reject request' });
  }
});

router.get('/crs', async (req, res) => {
  try {
    const crs = await User.findAll({
      where: { role: 'cr' },
      attributes: [
        'id',
        'fullName',
        'contactNumber',
        'email',
        'isVerifiedCr',
        'departmentId',
        'divisionId',
        'role',
        'isActive',
        'lastLoginAt',
      ],
      order: [['fullName', 'ASC']],
    });
    return res.json({ crs });
  } catch (err) {
    console.error('List CRs error', err);
    return res.status(500).json({ message: 'Failed to list CRs' });
  }
});

router.get('/content', async (req, res) => {
  try {
    const { departmentId, divisionId } = req.query;
    const where = {};

    if (departmentId) where.departmentId = departmentId;
    if (divisionId) where.divisionId = divisionId;

    const content = await Content.findAll({ where });
    return res.json({ content });
  } catch (err) {
    console.error('Admin list content error', err);
    return res.status(500).json({ message: 'Failed to list content' });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [['name', 'ASC']] });
    return res.json({ departments });
  } catch (err) {
    console.error('List departments error', err);
    return res.status(500).json({ message: 'Failed to list departments' });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: 'Department already exists' });
    }

    const department = await Department.create({ name });
    return res.status(201).json({ department });
  } catch (err) {
    console.error('Create department error', err);
    return res.status(500).json({ message: 'Failed to create department' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (name) {
      department.name = name;
    }

    await department.save();
    return res.json({ department });
  } catch (err) {
    console.error('Update department error', err);
    return res.status(500).json({ message: 'Failed to update department' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    try {
      await department.destroy();
    } catch (err) {
      console.error('Delete department constraint error', err);
      return res.status(400).json({
        message: 'Cannot delete department with related users or content',
      });
    }

    return res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Delete department error', err);
    return res.status(500).json({ message: 'Failed to delete department' });
  }
});

router.get('/divisions', async (req, res) => {
  try {
    const divisions = await Division.findAll({ order: [['name', 'ASC']] });
    return res.json({ divisions });
  } catch (err) {
    console.error('List divisions error', err);
    return res.status(500).json({ message: 'Failed to list divisions' });
  }
});

router.post('/divisions', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const existing = await Division.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ message: 'Division already exists' });
    }

    const division = await Division.create({ name });
    return res.status(201).json({ division });
  } catch (err) {
    console.error('Create division error', err);
    return res.status(500).json({ message: 'Failed to create division' });
  }
});

router.put('/divisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const division = await Division.findByPk(id);
    if (!division) {
      return res.status(404).json({ message: 'Division not found' });
    }

    if (name) {
      division.name = name;
    }

    await division.save();
    return res.json({ division });
  } catch (err) {
    console.error('Update division error', err);
    return res.status(500).json({ message: 'Failed to update division' });
  }
});

router.delete('/divisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const division = await Division.findByPk(id);

    if (!division) {
      return res.status(404).json({ message: 'Division not found' });
    }

    try {
      await division.destroy();
    } catch (err) {
      console.error('Delete division constraint error', err);
      return res.status(400).json({
        message: 'Cannot delete division with related users or content',
      });
    }

    return res.json({ message: 'Division deleted' });
  } catch (err) {
    console.error('Delete division error', err);
    return res.status(500).json({ message: 'Failed to delete division' });
  }
});

module.exports = router;
