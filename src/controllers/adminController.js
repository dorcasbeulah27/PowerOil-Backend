const { Op } = require("sequelize");
const dayjs = require("dayjs");
// Require the models index so associations are created before we use includes
const {
  sequelize,
  Campaign,
  Location,
  Prize,
  User,
  SpinResult,
  Admin,
  LocationCampaignMapping,
  PrizeRule,
} = require("../models");
const moment = require("moment");

const formatDate = (date) => {
  if (!date) return null;
  return date.toISOString().split("T")[0]; // returns YYYY-MM-DD
};
// Campaign Management
const createCampaign = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // Extract only campaign fields, explicitly exclude locationId and prizeId
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      spinCooldownDays,
      maxSpinsPerUser,
      totalBudget,
      spentBudget,
      totalParticipants,
      totalSpins,
      totalWins,
    } = req.body;

    const campaign = await Campaign.create({
      name,
      description,
      startDate,
      endDate,
      status,
      spinCooldownDays,
      maxSpinsPerUser,
      totalBudget,
      spentBudget,
      totalParticipants,
      totalSpins,
      totalWins,
      createdById: req.admin.id,
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create campaign error:", error);
    res.status(500).json({
      error: "Failed to create campaign",
      details: error.message,
    });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch campaigns",
      details: error.message,
    });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch campaign",
      details: error.message,
    });
  }
};

const updateCampaign = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const campaign = await Campaign.findByPk(req.params.id, { transaction });

    if (!campaign) {
      await transaction.rollback();
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Extract only campaign fields, explicitly exclude locationId and prizeId
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      spinCooldownDays,
      maxSpinsPerUser,
      totalBudget,
      spentBudget,
      totalParticipants,
      totalSpins,
      totalWins,
    } = req.body;

    await campaign.update({
      name,
      description,
      startDate,
      endDate,
      status,
      spinCooldownDays,
      maxSpinsPerUser,
      totalBudget,
      spentBudget,
      totalParticipants,
      totalSpins,
      totalWins,
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update campaign error:", error);
    res.status(500).json({
      error: "Failed to update campaign",
      details: error.message,
    });
  }
};

const deleteCampaign = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      await transaction.rollback();
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Delete the campaign
    await campaign.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete campaign error:", error);
    res.status(500).json({
      error: "Failed to delete campaign",
      details: error.message,
    });
  }
};

// Location Management
const createLocation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { campaignIds, coordinates, ...locationData } = req.body;

    // Extract latitude and longitude from coordinates object if provided
    if (coordinates) {
      locationData.latitude = coordinates.latitude;
      locationData.longitude = coordinates.longitude;
    }

    // Create location
    const location = await Location.create(locationData, { transaction });

    // Create campaign mappings if provided
    if (campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0) {
      const mappings = campaignIds.map((campaignId) => ({
        locationId: location.id,
        campaignId: campaignId,
      }));

      await LocationCampaignMapping.bulkCreate(mappings, { transaction });
    }

    await transaction.commit();

    // Fetch location with campaigns for response
    const locationWithCampaigns = await Location.findByPk(location.id, {
      include: [
        {
          model: Campaign,
          as: "campaigns",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      location: locationWithCampaigns,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create location error:", error);
    res.status(500).json({ error: "Failed to create location" });
  }
};

const getAllLocations = async (req, res) => {
  try {
    const { state, city, isActive, page = 1, limit = 20 } = req.query;

    let where = {};
    if (state) where.state = state;
    if (city) where.city = city;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const offset = (page - 1) * limit;

    const { count, rows: locations } = await Location.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      locations,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ error: "Failed to get locations" });
  }
};

const getLocationById = async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id, {
      include: [
        {
          model: Campaign,
          as: "campaigns",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Extract campaignIds for easier frontend consumption
    const locationData = location.toJSON();
    locationData.campaignIds = locationData.campaigns
      ? locationData.campaigns.map((campaign) => campaign.id)
      : [];

    res.json({
      success: true,
      location: locationData,
    });
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ error: "Failed to get location" });
  }
};

