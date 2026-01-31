const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { Content, ContentVersion } = require('../models');
const { blockWritesDuringMaintenance, ensureSettings } = require('../middleware/maintenance');

const router = express.Router();

function blockCrUntilPasswordChanged() {
  return (req, res, next) => {
    if (req.user?.role === 'cr' && req.user?.mustChangePassword) {
      return res.status(403).json({
        message: 'You must change your password before uploading or editing content.',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }
    next();
  };
}

const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
const versionsDir = path.join(uploadDir, 'versions');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(versionsDir)) {
  fs.mkdirSync(versionsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

async function enforceUploadRules(req, res) {
  const settings = await ensureSettings();
  const allowedRaw = String(settings.uploadAllowedMimeTypes || '');
  const allowed = new Set(
    allowedRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  );

  const maxMb = Number(settings.uploadMaxSizeMb || 10);
  const maxBytes = Math.max(1, Math.floor(maxMb)) * 1024 * 1024;

  if (req.file) {
    if (allowed.size > 0 && !allowed.has(req.file.mimetype)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
      }
      res.status(400).json({
        message: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedMimeTypes: Array.from(allowed),
      });
      return false;
    }

    if (req.file.size > maxBytes) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
      }
      res.status(400).json({
        message: `File too large. Max allowed is ${Math.floor(maxBytes / (1024 * 1024))}MB`,
        code: 'FILE_TOO_LARGE',
        maxSizeMb: Math.floor(maxBytes / (1024 * 1024)),
      });
      return false;
    }
  }

  return true;
}

router.post(
  '/',
  authenticateToken,
  blockWritesDuringMaintenance(),
  requireRole('cr'),
  blockCrUntilPasswordChanged(),
  upload.single('file'),
  async (req, res) => {
    try {
      const { title, description, category, dueDate, expiresAt, semester, allowDuplicate } = req.body;
      const { id: userId, departmentId, divisionId } = req.user;

      if (!title || !category) {
        return res.status(400).json({ message: 'Title and category are required' });
      }

      const validCategories = ['notice', 'note', 'assignment', 'syllabus'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }

      if (!departmentId || !divisionId) {
        return res
          .status(400)
          .json({ message: 'CR must be associated with a department and division' });
      }

      const ok = await enforceUploadRules(req, res);
      if (!ok) return;

      const targetSemester = semester ? String(semester) : null;

      const existing = await Content.findOne({
        where: {
          title,
          category,
          departmentId,
          divisionId,
          semester: targetSemester,
        },
      });

      if (existing && String(allowDuplicate || '') !== 'true') {
        return res.status(409).json({
          message: 'Duplicate upload detected (same title for same division and semester)',
          code: 'DUPLICATE_UPLOAD',
          existingId: existing.id,
        });
      }

      const filePath = req.file ? path.join('uploads', req.file.filename) : null;

      const content = await Content.create({
        title,
        description: description || null,
        category,
        filePath,
        dueDate: dueDate || null,
        expiresAt: expiresAt || null,
        departmentId,
        divisionId,
        semester: targetSemester,
        createdById: userId,
      });

      return res.status(201).json({ content });
    } catch (err) {
      console.error('Create content error', err);
      return res.status(500).json({ message: 'Failed to create content' });
    }
  }
);

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, departmentId, divisionId, semester } = req.user;
    const { category } = req.query;

    const where = {};

    if (role === 'student' || role === 'cr') {
      if (!departmentId || !divisionId) {
        return res.status(400).json({ message: 'User missing department or division' });
      }

      where.departmentId = departmentId;
      where.divisionId = divisionId;
    }

    if (role === 'student') {
      if (semester) {
        where[Op.or] = [{ semester: null }, { semester: String(semester) }];
      }
    }

    if (role === 'admin') {
      if (req.query.departmentId) where.departmentId = req.query.departmentId;
      if (req.query.divisionId) where.divisionId = req.query.divisionId;
    }

    if (role === 'admin' || role === 'cr') {
      if (req.query.semester) where.semester = String(req.query.semester);
    }

    if (category) {
      where.category = category;
    }

    const activeClause = { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }] };
    if (where[Op.or]) {
      where[Op.and] = [activeClause];
    } else {
      Object.assign(where, activeClause);
    }

    const order = [];
    if (!category || category === 'notice') {
      order.push(['isPinned', 'DESC']);
      order.push(['pinnedAt', 'DESC']);
    }
    order.push(['createdAt', 'DESC']);

    const items = await Content.findAll({
      where,
      order,
    });

    return res.json({ items });
  } catch (err) {
    console.error('List content error', err);
    return res.status(500).json({ message: 'Failed to list content' });
  }
});

