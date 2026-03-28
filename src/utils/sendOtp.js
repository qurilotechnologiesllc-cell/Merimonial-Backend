// utils/sendOtp.js
import axios from "axios";
import { BrevoClient } from '@getbrevo/brevo';

/**
 * Generate a random 4-digit OTP
 */


/**
 * Send OTP via Autobysms API or log it in development
 * @param {string} phone - User's phone number
 * @param {string} otp - OTP to send
 * @returns {boolean} true if sent/logged successfully
 */
export const sendOtpToPhone = async (phone, otp) => {
  const IS_DEV = process.env.NODE_ENV !== "production";

  if (IS_DEV) {
    // 🔹 Development mode: just log OTP
    console.log(`🔹 [DEV] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    const message = encodeURIComponent(`Your OTP is ${otp} SELECTIAL`);

    // ✅ Autobysms API URL (update with your actual API key, sender ID, template ID)
    const apiUrl = `https://sms.autobysms.com/app/smsapi/index.php?key=YOUR_API_KEY&campaign=0&routeid=9&type=text&contacts=${phone}&senderid=SMSSPT&msg=${message}&template_id=YOUR_TEMPLATE_ID`;

    const response = await axios.get(apiUrl);

    console.log("📩 SMS API Raw Response:", response.data);

    // ✅ Check if SMS was successfully sent
    if (
      response.data?.status === "OK" ||
      response.data?.type === "SUCCESS" ||
      (typeof response.data === "string" && response.data.includes("OK"))
    ) {
      console.log(`✅ OTP sent successfully to ${phone}`);
      return true;
    } else {
      throw new Error("SMS sending failed: " + JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("❌ OTP sending error:", error.message);
    if (error.response) {
      console.error("API Error Response:", error.response.data);
    }
    return false; // prevent crashing the app
  }
};

// ✅ Naya v5 BrevoClient
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});


export const sendOTPviaSMS = async (phoneNumber, otp) => {

  // ✅ String rakho, Number() mat karo
  const formattedPhone = `+91${phoneNumber}`;
  console.log("Formatted Phone:", formattedPhone); // +919876543210

  try {
    await brevo.transactionalSms.sendTransacSms({
      sender: process.env.SMS_SENDER,
      recipient: formattedPhone, // ✅ String format
      content: `Your OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      type: 'transactional'
    });

    console.log("SMS OTP bhej diya ✅");
    return { success: true, otp, message: "OTP sent successfully" };
  } catch (error) {
    console.error("SMS Error:", error);
    return { success: false, message: error.message };
  }
};