const updateLocation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { campaignIds, coordinates, ...locationData } = req.body;

    // Extract latitude and longitude from coordinates object if provided
    if (coordinates) {
      locationData.latitude = coordinates.latitude;
      locationData.longitude = coordinates.longitude;
    }

    const location = await Location.findByPk(req.params.id, { transaction });

    if (!location) {
      await transaction.rollback();
      return res.status(404).json({ error: "Location not found" });
    }

    // Update location
    await location.update(locationData, { transaction });

    // Delete existing campaign mappings
    await LocationCampaignMapping.destroy({
      where: { locationId: location.id },
      transaction,
    });

    // Create new campaign mappings if provided
    if (campaignIds && Array.isArray(campaignIds) && campaignIds.length > 0) {
      const mappings = campaignIds.map((campaignId) => ({
        locationId: location.id,
        campaignId: campaignId,
      }));

      await LocationCampaignMapping.bulkCreate(mappings, { transaction });
    }

    await transaction.commit();

    // Fetch location with campaigns for response
    const locationWithCampaigns = await Location.findByPk(location.id, {
      include: [
        {
          model: Campaign,
          as: "campaigns",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    res.json({
      success: true,
      message: "Location updated successfully",
      location: locationWithCampaigns,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update location error:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

const deleteLocation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const location = await Location.findByPk(req.params.id, { transaction });

    if (!location) {
      await transaction.rollback();
      return res.status(404).json({ error: "Location not found" });
    }

    // Delete associated campaign mappings first
    await LocationCampaignMapping.destroy({
      where: { locationId: location.id },
      transaction,
    });

    await location.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete location error:", error);
    res.status(500).json({ error: "Failed to delete location" });
  }
};

// Bulk Upload Locations
const bulkUploadLocations = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { locations } = req.body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: "No locations data provided" });
    }

    const results = [];
    const errors = [];

    // Process each location
    for (let i = 0; i < locations.length; i++) {
      const row = locations[i];
      const rowNumber = i + 1;

      try {
        // Parse location data
        const locationData = {
          name: row.name?.trim(),
          address: row.address?.trim(),
          city: row.city?.trim(),
          state: row.state?.trim(),
          type: row.type?.trim().toLowerCase(),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          radiusMeters: row.radiusMeters
            ? parseInt(row.radiusMeters)
            : 500,
          isActive:
            row.isActive !== undefined && row.isActive !== null
              ? typeof row.isActive === "boolean"
                ? row.isActive
                : row.isActive.toString().toLowerCase() === "true"
              : true,
          contactPerson: row.contactPerson?.trim() || null,
          contactPhone: row.contactPhone?.trim() || null,
        };

        // Validate required fields
        if (
          !locationData.name ||
          !locationData.address ||
          !locationData.city ||
          !locationData.state ||
          !locationData.type ||
          isNaN(locationData.latitude) ||
          isNaN(locationData.longitude)
        ) {
          errors.push({
            row: rowNumber,
            error: "Missing required fields",
            data: row,
          });
          continue;
        }

        // Validate type enum
        const validTypes = ["supermarket", "openmarket", "retailstore", "other"];
        if (!validTypes.includes(locationData.type)) {
          errors.push({
            row: rowNumber,
            error: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
            data: row,
          });
          continue;
        }

        // Create location
        const location = await Location.create(locationData, {
          transaction,
        });

        // Handle campaign mappings if provided
        if (row.campaignIds) {
          let campaignIds = [];
          
          // Handle different formats: single ID, array of IDs, or comma-separated string
          if (Array.isArray(row.campaignIds)) {
            campaignIds = row.campaignIds.map((id) => String(id).trim()).filter(Boolean);
          } else if (typeof row.campaignIds === "string") {
            campaignIds = row.campaignIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean);
          } else {
            // Single value
            campaignIds = [String(row.campaignIds).trim()].filter(Boolean);
          }

          if (campaignIds.length > 0) {
            // Verify campaigns exist
            const existingCampaigns = await Campaign.findAll({
              where: { id: { [Op.in]: campaignIds } },
              transaction,
            });

            if (existingCampaigns.length !== campaignIds.length) {
              errors.push({
                row: rowNumber,
                error: "Some campaign IDs do not exist",
                data: row,
              });
              await location.destroy({ transaction });
              continue;
            }

            const mappings = campaignIds.map((campaignId) => ({
              locationId: location.id,
              campaignId: campaignId,
            }));

            await LocationCampaignMapping.bulkCreate(mappings, {
              transaction,
            });
          }
        }

        results.push({
          row: rowNumber,
          location: {
            id: location.id,
            name: location.name,
          },
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row,
        });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "All rows failed validation",
        errors: errors,
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Successfully uploaded ${results.length} location(s)`,
      created: results.length,
      errors: errors.length,
      details: {
        successful: results,
        failed: errors,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk upload error:", error);
    res.status(500).json({ error: "Failed to process bulk upload" });
  }
};


// Prize Management
const { ValidationError } = require("sequelize");

/** ---------------------------------
 *   CREATE PRIZE
 * ---------------------------------- */
const createPrize = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      description,
      type,
      isActive,
      color,
    } = req.body;

    // ---------------- REQUIRED FIELDS ----------------
    if (!name || !type) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, type",
      });
    }

    // ---------------- CREATE PRIZE (basic fields only) ----------------
    const prize = await Prize.create(
      {
        name,
        description: description || null,
        type,
        isActive: isActive !== undefined ? isActive : true,
        color: color || "#FFD700",
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Prize created successfully",
      prize: prize,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create prize error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        errors: error.errors.map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create prize",
    });
  }
};

/** ---------------------------------
 *   GET ALL PRIZES
 * ---------------------------------- */
const getAllPrizes = async (req, res) => {
  try {
    const { campaignId, type, isActive } = req.query;

    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === "true";

    // If filtering by campaignId, use PrizeRule to find prizes
    if (campaignId) {
      const prizeRules = await PrizeRule.findAll({
        where: { campaignId },
        include: [
          {
            model: Prize,
            as: "prize",
            where,
            required: true,
          },
        ],
      });
      
      const prizes = prizeRules.map((rule) => rule.prize).filter(Boolean);
      
      return res.json({
        success: true,
        prizes: prizes.length > 0 ? prizes : [],
      });
    }

    const prizes = await Prize.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      prizes: prizes.length > 0 ? prizes : [],
    });
  } catch (error) {
    console.error("Get prizes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prizes",
      prizes: [],
    });
  }
};

const getPrizesById = async (req, res) => {
  try {
    const prize = await Prize.findByPk(req.params.id);

    if (!prize) {
      return res.status(404).json({ error: "Prize not found" });
    }

    res.json({
      success: true,
      prize: prize,
    });
  } catch (error) {
    console.error("Get prize error:", error);
    res.status(500).json({ error: "Failed to get prize" });
  }
};

/** ---------------------------------
 *   UPDATE PRIZE
 * ---------------------------------- */
const updatePrize = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, description, type, color, isActive } = req.body;

    const existing = await Prize.findByPk(req.params.id, { transaction });

    if (!existing) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Prize not found",
        prize: {},
      });
    }

    // Update prize basic fields only
    await existing.update(
      {
        name,
        description,
        type,
        color,
        isActive,
      },
      { transaction }
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: "Prize updated successfully",
      prize: existing || {},
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update prize error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
        errors: error.errors.map((e) => e.message),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update prize",
      prize: {},
    });
  }
};

/** ---------------------------------
 *   DELETE PRIZE
 * ---------------------------------- */
const deletePrize = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const prize = await Prize.findByPk(req.params.id, { transaction });

    if (!prize) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Prize not found",
        data: {}, // <<< empty object
      });
    }

    await prize.destroy({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Prize deleted successfully",
      data: {}, // <<< always return object
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete prize error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete prize",
      data: {}, // <<< fallback
    });
  }
};

// Prize Rules Management
const createPrizeRule = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { campaignId, prizeId, probability, maxPerDay, maxTotal, value } = req.body;

    if (!campaignId || !prizeId || probability === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: campaignId, prizeId, probability",
      });
    }

    // Validate probability
    const prob = parseFloat(probability);
    if (isNaN(prob) || prob < 0 || prob > 1) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Probability must be between 0 and 1",
      });
    }

    // Check if rule already exists
    const existing = await PrizeRule.findOne({
      where: { campaignId, prizeId },
      transaction,
    });

    if (existing) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Rule already exists for this campaign-prize combination",
      });
    }

    const rule = await PrizeRule.create(
      {
        campaignId,
        prizeId,
        probability: prob,
        maxPerDay: maxPerDay ? parseInt(maxPerDay) : null,
        maxTotal: maxTotal ? parseInt(maxTotal) : null,
        value: value ? parseFloat(value) : null,
      },
      { transaction }
    );

    await transaction.commit();

    const ruleWithDetails = await PrizeRule.findByPk(rule.id, {
      include: [
        { model: Campaign, as: "campaign", attributes: ["id", "name"] },
        { model: Prize, as: "prize", attributes: ["id", "name"] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Prize rule created successfully",
      rule: ruleWithDetails,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create prize rule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create prize rule",
    });
  }
};

const getAllPrizeRules = async (req, res) => {
  try {
    const { campaignId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (campaignId) where.campaignId = campaignId;

    const offset = (page - 1) * limit;

    const { count, rows: rules } = await PrizeRule.findAndCountAll({
      where,
      include: [
        { model: Campaign, as: "campaign", attributes: ["id", "name"] },
        { model: Prize, as: "prize", attributes: ["id", "name", "type"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.json({
      success: true,
      rules,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Get prize rules error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prize rules",
      rules: [],
    });
  }
};

const getPrizeRuleById = async (req, res) => {
  try {
    const rule = await PrizeRule.findByPk(req.params.id, {
      include: [
        { model: Campaign, as: "campaign", attributes: ["id", "name"] },
        { model: Prize, as: "prize", attributes: ["id", "name", "type"] },
      ],
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: "Prize rule not found",
      });
    }

    return res.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error("Get prize rule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get prize rule",
    });
  }
};

const updatePrizeRule = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { probability, maxPerDay, maxTotal, value } = req.body;

    const rule = await PrizeRule.findByPk(req.params.id, { transaction });

    if (!rule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Prize rule not found",
      });
    }

    // Validate probability if provided
    if (probability !== undefined) {
      const prob = parseFloat(probability);
      if (isNaN(prob) || prob < 0 || prob > 1) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Probability must be between 0 and 1",
        });
      }
    }

    await rule.update(
      {
        probability:
          probability !== undefined
            ? parseFloat(probability)
            : rule.probability,
        maxPerDay:
          maxPerDay !== undefined
            ? maxPerDay
              ? parseInt(maxPerDay)
              : null
            : rule.maxPerDay,
        maxTotal:
          maxTotal !== undefined
            ? maxTotal
              ? parseInt(maxTotal)
              : null
            : rule.maxTotal,
        value:
          value !== undefined
            ? value
              ? parseFloat(value)
              : null
            : rule.value,
      },
      { transaction }
    );

    await transaction.commit();

    const updatedRule = await PrizeRule.findByPk(rule.id, {
      include: [
        { model: Campaign, as: "campaign", attributes: ["id", "name"] },
        { model: Prize, as: "prize", attributes: ["id", "name", "type"] },
      ],
    });

    return res.json({
      success: true,
      message: "Prize rule updated successfully",
      rule: updatedRule,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update prize rule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update prize rule",
    });
  }
};

const deletePrizeRule = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const rule = await PrizeRule.findByPk(req.params.id, { transaction });

    if (!rule) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Prize rule not found",
      });
    }

    await rule.destroy({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Prize rule deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete prize rule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete prize rule",
    });
  }
};

// Analytics and Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    let createdAtFilter = {};
    let spinDateFilter = {};
    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      createdAtFilter = {
        createdAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
      spinDateFilter = {
        spinDate: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }

    let campaignFilter = campaignId ? { campaignId } : {};

    // Total users (by account creation date)
    const totalUsers = await User.count({ where: createdAtFilter });

    // Total spins (by spinDate)
    const totalSpins = await SpinResult.count({
      where: { ...campaignFilter, ...spinDateFilter },
    });

    // Total wins (by spinDate)
    const totalWins = await SpinResult.count({
      where: {
        ...campaignFilter,
        isWin: true,
        ...spinDateFilter,
      },
    });

    // Total redemptions (by redeemedAt date)
    let redemptionDateFilter = {};
    if (startDate && endDate) {
      const start = dayjs(startDate);
      const end = dayjs(endDate);
      redemptionDateFilter = {
        redeemedAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }
    const totalRedemptions = await SpinResult.count({
      where: {
        ...campaignFilter,
        redemptionStatus: "redeemed",
        ...redemptionDateFilter,
      },
    });

    // Win rate
    const winRate =
      totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(2) : 0;

    // Active campaigns
    const now = new Date();
    const activeCampaigns = await Campaign.count({
      where: {
        status: "active",
        // startDate: { [Op.lte]: now },
        // endDate: { [Op.gte]: now },
      },
    });

    // Total locations
    const totalLocations = await Location.count({ where: { isActive: true } });

    // Spins by location
    const spinsByLocationRaw = await SpinResult.findAll({
      where: { ...campaignFilter, ...spinDateFilter },
      attributes: [
        "locationId",
        [sequelize.fn("COUNT", sequelize.col("SpinResult.id")), "count"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN "isWin" = true THEN 1 ELSE 0 END')
          ),
          "wins",
        ],
      ],
      include: [
        {
          model: Location,
          as: "location",
          attributes: ["name"],
        },
      ],
      group: ["locationId", "location.id"],
      order: [[sequelize.literal('"count"'), "DESC"]],
      limit: 10,
      raw: false,
    });

    const spinsByLocation = spinsByLocationRaw.map((item) => ({
      location: item.location ? item.location.name : "Unknown",
      totalSpins: parseInt(item.get("count")),
      totalWins: parseInt(item.get("wins") || 0),
      winRate:
        item.get("count") > 0
          ? ((item.get("wins") / item.get("count")) * 100).toFixed(2)
          : 0,
    }));

    // Prize distribution
    const prizeDistributionRaw = await SpinResult.findAll({
      where: { ...campaignFilter, isWin: true, ...spinDateFilter },
      attributes: [
        "prizeId",
        [sequelize.fn("COUNT", sequelize.col("SpinResult.id")), "count"],
      ],
      include: [
        {
          model: Prize,
          as: "prize",
          attributes: ["name", "type"],
        },
      ],
      group: ["prizeId", "prize.id"],
      order: [[sequelize.literal('"count"'), "DESC"]],
      raw: false,
    });

    const prizeDistribution = prizeDistributionRaw.map((item) => ({
      name: item.prize ? item.prize.name : "Unknown",
      type: item.prize ? item.prize.type : "unknown",
      count: parseInt(item.get("count")),
    }));

    // Daily spins trend (last 7 days for dashboard)
    // Daily spins trend: respect provided date range if given, otherwise default to last 7 days
    const sevenDaysAgo = moment().subtract(7, "days").toDate();
    const dailyWhere =
      spinDateFilter && spinDateFilter.spinDate
        ? { ...campaignFilter, ...spinDateFilter }
        : { ...campaignFilter, spinDate: { [Op.gte]: sevenDaysAgo } };
    const dailySpinsRaw = await SpinResult.findAll({
      where: dailyWhere,
      attributes: [
        [sequelize.fn("DATE", sequelize.col("spinDate")), "date"],
        [sequelize.fn("COUNT", sequelize.col("id")), "spins"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal('CASE WHEN "isWin" = true THEN 1 ELSE 0 END')
          ),
          "wins",
        ],
      ],
      group: [sequelize.fn("DATE", sequelize.col("spinDate"))],
      order: [[sequelize.fn("DATE", sequelize.col("spinDate")), "ASC"]],
      raw: true,
    });

    const dailySpins = dailySpinsRaw.map((item) => ({
      date: item.date,
      spins: parseInt(item.spins),
      wins: parseInt(item.wins || 0),
    }));

    // Recent winners
    const recentWinners = await SpinResult.findAll({
      where: {
        ...campaignFilter,
        isWin: true,
        ...spinDateFilter,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["fullName", "phoneNumber"],
        },
        {
          model: Prize,
          as: "prize",
          attributes: ["name", "type"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["name", "city", "state"],
        },
      ],
      order: [["spinDate", "DESC"]],
      limit: 10,
    });

    // Recent Activity: Combine scans, signups, and redemptions
    // Recent scans (last 20)
    const recentScans = await SpinResult.findAll({
      where: { ...campaignFilter, ...spinDateFilter },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["fullName", "phoneNumber"],
        },
        {
          model: Campaign,
          as: "campaign",
          attributes: ["name"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["name"],
        },
      ],
      order: [["spinDate", "DESC"]],
      limit: 20,
      attributes: ["id", "spinDate", "isWin"],
    });

    // Recent signups (last 20)
    const recentSignups = await User.findAll({
      where: createdAtFilter,
      order: [["createdAt", "DESC"]],
      limit: 20,
      attributes: ["id", "fullName", "phoneNumber", "createdAt"],
    });

    // Recent redemptions (last 20)
    const recentRedemptions = await SpinResult.findAll({
      where: {
        ...campaignFilter,
        redemptionStatus: "redeemed",
        ...redemptionDateFilter,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["fullName", "phoneNumber"],
        },
        {
          model: Prize,
          as: "prize",
          attributes: ["name", "type"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["name"],
        },
      ],
      order: [["redeemedAt", "DESC"]],
      limit: 20,
      attributes: ["id", "redeemedAt", "redemptionCode"],
    });

    // Combine and sort by date
    const activityItems = [
      ...recentScans.map((scan) => ({
        type: "scan",
        id: scan.id,
        date: scan.spinDate,
        user: scan.user,
        campaign: scan.campaign,
        location: scan.location,
        isWin: scan.isWin,
      })),
      ...recentSignups.map((signup) => ({
        type: "signup",
        id: signup.id,
        date: signup.createdAt,
        user: {
          fullName: signup.fullName,
          phoneNumber: signup.phoneNumber,
        },
      })),
      ...recentRedemptions.map((redemption) => ({
        type: "redemption",
        id: redemption.id,
        date: redemption.redeemedAt,
        user: redemption.user,
        prize: redemption.prize,
        location: redemption.location,
        redemptionCode: redemption.redemptionCode,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    // Calculate conversion rates
    const scanToRegistrationRate =
      totalSpins > 0 ? ((totalUsers / totalSpins) * 100).toFixed(2) : "0.00";
    const registrationToRedemptionRate =
      totalUsers > 0
        ? ((totalRedemptions / totalUsers) * 100).toFixed(2)
        : "0.00";

    // Top locations by scans (for Reports section)
    const topLocationsByScans = spinsByLocation
      .map((item) => ({
        location: item.location,
        scans: item.totalSpins,
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10);

    // Prize distribution by type (percentage)
    const totalPrizeCount = prizeDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const prizeDistributionByType = prizeDistribution.map((item) => ({
      type: item.type,
      name: item.name,
      count: item.count,
      percentage:
        totalPrizeCount > 0
          ? ((item.count / totalPrizeCount) * 100).toFixed(1)
          : "0.0",
    }));

    // Activity over time (last 24 hours) - hourly data
    const twentyFourHoursAgo = moment().subtract(24, "hours").toDate();

    // Get all scans in last 24 hours
    const recentScansForActivity = await SpinResult.findAll({
      where: {
        ...campaignFilter,
        spinDate: { [Op.gte]: twentyFourHoursAgo },
      },
      attributes: ["spinDate"],
      raw: true,
    });

    // Get all registrations in last 24 hours
    const recentRegistrationsForActivity = await User.findAll({
      where: {
        createdAt: { [Op.gte]: twentyFourHoursAgo },
      },
      attributes: ["createdAt"],
      raw: true,
    });

    // Initialize hourly map for last 24 hours
    const hourlyMap = new Map();
    for (let i = 23; i >= 0; i--) {
      const hour = moment().subtract(i, "hours").startOf("hour");
      const hourKey = hour.format("YYYY-MM-DD HH:00:00");
      hourlyMap.set(hourKey, {
        time: hour.format("HH:mm"),
        scans: 0,
        registrations: 0,
        spins: 0,
      });
    }

    // Count scans by hour
    recentScansForActivity.forEach((scan) => {
      const hour = moment(scan.spinDate).startOf("hour");
      const hourKey = hour.format("YYYY-MM-DD HH:00:00");
      if (hourlyMap.has(hourKey)) {
        hourlyMap.get(hourKey).scans += 1;
        hourlyMap.get(hourKey).spins += 1;
      }
    });

    // Count registrations by hour
    recentRegistrationsForActivity.forEach((reg) => {
      const hour = moment(reg.createdAt).startOf("hour");
      const hourKey = hour.format("YYYY-MM-DD HH:00:00");
      if (hourlyMap.has(hourKey)) {
        hourlyMap.get(hourKey).registrations += 1;
      }
    });

    const activityOverTime = Array.from(hourlyMap.values());

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSpins,
        totalWins,
        totalRedemptions,
        winRate: parseFloat(winRate),
        activeCampaigns,
        totalLocations,
        scanToRegistrationRate: parseFloat(scanToRegistrationRate),
        registrationToRedemptionRate: parseFloat(registrationToRedemptionRate),
      },
      spinsByLocation,
      prizeDistribution,
      prizeDistributionByType,
      dailySpins,
      recentWinners,
      recentActivity: activityItems,
      topLocationsByScans,
      activityOverTime,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
};

// Reports API - Dedicated endpoint for Reports screen
const getReportsStats = async (req, res) => {
  try {
    const { campaignId, startDate, endDate } = req.query;
    let createdAtFilter = {};
    let spinDateFilter = {};

    // Handle date filtering - ensure full day coverage
    if (startDate && endDate) {
      // Parse dates and ensure full day coverage
      // Parse as local date strings (YYYY-MM-DD) and convert to start/end of day
      const startMoment = moment(startDate, "YYYY-MM-DD").startOf("day");
      const endMoment = moment(endDate, "YYYY-MM-DD").endOf("day");

      // Convert to Date objects for Sequelize
      const start = startMoment.toDate();
      const end = endMoment.toDate();

      createdAtFilter = {
        createdAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
      spinDateFilter = {
        spinDate: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }

    let campaignFilter = campaignId ? { campaignId } : {};

    // Total users (by account creation date)
    // If no date filter, count all users; otherwise use the filter
    const totalUsers =
      Object.keys(createdAtFilter).length > 0
        ? await User.count({ where: createdAtFilter })
        : await User.count();

    // Total spins (by spinDate) - build where clause properly
    const spinsWhere = { ...campaignFilter };
    if (Object.keys(spinDateFilter).length > 0) {
      Object.assign(spinsWhere, spinDateFilter);
    }
    const totalSpins = await SpinResult.count({
      where: spinsWhere,
    });

    // Total redemptions (by redeemedAt date)
    let redemptionDateFilter = {};
    if (startDate && endDate) {
      const startMoment = moment(startDate, "YYYY-MM-DD").startOf("day");
      const endMoment = moment(endDate, "YYYY-MM-DD").endOf("day");
      const start = startMoment.toDate();
      const end = endMoment.toDate();
      redemptionDateFilter = {
        redeemedAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }
    const redemptionWhere = { ...campaignFilter, redemptionStatus: "redeemed" };
    if (Object.keys(redemptionDateFilter).length > 0) {
      Object.assign(redemptionWhere, redemptionDateFilter);
    }
    const totalRedemptions = await SpinResult.count({
      where: redemptionWhere,
    });

    // Calculate conversion rates
    const scanToRegistrationRate =
      totalSpins > 0 ? ((totalUsers / totalSpins) * 100).toFixed(2) : "0.00";
    const registrationToRedemptionRate =
      totalUsers > 0
        ? ((totalRedemptions / totalUsers) * 100).toFixed(2)
        : "0.00";

    // Spins by location
    const locationWhere = { ...campaignFilter };
    if (Object.keys(spinDateFilter).length > 0) {
      Object.assign(locationWhere, spinDateFilter);
    }
    const spinsByLocationRaw = await SpinResult.findAll({
      where: locationWhere,
      attributes: [
        "locationId",
        [sequelize.fn("COUNT", sequelize.col("SpinResult.id")), "count"],
      ],
      include: [
        {
          model: Location,
          as: "location",
          attributes: ["name"],
        },
      ],
      group: ["locationId", "location.id"],
      order: [[sequelize.literal('"count"'), "DESC"]],
      limit: 10,
      raw: false,
    });

    const topLocationsByScans = spinsByLocationRaw
      .map((item) => ({
        location: item.location ? item.location.name : "Unknown",
        scans: parseInt(item.get("count")),
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10);

    // Prize distribution
    const prizeWhere = { ...campaignFilter, isWin: true };
    if (Object.keys(spinDateFilter).length > 0) {
      Object.assign(prizeWhere, spinDateFilter);
    }
    const prizeDistributionRaw = await SpinResult.findAll({
      where: prizeWhere,
      attributes: [
        "prizeId",
        [sequelize.fn("COUNT", sequelize.col("SpinResult.id")), "count"],
      ],
      include: [
        {
          model: Prize,
          as: "prize",
          attributes: ["name", "type"],
        },
      ],
      group: ["prizeId", "prize.id"],
      order: [[sequelize.literal('"count"'), "DESC"]],
      raw: false,
    });

    const totalPrizeCount = prizeDistributionRaw.reduce(
      (sum, item) => sum + parseInt(item.get("count")),
      0
    );

    const prizeDistributionByType = prizeDistributionRaw.map((item) => ({
      type: item.prize ? item.prize.type : "unknown",
      name: item.prize ? item.prize.name : "Unknown",
      count: parseInt(item.get("count")),
      percentage:
        totalPrizeCount > 0
          ? ((parseInt(item.get("count")) / totalPrizeCount) * 100).toFixed(1)
          : "0.0",
    }));

    // Hourly Activity (last 24 hours) - formatted for bar chart
    const twentyFourHoursAgo = moment().subtract(24, "hours").toDate();

    // Get all scans in last 24 hours
    const recentScansForActivity = await SpinResult.findAll({
      where: {
        ...campaignFilter,
        spinDate: { [Op.gte]: twentyFourHoursAgo },
      },
      attributes: ["spinDate"],
      raw: true,
    });

    // Get all registrations in last 24 hours
    const recentRegistrationsForActivity = await User.findAll({
      where: {
        createdAt: { [Op.gte]: twentyFourHoursAgo },
      },
      attributes: ["createdAt"],
      raw: true,
    });

    // Initialize hourly map for last 24 hours with formatted time ranges
    const hourlyMap = new Map();
    for (let i = 23; i >= 0; i--) {
      const hourStart = moment().subtract(i, "hours").startOf("hour");
      const hourEnd = moment(hourStart).add(1, "hour");
      const hourKey = hourStart.format("YYYY-MM-DD HH:00:00");

      // Format: "DD-Mon HH:00 - HH:00"
      const timeRange = `${hourStart.format("DD-MMM HH:00")} - ${hourEnd.format(
        "HH:00"
      )}`;

      hourlyMap.set(hourKey, {
        timeRange: timeRange,
        scans: 0,
        registrations: 0,
        spins: 0,
      });
    }

    // Count scans by hour
    recentScansForActivity.forEach((scan) => {
      const hour = moment(scan.spinDate).startOf("hour");
      const hourKey = hour.format("YYYY-MM-DD HH:00:00");
      if (hourlyMap.has(hourKey)) {
        hourlyMap.get(hourKey).scans += 1;
        hourlyMap.get(hourKey).spins += 1;
      }
    });

    // Count registrations by hour
    recentRegistrationsForActivity.forEach((reg) => {
      const hour = moment(reg.createdAt).startOf("hour");
      const hourKey = hour.format("YYYY-MM-DD HH:00:00");
      if (hourlyMap.has(hourKey)) {
        hourlyMap.get(hourKey).registrations += 1;
      }
    });

    const hourlyActivity = Array.from(hourlyMap.values());

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSpins,
        totalRedemptions,
        scanToRegistrationRate: parseFloat(scanToRegistrationRate),
        registrationToRedemptionRate: parseFloat(registrationToRedemptionRate),
      },
      topLocationsByScans,
      prizeDistributionByType,
      hourlyActivity,
    });
  } catch (error) {
    console.error("Get reports stats error:", error);
    res.status(500).json({ error: "Failed to get reports stats" });
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let where = {};
    if (search) {
      where = {
        [Op.or]: [
          { fullName: { [Op.iLike]: `%${search}%` } },
          { phoneNumber: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        {
          model: Location,
          as: "storeOutlet",
          attributes: ["name", "city", "state"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
};

const getSpinHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, campaignId, locationId, userId } = req.query;

    let where = {};
    if (campaignId) where.campaignId = campaignId;
    if (locationId) where.locationId = locationId;
    if (userId) where.userId = userId;

    const offset = (page - 1) * limit;

    const { count, rows: spins } = await SpinResult.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "phoneNumber", "email"],
        },
        {
          model: Campaign,
          as: "campaign",
          attributes: ["id", "name"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["id", "name", "city", "state", "address"],
        },
        {
          model: Prize,
          as: "prize",
          attributes: ["id", "name", "type", "description", "color"],
        },
      ],
      order: [["spinDate", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get prize values from PrizeRule in bulk
    // Use a Set with stringified objects to get unique pairs
    const uniquePairs = new Set();
    spins.forEach((spin) => {
      uniquePairs.add(JSON.stringify({ campaignId: spin.campaignId, prizeId: spin.prizeId }));
    });

    const prizeRules = await PrizeRule.findAll({
      where: {
        [Op.or]: Array.from(uniquePairs).map((pairStr) => {
          const pair = JSON.parse(pairStr);
          return { campaignId: pair.campaignId, prizeId: pair.prizeId };
        }),
      },
      attributes: ["campaignId", "prizeId", "value"],
    });

    // Create a map for quick lookup using stringified objects as keys
    const prizeRuleMap = new Map();
    prizeRules.forEach((rule) => {
      const key = JSON.stringify({ campaignId: rule.campaignId, prizeId: rule.prizeId });
      prizeRuleMap.set(key, rule.value ? parseFloat(rule.value) : 0);
    });

    // Add values to spins
    const spinsWithValues = spins.map((spin) => {
      const key = JSON.stringify({ campaignId: spin.campaignId, prizeId: spin.prizeId });
      const originalValue = prizeRuleMap.get(key) || 0;
      // Remaining value: if redeemed, it's 0; otherwise it's the original value
      const remainingValue =
        spin.redemptionStatus === "redeemed" ? 0 : originalValue;

      return {
        ...spin.toJSON(),
        originalPrizeValue: originalValue,
        remainingValue: remainingValue,
      };
    });

    res.json({
      success: true,
      spins: spinsWithValues,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
    });
  } catch (error) {
    console.error("Get spin history error:", error);
    res.status(500).json({ error: "Failed to get spin history" });
  }
};

// Registered Users Report - Export endpoint
const getRegisteredUsersReport = async (req, res) => {
  try {
    const { campaignId, startDate, endDate, limit } = req.query;
    let createdAtFilter = {};

    // Handle date filtering
    if (startDate && endDate) {
      const startMoment = moment(startDate, "YYYY-MM-DD").startOf("day");
      const endMoment = moment(endDate, "YYYY-MM-DD").endOf("day");
      const start = startMoment.toDate();
      const end = endMoment.toDate();

      createdAtFilter = {
        createdAt: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }

    // If campaignId is provided, filter users who have spins in that campaign
    let userIds = null;
    if (campaignId) {
      const spins = await SpinResult.findAll({
        where: { campaignId },
        attributes: ["userId"],
        group: ["userId"],
        raw: true,
      });
      userIds = spins.map((spin) => spin.userId);
      if (userIds.length === 0) {
        return res.json({
          success: true,
          users: [],
          total: 0,
        });
      }
    }

    let where = {};
    if (Object.keys(createdAtFilter).length > 0) {
      Object.assign(where, createdAtFilter);
    }
    if (userIds) {
      where.id = { [Op.in]: userIds };
    }

    const queryOptions = {
      where,
      include: [
        {
          model: Location,
          as: "storeOutlet",
          attributes: ["name", "city", "state", "address"],
        },
      ],
      order: [["createdAt", "DESC"]],
    };

    // Add limit if provided
    if (limit && !isNaN(parseInt(limit))) {
      queryOptions.limit = parseInt(limit);
    }

    const users = await User.findAll(queryOptions);

    // Format users for report
    const reportData = users.map((user) => ({
      phoneNumber: user.phoneNumber || "",
      name: user.fullName || "",
      email: user.email || "",
      gender: user.gender || "",
      location: user.storeOutlet
        ? `${user.storeOutlet.name || ""}, ${user.storeOutlet.city || ""}, ${user.storeOutlet.state || ""}`.trim()
        : "",
      dateAndTime: user.createdAt
        ? moment(user.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : "",
    }));

    // Get total count for display purposes
    const totalCount = await User.count({ where });

    res.json({
      success: true,
      users: reportData,
      total: totalCount,
    });
  } catch (error) {
    console.error("Get registered users report error:", error);
    res.status(500).json({ error: "Failed to get registered users report" });
  }
};

// Winning Details Report - Export endpoint
const getWinningDetailsReport = async (req, res) => {
  try {
    const { campaignId, startDate, endDate, limit } = req.query;
    let spinDateFilter = {};

    // Handle date filtering
    if (startDate && endDate) {
      const startMoment = moment(startDate, "YYYY-MM-DD").startOf("day");
      const endMoment = moment(endDate, "YYYY-MM-DD").endOf("day");
      const start = startMoment.toDate();
      const end = endMoment.toDate();

      spinDateFilter = {
        spinDate: {
          [Op.gte]: start,
          [Op.lte]: end,
        },
      };
    }

    let where = {};
    if (campaignId) where.campaignId = campaignId;
    if (Object.keys(spinDateFilter).length > 0) {
      Object.assign(where, spinDateFilter);
    }

    const queryOptions = {
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "phoneNumber"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["name", "city", "state"],
        },
        {
          model: Prize,
          as: "prize",
          attributes: ["id", "name", "type"],
        },
        {
          model: Campaign,
          as: "campaign",
          attributes: ["id", "name", "totalBudget", "spentBudget"],
        },
      ],
      order: [["spinDate", "DESC"]],
    };

    // Add limit if provided
    if (limit && !isNaN(parseInt(limit))) {
      queryOptions.limit = parseInt(limit);
    }

    const spins = await SpinResult.findAll(queryOptions);

    // Get prize rules for all spins to get prize values
    const prizeRuleMap = new Map();
    if (spins.length > 0) {
      const campaignIds = [...new Set(spins.map(s => s.campaignId).filter(Boolean))];
      const prizeIds = [...new Set(spins.map(s => s.prizeId).filter(Boolean))];
      
      if (campaignIds.length > 0 && prizeIds.length > 0) {
        const prizeRules = await PrizeRule.findAll({
          where: {
            campaignId: { [Op.in]: campaignIds },
            prizeId: { [Op.in]: prizeIds },
          },
          attributes: ["campaignId", "prizeId", "value"],
        });
        
        prizeRules.forEach(rule => {
          const key = `${rule.campaignId}_${rule.prizeId}`;
          prizeRuleMap.set(key, rule.value);
        });
      }
    }

    // Format spins for report
    const reportData = spins.map((spin) => {
      const campaign = spin.campaign || {};
      const campaignBudget = campaign.totalBudget ? parseFloat(campaign.totalBudget) : 0;
      const spentBudget = campaign.spentBudget ? parseFloat(campaign.spentBudget) : 0;
      const leftoverBudget = campaignBudget - spentBudget;
      
      // Get prize value from prize rule
      const prizeRuleKey = `${spin.campaignId}_${spin.prizeId}`;
      const prizeValue = prizeRuleMap.get(prizeRuleKey) || 0;
      
      return {
        phoneNumber: spin.user?.phoneNumber || "",
        name: spin.user?.fullName || "",
        location: spin.location
          ? `${spin.location.name || ""}, ${spin.location.city || ""}, ${spin.location.state || ""}`.trim()
          : "",
        dateAndTime: spin.spinDate
          ? moment(spin.spinDate).format("YYYY-MM-DD HH:mm:ss")
          : "",
        prizeWon: spin.isWin
          ? spin.prize?.name || ""
          : "Better Luck Next Time",
        couponCode: spin.isWin ? (spin.redemptionCode || "") : "",
        campaignName: campaign.name || "",
        campaignBudget: campaignBudget.toFixed(2),
        prizeValue: prizeValue ? parseFloat(prizeValue).toFixed(2) : "0.00",
        status: spin.redemptionStatus || (spin.isWin ? "pending" : "lossprize"),
        leftoverBudget: leftoverBudget.toFixed(2),
      };
    });

    // Get total count for display purposes
    const totalCount = await SpinResult.count({ where });

    res.json({
      success: true,
      spins: reportData,
      total: totalCount,
    });
  } catch (error) {
    console.error("Get winning details report error:", error);
    res.status(500).json({ error: "Failed to get winning details report" });
  }
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
  bulkUploadLocations,
  createPrize,
  getAllPrizes,
  getPrizesById,
  updatePrize,
  deletePrize,
  createPrizeRule,
  getAllPrizeRules,
  getPrizeRuleById,
  updatePrizeRule,
  deletePrizeRule,
  getDashboardStats,
  getReportsStats,
  getUsers,
  getSpinHistory,
  getRegisteredUsersReport,
  getWinningDetailsReport,
};
