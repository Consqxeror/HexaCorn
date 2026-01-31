const { SystemSetting } = require('../models');

async function ensureSettings() {
  const [settings] = await SystemSetting.findOrCreate({
    where: { id: 1 },
    defaults: { maintenanceMode: false },
  });
  return settings;
}

function blockWritesDuringMaintenance() {
  return async (req, res, next) => {
    try {
      const settings = await ensureSettings();
      if (settings.maintenanceMode && req.user?.role !== 'admin') {
        return res.status(503).json({
          message: settings.maintenanceMessage || 'System is in maintenance mode. Please try later.',
          code: 'MAINTENANCE_MODE',
        });
      }
      next();
    } catch (err) {
      console.error('Maintenance middleware error', err);
      return res.status(500).json({ message: 'Failed to check system status' });
    }
  };
}

module.exports = { blockWritesDuringMaintenance, ensureSettings };
