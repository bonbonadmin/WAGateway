'use strict';
module.exports = (sequelize, DataTypes) => {
  const Thread = sequelize.define('Thread', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    remoteJid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    threadId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    modifiedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, { 
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'modifiedAt',
  });

  Thread.associate = function(models) {
    // associations can be defined here
  };

  return Thread;
};
