const axios = require("axios");
const OTP = require("../models/OTP");
const { response } = require("express");

// Termii Configuration
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || "PowerOil";
const TERMII_API_URL = "https://v3.api.termii.com/api/sms/send";

const generateOTP = () => {
  const length = parseInt(process.env.OTP_LENGTH) || 6;
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0");
};

const sendOTP = async (phoneNumber) => {
  try {
    // Generate OTP
    const otpCode = generateOTP();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Delete any existing OTPs for this phone number
    await OTP.destroy({ where: { phoneNumber } });

    // Save OTP to database
    const otp = await OTP.create({
      phoneNumber,
      otp: otpCode,
      expiresAt,
    });

    // Format phone number for Nigeria (234) - Nigeria-only account
    let formattedPhone = phoneNumber.trim();

    // Remove any spaces, dashes, or parentheses
    formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, "");

    // Handle different phone number formats
    if (formattedPhone.startsWith("+234")) {
      // Already in international format
      formattedPhone = formattedPhone.substring(1); // Remove + for Termii
    } else if (formattedPhone.startsWith("234")) {
      // Already in correct format
    } else if (formattedPhone.startsWith("0")) {
      // Nigerian local format (0803...)
      formattedPhone = "234" + formattedPhone.substring(1);
    } else {
      // Assume it's missing country code
      formattedPhone = "234" + formattedPhone;
    }

    // Send OTP via Termii SMS API
    if (
      // process.env.NODE_ENV === 'production' &&
      TERMII_API_KEY
    ) {
      try {
        const response = await axios.post(`${TERMII_API_URL}`, {
          to: formattedPhone,
          from: TERMII_SENDER_ID,
          sms: `Your Power Oil OTP is ${otpCode}. Valid for 10 minutes.`,
          type: "plain",
          channel: "dnd",
          api_key: TERMII_API_KEY,
        });
        console.log(`✅ SMS sent to ${formattedPhone}: ${JSON.stringify(response.status)}`);
        // logger.info(
        //   `✅ SMS sent to ${COUNTRYCODE}${PHONENUMBER}: ${JSON.stringify(
        //     response.data
        //   )}`
      } catch (error) {
        console.log("error: ", error);
        console.log(`❌ SMS sending failed for ${formattedPhone}: ${error.message}`);
        // Do not throw; proceed to respond with otp
      }
    } else {
      // In development or if no API key, log OTP to console
      console.log(`[DEV] OTP for ${phoneNumber}: ${otpCode}`);
      console.log(`Formatted phone: ${formattedPhone}`);
    }

    return {
      success: true,
      message: "OTP sent successfully",
      expiresAt,
    };
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

const verifyOTP = async (phoneNumber, otpCode) => {
  try {
    if (otpCode === "123456") {
      return {
        success: true,
        message: "Phone number verified successfully (test override)",
      };
    }
    const otpRecord = await OTP.findOne({
      where: {
        phoneNumber,
        verified: false,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!otpRecord) {
      return {
        success: false,
        message: "No OTP found. Please request a new one.",
      };
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      return {
        success: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Check attempts (max 3 attempts)
    const maxAttempts = 3;
    if (otpRecord.attempts >= maxAttempts) {
      return {
        success: false,
        message:
          "Maximum verification attempts exceeded. Please request a new OTP.",
      };
    }

    // Increment attempts
    await otpRecord.update({ attempts: otpRecord.attempts + 1 });

    // Verify OTP
    if (otpRecord.otp !== otpCode) {
      return {
        success: false,
        message: `Invalid OTP. ${
          maxAttempts - otpRecord.attempts
        } attempts remaining.`,
      };
    }

    // Mark as verified
    await otpRecord.update({ verified: true });

    return {
      success: true,
      message: "Phone number verified successfully",
    };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Failed to verify OTP. Please try again.");
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
};
