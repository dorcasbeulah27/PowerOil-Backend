const { Op } = require("sequelize");
const Prize = require("../models/Prize");
const Location = require("../models/Location");
const SpinResult = require("../models/SpinResult");
const PrizeRule = require("../models/PrizeRule");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

const selectPrize = async (campaignId, locationId, userId = null) => {
  try {
    // Get all prize rules for this campaign (this is the source of truth for campaign-prize mapping)
    const prizeRules = await PrizeRule.findAll({
      where: { campaignId },
    });

    if (prizeRules.length === 0) {
      throw new Error(
        `No prize rules configured for this campaign. Please add prize rules to campaign ${campaignId}`
      );
    }

    // Extract prize IDs from prize rules
    const prizeIds = prizeRules
      .map((rule) => rule.prizeId)
      .filter(Boolean);

    // Get all prizes associated with these prize rules
    const prizes = await Prize.findAll({
      where: {
        id: { [Op.in]: prizeIds },
        isActive: true,
      },
    });

    if (prizes.length === 0) {
      // Check if there are any prizes at all (even inactive) for better error message
      const allPrizes = await Prize.findAll({
        where: { id: { [Op.in]: prizeIds } },
      });

      const totalPrizes = allPrizes.length;

      if (totalPrizes === 0) {
        throw new Error(
          `No prizes found for the configured prize rules in campaign ${campaignId}. Please check prize rule configurations.`
        );
      } else {
        throw new Error(
          `No active prizes available for this campaign. Found ${totalPrizes} prize(s) but none are active. Please activate prizes in the admin panel.`
        );
      }
    }

    // Create a map of prizeId -> prizeRule for easy lookup
    const prizeRuleMap = new Map();
    prizeRules.forEach((rule) => {
      prizeRuleMap.set(rule.prizeId, rule);
    });

    // Filter prizes based on remaining quantity, daily limits, and prize rule limits
    const availablePrizes = await filterPrizesByLimits(prizes, prizeRuleMap, campaignId, locationId);

    if (availablePrizes.length === 0) {
      // No prizes available - throw error instead of returning loss prize
      throw new Error("No prizes available. All prizes have reached their daily or location limits.");
    }

    // Create a map of prizeId -> probability from prize rules
    const probabilityMap = new Map();
    prizeRules.forEach((rule) => {
      probabilityMap.set(rule.prizeId, parseFloat(rule.probability));
    });

    // Attach probabilities to prizes (use PrizeRule probability, fallback to 0)
    const prizesWithProbability = availablePrizes.map((prize) => ({
      prize: prize,
      probability: probabilityMap.get(prize.id) || 0,
    }));

    // Calculate total probability weight
    const totalWeight = prizesWithProbability.reduce(
      (sum, item) => sum + item.probability,
      0
    );

    if (totalWeight === 0) {
      // If no probabilities set, fallback to equal probability
      const randomIndex = Math.floor(Math.random() * availablePrizes.length);
      return availablePrizes[randomIndex];
    }

    // Generate random number
    const random = Math.random() * totalWeight;

    // Select prize based on weighted probability
    let cumulativeWeight = 0;
    for (const item of prizesWithProbability) {
      cumulativeWeight += item.probability;
      if (random <= cumulativeWeight) {
        const prize = item.prize;
        // Note: Quantity reduction happens in spinWheel after confirming win and generating redemption code
        return prize;
      }
    }

    // Fallback (should never reach here)
    return availablePrizes[availablePrizes.length - 1];
  } catch (error) {
    console.error("Error selecting prize:", error);
    throw error;
  }
};

const filterPrizesByLimits = async (prizes, prizeRuleMap, campaignId, locationId) => {
  const now = moment();
  const filtered = [];

  for (const prize of prizes) {
    // Get prize rule for this prize
    const prizeRule = prizeRuleMap.get(prize.id);

    if (!prizeRule) {
      // If no prize rule, skip this prize
      continue;
    }

    // Check maxTotal from PrizeRule (global across all locations)
    if (prizeRule.maxTotal !== null && prizeRule.maxTotal > 0) {
      const totalWins = await SpinResult.count({
        where: {
          prizeId: prize.id,
          campaignId: campaignId,
          isWin: true,
        },
      });
      if (totalWins >= prizeRule.maxTotal) {
        continue;
      }
    }

    // Check maxPerDay from PrizeRule - check both campaign level and location level
    if (prizeRule.maxPerDay !== null && prizeRule.maxPerDay > 0) {
      // Check max wins per day at campaign level (global)
      const campaignTodayWins = await SpinResult.count({
        where: {
          prizeId: prize.id,
          campaignId: campaignId,
          isWin: true,
          spinDate: {
            [Op.gte]: now.startOf("day").toDate(),
            [Op.lt]: now.endOf("day").toDate(),
          },
        },
      });
      if (campaignTodayWins >= prizeRule.maxPerDay) {
        continue;
      }

      // Check max wins per day at location level
      const locationTodayWins = await SpinResult.count({
        where: {
          prizeId: prize.id,
          campaignId: campaignId,
          locationId: locationId,
          isWin: true,
          spinDate: {
            [Op.gte]: now.startOf("day").toDate(),
            [Op.lt]: now.endOf("day").toDate(),
          },
        },
      });
      if (locationTodayWins >= prizeRule.maxPerDay) {
        continue;
      }
    } 

    filtered.push(prize);
  }

  return filtered;
};

// Get available prizes for display (filtered by limits)
const getAvailablePrizes = async (campaignId, locationId) => {
  try {
    // Get all prize rules for this campaign
    const prizeRules = await PrizeRule.findAll({
      where: { campaignId },
    });

    if (prizeRules.length === 0) {
      return [];
    }

    // Extract prize IDs from prize rules
    const prizeIds = prizeRules
      .map((rule) => rule.prizeId)
      .filter(Boolean);

    // Get all prizes associated with these prize rules
    const prizes = await Prize.findAll({
      where: {
        id: { [Op.in]: prizeIds },
        isActive: true,
      },
    });

    if (prizes.length === 0) {
      return [];
    }

    // Create a map of prizeId -> prizeRule for easy lookup
    const prizeRuleMap = new Map();
    prizeRules.forEach((rule) => {
      prizeRuleMap.set(rule.prizeId, rule);
    });

    // Filter prizes based on limits
    const availablePrizes = await filterPrizesByLimits(prizes, prizeRuleMap, campaignId, locationId);

    return availablePrizes;
  } catch (error) {
    console.error("Error getting available prizes:", error);
    return [];
  }
};

const generateRedemptionCode = () => {
  return `PO-${uuidv4().substring(0, 8).toUpperCase()}`;
};

module.exports = {
  selectPrize,
  getAvailablePrizes,
  generateRedemptionCode,
};
