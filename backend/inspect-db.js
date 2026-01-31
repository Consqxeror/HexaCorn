const { sequelize } = require('./src/config/database');

async function main() {
  const [backupTables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%\\_backup' ESCAPE '\\' ORDER BY name;"
  );

  console.log('backup_tables:', backupTables.map((r) => r.name));

  const [deptDupes] = await sequelize.query(
    "SELECT id, COUNT(*) AS c FROM departments GROUP BY id HAVING c > 1 ORDER BY c DESC;"
  );
  console.log('department_id_dupes:', deptDupes);

  const [deptCount] = await sequelize.query('SELECT COUNT(*) AS c FROM departments;');
  console.log('departments_count:', deptCount);

  const [deptInfo] = await sequelize.query("PRAGMA table_info('departments');");
  console.log('departments_schema:', deptInfo);

  const [deptIndexes] = await sequelize.query("PRAGMA index_list('departments');");
  console.log('departments_indexes:', deptIndexes);

  for (const idx of deptIndexes) {
    const [idxInfo] = await sequelize.query(`PRAGMA index_info('${idx.name}');`);
    console.log(`index_info:${idx.name}:`, idxInfo);
  }
}

main()
  .catch((e) => {
    console.error('inspect-db error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
    }
  });
