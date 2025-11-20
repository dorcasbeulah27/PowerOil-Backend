const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LocationCampaignMapping = sequelize.define(
  "LocationCampaignMapping",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "locations",
        key: "id",
      },
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "campaigns",
        key: "id",
      },
    },
  },
  {
    tableName: "locationCampaignMapping",
    timestamps: true,
  }
);

// LocationCampaignMapping.sync({ force: true })
module.exports = LocationCampaignMapping;



