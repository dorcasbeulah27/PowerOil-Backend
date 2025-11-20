const express = require("express");
const router = express.Router();
const { verifyAdminToken, checkRole } = require("../middleware/auth");
const {
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
  updatePrize,
  deletePrize,
  getPrizesById,
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
} = require("../controllers/adminController");

// All routes require admin authentication
router.use(verifyAdminToken);

// Dashboard & Analytics
router.get("/dashboard/stats", getDashboardStats);
router.get("/reports/stats", getReportsStats);
router.get("/users", getUsers);
router.get("/spins/history", getSpinHistory);
router.get("/reports/users", getRegisteredUsersReport);
router.get("/reports/winnings", getWinningDetailsReport);

// Campaign routes
router.post("/campaigns", checkRole("admin", "superadmin"), createCampaign);
router.get("/campaigns", getAllCampaigns);
router.get("/campaigns/:id", getCampaignById);
router.put("/campaigns/:id", checkRole("admin", "superadmin"), updateCampaign);
router.delete("/campaigns/:id", checkRole("superadmin"), deleteCampaign);

// Location routes
router.post("/locations", checkRole("admin", "superadmin"), createLocation);
router.get("/locations", getAllLocations);
router.get("/locations/:id", getLocationById);
router.put("/locations/:id", checkRole("admin", "superadmin"), updateLocation);
router.delete("/locations/:id", checkRole("superadmin"), deleteLocation);
router.post(
  "/locations/bulk-upload",
  checkRole("admin", "superadmin"),
  bulkUploadLocations
);

// Prize routes
router.post("/prizes", checkRole("admin", "superadmin"), createPrize);
router.get("/prizes", getAllPrizes);
router.get("/prizes/:id", getPrizesById);
router.put("/prizes/:id", checkRole("admin", "superadmin"), updatePrize);
router.delete("/prizes/:id", checkRole("superadmin"), deletePrize);

// Prize Rules routes
router.post("/prize-rules", checkRole("admin", "superadmin"), createPrizeRule);
router.get("/prize-rules", getAllPrizeRules);
router.get("/prize-rules/:id", getPrizeRuleById);
router.put("/prize-rules/:id", checkRole("admin", "superadmin"), updatePrizeRule);
router.delete("/prize-rules/:id", checkRole("superadmin"), deletePrizeRule);

module.exports = router;
