const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './database.sqlite',
    logging: false,
  });
}

module.exports = { sequelize };
