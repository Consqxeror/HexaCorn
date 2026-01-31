const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || process.env.SQLITE_PATH || './database.sqlite',
  logging: false,
});

module.exports = { sequelize };
