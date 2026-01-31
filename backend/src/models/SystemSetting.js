module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define(
    'SystemSetting',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      collegeName: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      collegeLogoPath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      academicYear: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      contactEmail: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      collegeAddress: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      globalAnnouncement: {
        type: DataTypes.STRING(400),
        allowNull: true,
      },
      globalAnnouncementTone: {
        type: DataTypes.ENUM('info', 'success', 'warning', 'danger'),
        allowNull: false,
        defaultValue: 'info',
      },
      uploadMaxSizeMb: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      uploadAllowedMimeTypes: {
        type: DataTypes.STRING(600),
        allowNull: false,
        defaultValue:
          'application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      maintenanceMode: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      maintenanceMessage: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
    },
    {
      tableName: 'system_settings',
      timestamps: true,
    }
  );

  return SystemSetting;
};
