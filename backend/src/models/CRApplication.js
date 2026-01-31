module.exports = (sequelize, DataTypes) => {
  const CRApplication = sequelize.define(
    'CRApplication',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      contactNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      adminRemark: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      divisionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'cr_applications',
      timestamps: true,
    }
  );

  return CRApplication;
};
