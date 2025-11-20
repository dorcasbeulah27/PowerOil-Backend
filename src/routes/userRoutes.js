const express = require('express');
const router = express.Router();
const {
  registerUser,
  requestOTP,
  verifyPhoneNumber,
  checkEligibility,
  spinWheel,
  getLocations,
  getActiveCampaign,
  getAvailablePrizesForSpin
} = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyPhoneNumber);
router.post('/eligibility', checkEligibility);
router.post('/spin', spinWheel);
router.get('/locations', getLocations);
router.get('/campaign/active/:id', getActiveCampaign);
router.get('/prizes/available', getAvailablePrizesForSpin);

module.exports = router;



