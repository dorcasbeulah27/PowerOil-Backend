const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PrizeRule = sequelize.define(
  "PrizeRule",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "campaigns",
        key: "id",
      },
    },
    prizeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "prizes",
        key: "id",
      },
    },
    probability: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
    },
    maxPerDay: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    maxTotal: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = unlimited
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    tableName: "prizeRules",
    timestamps: true,
    indexes: [
      {
        fields: ["campaignId"],
      },
      {
        fields: ["prizeId"],
      },
      {
        unique: true,
        fields: ["campaignId", "prizeId"],
      },
    ],
  }
);

module.exports = PrizeRule;