router.get('/archive', authenticateToken, async (req, res) => {
  try {
    const { role, departmentId, divisionId, semester } = req.user;
    const { category } = req.query;

    const where = {
      expiresAt: { [Op.lte]: new Date() },
    };

    if (role === 'student' || role === 'cr') {
      if (!departmentId || !divisionId) {
        return res.status(400).json({ message: 'User missing department or division' });
      }
      where.departmentId = departmentId;
      where.divisionId = divisionId;
    }

    if (role === 'student') {
      if (semester) {
        where[Op.or] = [{ semester: null }, { semester: String(semester) }];
      }
    }

    if (role === 'admin') {
      if (req.query.departmentId) where.departmentId = req.query.departmentId;
      if (req.query.divisionId) where.divisionId = req.query.divisionId;
    }

    if (role === 'admin' || role === 'cr') {
      if (req.query.semester) where.semester = String(req.query.semester);
    }

    if (category) where.category = category;

    const items = await Content.findAll({
      where,
      order: [['expiresAt', 'DESC'], ['updatedAt', 'DESC']],
    });

    return res.json({ items });
  } catch (err) {
    console.error('List archive content error', err);
    return res.status(500).json({ message: 'Failed to list archive' });
  }
});

router.get('/mine', authenticateToken, requireRole('cr'), async (req, res) => {
  try {
    const { id: userId } = req.user;
    const items = await Content.findAll({
      where: { createdById: userId },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ items });
  } catch (err) {
    console.error('List own content error', err);
    return res.status(500).json({ message: 'Failed to list own content' });
  }
});

