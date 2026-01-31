const { sequelize } = require('./src/config/database');

async function main() {
  console.log('Dropping leftover backup tables if present...');
  await sequelize.query('DROP TABLE IF EXISTS departments_backup;');
  console.log('Dropped: departments_backup (if it existed)');

  const [backupTables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%\\_backup' ESCAPE '\\' ORDER BY name;"
  );
  console.log('Remaining backup tables:', backupTables.map((r) => r.name));
}

main()
  .catch((e) => {
    console.error('repair-drop-backup error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
    }
  });
