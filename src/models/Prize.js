const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Prize = sequelize.define(
  "Prize",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: "#FFD700",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "prizes",
    timestamps: true,
    indexes: [
      {
        fields: ["isActive"],
      },
      {
        fields: ["type"],
      },
    ],
  }
);

module.exports = Prize;