router.put(
  '/:id',
  authenticateToken,
  blockWritesDuringMaintenance(),
  requireRole('cr'),
  blockCrUntilPasswordChanged(),
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      const { title, description, category, dueDate, expiresAt, semester } = req.body;

      const content = await Content.findByPk(id);
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      if (content.createdById !== userId) {
        return res
          .status(403)
          .json({ message: 'Cannot edit content created by others' });
      }

      const prev = {
        title: content.title,
        description: content.description,
        category: content.category,
        filePath: content.filePath,
        dueDate: content.dueDate,
        expiresAt: content.expiresAt,
      };

      if (category) {
        const validCategories = ['notice', 'note', 'assignment', 'syllabus'];
        if (!validCategories.includes(category)) {
          return res.status(400).json({ message: 'Invalid category' });
        }
        content.category = category;
      }

      if (title) content.title = title;
      if (typeof description !== 'undefined') {
        content.description = description || null;
      }

      if (typeof dueDate !== 'undefined') {
        content.dueDate = dueDate || null;
      }

      if (typeof expiresAt !== 'undefined') {
        content.expiresAt = expiresAt || null;
      }

      if (typeof semester !== 'undefined') {
        content.semester = semester ? String(semester) : null;
      }

      let fileReplaced = false;

      if (req.file) {
        const ok = await enforceUploadRules(req, res);
        if (!ok) return;
        if (content.filePath) {
          const oldAbsPath = path.join(__dirname, '..', '..', content.filePath);
          if (fs.existsSync(oldAbsPath)) {
            const base = path.basename(content.filePath);
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}`;
            const nextAbs = path.join(versionsDir, unique);
            try {
              fs.renameSync(oldAbsPath, nextAbs);
              prev.filePath = path.join('uploads', 'versions', unique);
              fileReplaced = true;
            } catch (e) {
              console.error('Failed to move old file into versions directory', e);
            }
          }
        }

        content.filePath = path.join('uploads', req.file.filename);
      }

      if (fileReplaced) {
        const latest = await ContentVersion.max('versionNumber', { where: { contentId: content.id } });
        const nextVersion = (Number.isFinite(latest) ? latest : 0) + 1;
        await ContentVersion.create({
          contentId: content.id,
          versionNumber: nextVersion,
          title: prev.title,
          description: prev.description,
          category: prev.category,
          filePath: prev.filePath,
          dueDate: prev.dueDate,
          expiresAt: prev.expiresAt,
          createdById: userId,
        });
      }

      await content.save();

      return res.json({ content });
    } catch (err) {
      console.error('Update content error', err);
      return res.status(500).json({ message: 'Failed to update content' });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  blockWritesDuringMaintenance(),
  requireRole('cr'),
  blockCrUntilPasswordChanged(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { id: userId, role } = req.user;

      const content = await Content.findByPk(id);
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }

      if (role === 'cr' && content.createdById !== userId) {
        return res.status(403).json({ message: 'Cannot delete content created by others' });
      }

      if (content.filePath) {
        const absolutePath = path.join(__dirname, '..', '..', content.filePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }

      await content.destroy();

      return res.json({ message: 'Content deleted' });
    } catch (err) {
      console.error('Delete content error', err);
      return res.status(500).json({ message: 'Failed to delete content' });
    }
  }
);

router.patch(
  '/:id/pin',
  authenticateToken,
  blockWritesDuringMaintenance(),
  requireRole('cr'),
  blockCrUntilPasswordChanged(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { departmentId, divisionId } = req.user;

      const content = await Content.findByPk(id);
      if (!content) return res.status(404).json({ message: 'Content not found' });

      if (content.category !== 'notice') {
        return res.status(400).json({ message: 'Only notices can be pinned' });
      }

      if (content.departmentId !== departmentId || content.divisionId !== divisionId) {
        return res.status(403).json({ message: 'Cannot pin notice outside your division' });
      }

      await Content.update(
        { isPinned: false, pinnedAt: null },
        {
          where: {
            id: { [Op.ne]: content.id },
            category: 'notice',
            isPinned: true,
            departmentId,
            divisionId,
          },
        }
      );

      content.isPinned = true;
      content.pinnedAt = new Date();
      await content.save();

      return res.json({ content });
    } catch (err) {
      console.error('Pin notice error', err);
      return res.status(500).json({ message: 'Failed to pin notice' });
    }
  }
);

router.patch(
  '/:id/unpin',
  authenticateToken,
  blockWritesDuringMaintenance(),
  requireRole('cr'),
  blockCrUntilPasswordChanged(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { departmentId, divisionId } = req.user;
      const content = await Content.findByPk(id);
      if (!content) return res.status(404).json({ message: 'Content not found' });

      if (content.departmentId !== departmentId || content.divisionId !== divisionId) {
        return res.status(403).json({ message: 'Cannot unpin notice outside your division' });
      }

      content.isPinned = false;
      content.pinnedAt = null;
      await content.save();

      return res.json({ content });
    } catch (err) {
      console.error('Unpin notice error', err);
      return res.status(500).json({ message: 'Failed to unpin notice' });
    }
  }
);

router.get('/:id/versions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, departmentId, divisionId } = req.user;

    const content = await Content.findByPk(id);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    if (role === 'student' || role === 'cr') {
      if (content.departmentId !== departmentId || content.divisionId !== divisionId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const versions = await ContentVersion.findAll({
      where: { contentId: content.id },
      order: [
        ['versionNumber', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return res.json({ versions });
  } catch (err) {
    console.error('List versions error', err);
    return res.status(500).json({ message: 'Failed to list versions' });
  }
});

module.exports = router;
