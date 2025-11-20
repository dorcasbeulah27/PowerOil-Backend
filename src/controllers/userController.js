const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("../models/User");
const Campaign = require("../models/Campaign");
const Location = require("../models/Location");
const Prize = require("../models/Prize");
const SpinResult = require("../models/SpinResult");
const PrizeRule = require("../models/PrizeRule");
const { sendOTP, verifyOTP } = require("../services/otpService");
const {
  verifyUserLocation,
  getNearbyLocations,
} = require("../services/locationService");
const {
  selectPrize,
  getAvailablePrizes,
  generateRedemptionCode,
} = require("../services/prizeService");
const moment = require("moment");

const registerUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      fullName,
      phoneNumber,
      email,
      gender,
      state,
      city,
      storeOutlet,
      consentGiven,
      deviceId,
      ipAddress,
    } = req.body;

    // Validate required fields
    if (
      !fullName ||
      !phoneNumber ||
      !gender ||
      // !state ||
      // !city ||
      !storeOutlet ||
      !consentGiven
    ) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { phoneNumber }, transaction });

    if (user) {
      await transaction.rollback();
      return res.status(201).json({
        success: true,
        message: "User already exists",
        userId: user.id,
        user: {
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          phoneVerified: user.phoneVerified,
        },
      });
    }

    // Verify location exists
    const location = await Location.findByPk(storeOutlet, { transaction });
    if (!location || !location.isActive) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "Invalid or inactive store location" });
    }

    // Create new user
    user = await User.create({
      fullName,
      phoneNumber,
      email,
      gender,
      // state: null,
      // city: null,
      storeOutletId: storeOutlet,
      consentGiven,
      deviceId,
      ipAddress,
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: user.id,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

const requestOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const result = await sendOTP(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error("OTP request error:", error);
    res.status(500).json({ error: error.message });
  }
};

const verifyPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res
        .status(400)
        .json({ error: "Phone number and OTP are required" });
    }

    const result = await verifyOTP(phoneNumber, otp);

    if (result.success) {
      // Update user's verification status
      await User.update({ phoneVerified: true }, { where: { phoneNumber } });
    }

    res.json(result);
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: error.message });
  }
};

