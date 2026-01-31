require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { sequelize, Department, Division, SystemSetting } = require('./models');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const metaRoutes = require('./routes/metaRoutes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir)));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'hexacorn-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meta', metaRoutes);

const PORT = process.env.PORT || 3000;

async function ensureColumn(tableName, columnName, ddlFragment) {
  const [cols] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}';`
  );
  if (Array.isArray(cols) && cols.length > 0) return;
  const pgFragment = ddlFragment
    .replace(/INTEGER NOT NULL DEFAULT/gi, 'INTEGER DEFAULT')
    .replace(/DATETIME/gi, 'TIMESTAMP');
  try {
    await sequelize.query(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${pgFragment};`);
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
}

async function ensureSchema() {
  // users
  await ensureColumn('users', 'semester', 'VARCHAR(20)');
  await ensureColumn('users', 'isVerifiedCr', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'mustChangePassword', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'failedLoginAttempts', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'lockUntil', 'DATETIME');
  await ensureColumn('users', 'lastLoginAt', 'DATETIME');

  // contents
  await ensureColumn('contents', 'expiresAt', 'DATETIME');
  await ensureColumn('contents', 'isPinned', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('contents', 'pinnedAt', 'DATETIME');
  await ensureColumn('contents', 'semester', 'VARCHAR(20)');

  // system settings
  await ensureColumn('system_settings', 'collegeName', 'VARCHAR(200)');
  await ensureColumn('system_settings', 'collegeLogoPath', 'VARCHAR(255)');
  await ensureColumn('system_settings', 'academicYear', 'VARCHAR(40)');
  await ensureColumn('system_settings', 'contactEmail', 'VARCHAR(150)');
  await ensureColumn('system_settings', 'collegeAddress', 'VARCHAR(300)');
  await ensureColumn('system_settings', 'globalAnnouncement', 'VARCHAR(400)');
  await ensureColumn('system_settings', 'globalAnnouncementTone', "VARCHAR(20) NOT NULL DEFAULT 'info'");
  await ensureColumn('system_settings', 'uploadMaxSizeMb', 'INTEGER NOT NULL DEFAULT 10');
  await ensureColumn(
    'system_settings',
    'uploadAllowedMimeTypes',
    "VARCHAR(600) NOT NULL DEFAULT 'application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'"
  );
}

async function seedDefaults() {
  const defaultDepartments = ['MCA', 'Psychology', 'MA', 'BCA', 'BA (Language)'];
  const defaultDivisions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  for (const name of defaultDepartments) {
    await Department.findOrCreate({ where: { name } });
  }

  for (const name of defaultDivisions) {
    await Division.findOrCreate({ where: { name } });
  }

  await SystemSetting.findOrCreate({ where: { id: 1 }, defaults: { maintenanceMode: false } });
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    await sequelize.sync();
    await ensureSchema();
    console.log('Database synchronized');

    await seedDefaults();
    console.log('Default departments and divisions ensured');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`HexaCorn backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
