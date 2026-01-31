const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = require('./Department')(sequelize, DataTypes);
const Division = require('./Division')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const Content = require('./Content')(sequelize, DataTypes);
const CRApplication = require('./CRApplication')(sequelize, DataTypes);
const SystemSetting = require('./SystemSetting')(sequelize, DataTypes);
const ContentVersion = require('./ContentVersion')(sequelize, DataTypes);

Department.hasMany(User, { foreignKey: 'departmentId' });
User.belongsTo(Department, { foreignKey: 'departmentId' });

Division.hasMany(User, { foreignKey: 'divisionId' });
User.belongsTo(Division, { foreignKey: 'divisionId' });

Department.hasMany(Content, { foreignKey: 'departmentId' });
Content.belongsTo(Department, { foreignKey: 'departmentId' });

Division.hasMany(Content, { foreignKey: 'divisionId' });
Content.belongsTo(Division, { foreignKey: 'divisionId' });

User.hasMany(Content, { foreignKey: 'createdById', as: 'uploads' });

// CR application relations
User.hasMany(CRApplication, { foreignKey: 'userId' });
CRApplication.belongsTo(User, { foreignKey: 'userId' });

Department.hasMany(CRApplication, { foreignKey: 'departmentId' });
Division.hasMany(CRApplication, { foreignKey: 'divisionId' });
CRApplication.belongsTo(Department, { foreignKey: 'departmentId' });
CRApplication.belongsTo(Division, { foreignKey: 'divisionId' });
Content.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

Content.hasMany(ContentVersion, { foreignKey: 'contentId', as: 'versions' });
ContentVersion.belongsTo(Content, { foreignKey: 'contentId' });

User.hasMany(ContentVersion, { foreignKey: 'createdById', as: 'contentVersions' });
ContentVersion.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

module.exports = {
  sequelize,
  Department,
  Division,
  User,
  Content,
  CRApplication,
  SystemSetting,
  ContentVersion,
};