const checkEligibility = async (req, res) => {
  try {
    const { userId, campaignId, locationId, latitude, longitude, deviceId } =
      req.body;

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check phone verification
    if (!user.phoneVerified) {
      return res.status(403).json({
        eligible: false,
        reason: "Phone number not verified",
      });
    }

    // Get campaign
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign || campaign.status !== "active") {
      return res.status(400).json({
        eligible: false,
        reason: "Campaign is not active",
      });
    }

    // Check campaign dates
    const now = moment().startOf("day");
    if (
      now < moment(campaign.startDate).startOf("day").toDate() ||
      now > moment(campaign.endDate).startOf("day").toDate()
    ) {
      return res.status(400).json({
        eligible: false,
        reason: "Campaign is not currently running",
      });
    }

    // Verify location
    const locationCheck = await verifyUserLocation(
      latitude,
      longitude,
      locationId
    );
    if (!locationCheck.valid) {
      return res.status(403).json({
        eligible: false,
        reason: locationCheck.message,
        distance: locationCheck.distance,
      });
    }

    // Check spin cooldown based on user's last spin (phone number based)
    if (user.lastSpinDate) {
      const daysSinceLastSpin = moment().diff(
        moment(user.lastSpinDate),
        "days"
      );
      if (daysSinceLastSpin < campaign.spinCooldownDays) {
        const daysRemaining = campaign.spinCooldownDays - daysSinceLastSpin;
        return res.status(403).json({
          eligible: false,
          reason: `You can spin again in ${daysRemaining} day(s)`,
          nextSpinDate: moment(user.lastSpinDate)
            .add(campaign.spinCooldownDays, "days")
            .toDate(),
        });
      }
    }

    // Check max wins per day for this user in this campaign
    const userTodayWins = await SpinResult.count({
      where: {
        userId: userId,
        campaignId: campaignId,
        isWin: true,
        spinDate: {
          [Op.gte]: moment().startOf("day").toDate(),
          [Op.lt]: moment().endOf("day").toDate(),
        },
      },
    });

    // Get max wins per day from PrizeRule for this campaign
    const prizeRules = await PrizeRule.findAll({
      where: { campaignId: campaignId },
      attributes: ["maxPerDay"],
    });

    // Get maxPerDay values from prize rules (filter out null/unlimited values)
    const maxPerDayValues = prizeRules
      .map((rule) => rule.maxPerDay)
      .filter((val) => val !== null && val > 0);

    // Only enforce limit if at least one PrizeRule has maxPerDay set
    if (maxPerDayValues.length > 0) {
      const maxWinsPerDay = Math.min(...maxPerDayValues);

      // Check max wins per day for this user
      if (userTodayWins >= maxWinsPerDay) {
        return res.status(403).json({
          eligible: false,
          reason: `Maximum wins per day reached (${maxWinsPerDay} wins). You have already won ${userTodayWins} time(s) today.`,
        });
      }

      // Check max wins per location for this campaign
      const locationTodayWins = await SpinResult.count({
        where: {
          locationId: locationId,
          campaignId: campaignId,
          isWin: true,
          spinDate: {
            [Op.gte]: moment().startOf("day").toDate(),
            [Op.lt]: moment().endOf("day").toDate(),
          },
        },
      });

      if (locationTodayWins >= maxWinsPerDay) {
        return res.status(403).json({
          eligible: false,
          reason: `Maximum wins per location reached (${maxWinsPerDay} wins). This location has already reached the daily win limit.`,
        });
      }
    }
    // If no maxPerDay is set in any PrizeRule, allow unlimited wins

    res.json({
      eligible: true,
      message: "User is eligible to spin",
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    res.status(500).json({ error: "Failed to check eligibility" });
  }
};

const spinWheel = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      userId,
      campaignId,
      locationId,
      latitude,
      longitude,
      deviceId,
      ipAddress,
    } = req.body;

    // Get user
    const user = await User.findByPk(userId, { transaction });
    if (!user || !user.phoneVerified) {
      await transaction.rollback();
      return res.status(403).json({ error: "User not found or not verified" });
    }

    // Get campaign
    const campaign = await Campaign.findByPk(campaignId, { transaction });
    if (!campaign || campaign.status !== "active") {
      await transaction.rollback();
      return res.status(400).json({ error: "Campaign is not active" });
    }

    // Verify location
    const locationCheck = await verifyUserLocation(
      latitude,
      longitude,
      locationId
    );
    if (!locationCheck.valid) {
      await transaction.rollback();
      return res.status(403).json({ error: locationCheck.message });
    }

    // Check cooldown
    if (user.lastSpinDate) {
      const daysSinceLastSpin = moment().diff(
        moment(user.lastSpinDate),
        "days"
      );
      if (daysSinceLastSpin < campaign.spinCooldownDays) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "You have already spun recently" });
      }
    }

    // Check max wins per day in this campaign (global/campaign-based)
    const campaignTodayWins = await SpinResult.count({
      where: {
        campaignId: campaignId,
        isWin: true,
        spinDate: {
          [Op.gte]: moment().startOf("day").toDate(),
          [Op.lt]: moment().endOf("day").toDate(),
        },
      },
    });

    // Get max wins per day from PrizeRule for this campaign
    const prizeRules = await PrizeRule.findAll({
      where: { campaignId: campaignId },
      attributes: ["maxPerDay"],
    });

    // Get maxPerDay values from prize rules (filter out null/unlimited values)
    const maxPerDayValues = prizeRules
      .map((rule) => rule.maxPerDay)
      .filter((val) => val !== null && val > 0);

    // Only enforce limit if at least one PrizeRule has maxPerDay set
    if (maxPerDayValues.length > 0) {
      const maxWinsPerDay = Math.min(...maxPerDayValues);

      // Check max wins per day for this campaign (global)
      if (campaignTodayWins >= maxWinsPerDay) {
        await transaction.rollback();
        return res.status(403).json({
          error: `Maximum wins per day reached (${maxWinsPerDay} wins). The campaign has already reached ${campaignTodayWins} win(s) today.`,
        });
      }

      // Check max wins per location for this campaign
      const locationTodayWins = await SpinResult.count({
        where: {
          locationId: locationId,
          campaignId: campaignId,
          isWin: true,
          spinDate: {
            [Op.gte]: moment().startOf("day").toDate(),
            [Op.lt]: moment().endOf("day").toDate(),
          },
        },
      });

      if (locationTodayWins >= maxWinsPerDay) {
        await transaction.rollback();
        return res.status(403).json({
          error: `Maximum wins per location reached (${maxWinsPerDay} wins). This location has already reached the daily win limit.`,
        });
      }
    }
    // If no maxPerDay is set in any PrizeRule, allow unlimited wins

    // Select prize
    let prize;
    try {
      prize = await selectPrize(campaignId, locationId);
    } catch (error) {
      await transaction.rollback();
      // If no prizes available, return appropriate message
      if (error.message && error.message.includes("No prizes available")) {
        return res.status(403).json({
          error: "No prizes available. All prizes have reached their daily or location limits. Please try again later.",
        });
      }
      // Re-throw other errors
      throw error;
    }

    // Get prize rule to get value for budget tracking
    const prizeRule = await PrizeRule.findOne({
      where: {
        campaignId: campaignId,
        prizeId: prize.id,
      },
    });

    // Check if prize is a win (not "lossprize" or "No Win" or "Try Again")
    const prizeType = prize.type?.trim() || "";
    const prizeName = prize.name?.trim() || "";
    let isWin =
      prizeType !== "lossprize" &&
      prizeType !== "No Win" &&
      prizeName.toLowerCase() !== "try again";

    // Get prize value (for reference, not used for budget restrictions)
    const prizeValue = prizeRule?.value ? parseFloat(prizeRule.value) : 0;

    // Generate redemption code only if won
    const redemptionCode = isWin ? generateRedemptionCode() : null;

    // Calculate expiry date only if won (default to 30 days)
    const expiresAt = isWin ? moment().add(30, "days").toDate() : null;

    // Save spin result
    const spinResult = await SpinResult.create({
      userId: userId,
      campaignId: campaignId,
      locationId: locationId,
      prizeId: prize.id,
      isWin,
      latitude,
      longitude,
      deviceId,
      ipAddress,
      redemptionCode,
      expiresAt,
      // Mark as redeemed immediately if it's a win
      redemptionStatus: isWin
        ? "redeemed"
        : isWin === false
        ? "lossprize"
        : "pending",
      redeemedAt: isWin ? new Date() : null,
    }, { transaction });

    // Update user
    await user.update({
      lastSpinDate: new Date(),
      totalSpins: user.totalSpins + 1,
      totalWins: isWin ? user.totalWins + 1 : user.totalWins,
      deviceId: deviceId || user.deviceId,
      ipAddress: ipAddress || user.ipAddress,
    }, { transaction });

    // Update campaign stats
    // Note: prizeValue was already calculated above
    await campaign.update({
      totalSpins: campaign.totalSpins + 1,
      totalWins: isWin ? campaign.totalWins + 1 : campaign.totalWins,
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      result: {
        prize: {
          id: prize.id,
          name: prize.name,
          description: prize.description,
          type: prize.type,
          color: prize.color,
        },
        isWin,
        redemptionCode,
        expiresAt,
        spinId: spinResult.id,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Spin wheel error:", error);
    res.status(500).json({ error: "Failed to spin wheel" });
  }
};

const getLocations = async (req, res) => {
  try {
    const { state, city, latitude, longitude, campaignId } = req.query;
    const LocationCampaignMapping = require("../models/LocationCampaignMapping");

    // Build where clause - always filter by state/city if provided (case-insensitive)
    let where = { isActive: true };

    if (state) {
      where.state = { [Op.iLike]: `%${state}%` };
    }
    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }

    // If campaignId is provided, filter by campaign-mapped locations
    let locationIds = null;
    if (campaignId) {
      const mappings = await LocationCampaignMapping.findAll({
        where: { campaignId },
        attributes: ["locationId"],
      });
      locationIds = mappings.map((m) => m.locationId);

      if (locationIds.length === 0) {
        // No locations mapped to this campaign
        return res.json({
          success: true,
          locations: [],
        });
      }

      where.id = { [Op.in]: locationIds };
    }

    // Get locations filtered by state/city and campaign mapping
    let locations = await Location.findAll({
      where,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      raw: true,
    });

    // If coordinates provided, calculate distances for the filtered locations and sort by proximity
    if (latitude && longitude) {
      const { calculateDistance } = require("../services/locationService");
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      // Calculate distance for each filtered location
      locations = locations.map((location) => {
        const distance = calculateDistance(
          userLat,
          userLon,
          parseFloat(location.latitude),
          parseFloat(location.longitude)
        );
        return {
          ...location,
          distance,
        };
      });

      // Sort by distance (nearest first)
      locations.sort((a, b) => a.distance - b.distance);
    } else {
      // If no coordinates, just add distance as 0 or null for consistency
      locations = locations.map((location) => ({
        ...location,
        distance: null,
      }));
    }

    res.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ error: "Failed to get locations" });
  }
};

