const express = require('express');
const { Op } = require('sequelize');
const { Department, Division, User, Content } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { ensureSettings } = require('../middleware/maintenance');

const router = express.Router();

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [['name', 'ASC']] });
    return res.json({ departments });
  } catch (err) {
    console.error('Public list departments error', err);
    return res.status(500).json({ message: 'Failed to list departments' });
  }
});

router.get('/divisions', async (req, res) => {
  try {
    const divisions = await Division.findAll({ order: [['name', 'ASC']] });
    return res.json({ divisions });
  } catch (err) {
    console.error('Public list divisions error', err);
    return res.status(500).json({ message: 'Failed to list divisions' });
  }
});

router.get('/system', async (req, res) => {
  try {
    const settings = await ensureSettings();
    return res.json({
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      branding: {
        collegeName: settings.collegeName,
        collegeLogoPath: settings.collegeLogoPath,
        academicYear: settings.academicYear,
        contactEmail: settings.contactEmail,
        collegeAddress: settings.collegeAddress,
      },
      globalAnnouncement: settings.globalAnnouncement,
      globalAnnouncementTone: settings.globalAnnouncementTone,
      uploadRules: {
        uploadMaxSizeMb: settings.uploadMaxSizeMb,
        uploadAllowedMimeTypes: settings.uploadAllowedMimeTypes,
      },
    });
  } catch (err) {
    console.error('Public system status error', err);
    return res.status(500).json({ message: 'Failed to load system status' });
  }
});

router.get('/landing', authenticateToken, async (req, res) => {
  try {
    const { departmentId, divisionId, role } = req.user;
    if (!departmentId || !divisionId) {
      return res.status(400).json({ message: 'User missing department or division' });
    }

    if (role === 'admin') {
      return res.json({
        department: null,
        division: null,
        cr: null,
        latestNotice: null,
      });
    }

    const [department, division, cr] = await Promise.all([
      Department.findByPk(departmentId),
      Division.findByPk(divisionId),
      User.findOne({
        where: { role: 'cr', departmentId, divisionId },
        attributes: ['id', 'fullName', 'contactNumber', 'isVerifiedCr'],
        order: [['fullName', 'ASC']],
      }),
    ]);

    const latestNotice = await Content.findOne({
      where: {
        departmentId,
        divisionId,
        category: 'notice',
        [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
      },
      order: [
        ['isPinned', 'DESC'],
        ['pinnedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      attributes: ['id', 'title', 'updatedAt', 'isPinned'],
    });

    return res.json({
      department: department ? { id: department.id, name: department.name } : null,
      division: division ? { id: division.id, name: division.name } : null,
      cr: cr
        ? {
            id: cr.id,
            fullName: cr.fullName,
            contactNumber: cr.contactNumber,
            isVerifiedCr: Boolean(cr.isVerifiedCr),
          }
        : null,
      latestNotice: latestNotice
        ? {
            id: latestNotice.id,
            title: latestNotice.title,
            updatedAt: latestNotice.updatedAt,
            isPinned: latestNotice.isPinned,
          }
        : null,
    });
  } catch (err) {
    console.error('Landing meta error', err);
    return res.status(500).json({ message: 'Failed to load landing data' });
  }
});

module.exports = router;
