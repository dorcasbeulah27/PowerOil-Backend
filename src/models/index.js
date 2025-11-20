const { sequelize } = require("../config/database");
const User = require("./User");
const Campaign = require("./Campaign");
const Location = require("./Location");
const Prize = require("./Prize");
const SpinResult = require("./SpinResult");
const OTP = require("./OTP");
const Admin = require("./Admin");
const LocationCampaignMapping = require("./LocationCampaignMapping");
const PrizeRule = require("./PrizeRule");

// Define relationships

// User - Location
User.belongsTo(Location, { foreignKey: "storeOutletId", as: "storeOutlet" });
Location.hasMany(User, { foreignKey: "storeOutletId", as: "users" });

// Campaign - Admin
Campaign.belongsTo(Admin, { foreignKey: "createdById", as: "creator" });
Admin.hasMany(Campaign, { foreignKey: "createdById", as: "campaigns" });

// PrizeRule relationships
PrizeRule.belongsTo(Campaign, {
  foreignKey: "campaignId",
  as: "campaign",
});
PrizeRule.belongsTo(Prize, {
  foreignKey: "prizeId",
  as: "prize",
});
Campaign.hasMany(PrizeRule, {
  foreignKey: "campaignId",
  as: "prizeRules",
});
Prize.hasMany(PrizeRule, {
  foreignKey: "prizeId",
  as: "rules",
});

// SpinResult - User
SpinResult.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(SpinResult, { foreignKey: "userId", as: "spinResults" });

// SpinResult - Campaign
SpinResult.belongsTo(Campaign, { foreignKey: "campaignId", as: "campaign" });
Campaign.hasMany(SpinResult, { foreignKey: "campaignId", as: "spinResults" });

// SpinResult - Prize
SpinResult.belongsTo(Prize, { foreignKey: "prizeId", as: "prize" });
Prize.hasMany(SpinResult, { foreignKey: "prizeId", as: "spinResults" });

// SpinResult - Location
SpinResult.belongsTo(Location, { foreignKey: "locationId", as: "location" });
Location.hasMany(SpinResult, { foreignKey: "locationId", as: "spinResults" });

// Location - LocationCampaignMapping (Many-to-Many through join table)
Location.belongsToMany(Campaign, {
  through: LocationCampaignMapping,
  foreignKey: "locationId",
  otherKey: "campaignId",
  as: "campaigns",
});
Campaign.belongsToMany(Location, {
  through: LocationCampaignMapping,
  foreignKey: "campaignId",
  otherKey: "locationId",
  as: "locations",
});
LocationCampaignMapping.belongsTo(Location, {
  foreignKey: "locationId",
  as: "location",
});
LocationCampaignMapping.belongsTo(Campaign, {
  foreignKey: "campaignId",
  as: "campaign",
});

module.exports = {
  sequelize,
  User,
  Campaign,
  Location,
  Prize,
  SpinResult,
  OTP,
  Admin,
  LocationCampaignMapping,
  PrizeRule,
};