const getActiveCampaign = async (req, res) => {
  try {
    const now = new Date();
    const { id } = req.params;

    const LocationCampaignMapping = require("../models/LocationCampaignMapping");
    const PrizeRule = require("../models/PrizeRule");

    const campaign = await Campaign.findOne({
      where: {
        id,
      },
      include: [
        {
          model: Location,
          as: "locations",
          where: { isActive: true },
          required: false,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({ error: "No active campaign found" });
    }

    // Get all prizes mapped to this campaign through PrizeRule
    const prizeRules = await PrizeRule.findAll({
      where: { campaignId: campaign.id },
      include: [
        {
          model: Prize,
          as: "prize",
          where: { isActive: true },
          required: true,
        },
      ],
    });

    // Extract prizes from prize rules
    const allPrizes = prizeRules.map((rule) => rule.prize).filter(Boolean);

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        prizes: allPrizes,
        locations: campaign.locations || [],
      },
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    res.status(500).json({ error: "Failed to get campaign" });
  }
};

// Get available prizes for a campaign and location (filtered by max wins limits)
const getAvailablePrizesForSpin = async (req, res) => {
  try {
    const { campaignId, locationId } = req.query;

    if (!campaignId || !locationId) {
      return res.status(400).json({
        error: "campaignId and locationId are required",
      });
    }

    const availablePrizes = await getAvailablePrizes(campaignId, locationId);

    res.json({
      success: true,
      prizes: availablePrizes,
      count: availablePrizes.length,
    });
  } catch (error) {
    console.error("Get available prizes error:", error);
    res.status(500).json({ error: "Failed to get available prizes" });
  }
};

module.exports = {
  registerUser,
  requestOTP,
  verifyPhoneNumber,
  checkEligibility,
  spinWheel,
  getLocations,
  getActiveCampaign,
  getAvailablePrizesForSpin,
};
