module.exports = (sequelize, DataTypes) => {
  const ContentVersion = sequelize.define(
    'ContentVersion',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      contentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      versionNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM('notice', 'note', 'assignment', 'syllabus'),
        allowNull: false,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'content_versions',
      timestamps: true,
    }
  );

  return ContentVersion;
};
