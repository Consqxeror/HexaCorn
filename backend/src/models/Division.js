module.exports = (sequelize, DataTypes) => {
  const Division = sequelize.define(
    'Division',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'divisions',
      timestamps: true,
    }
  );

  return Division;
};
