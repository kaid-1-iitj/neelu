import dotenv from "dotenv";
import crypto from "crypto";
import type { SendOTPRequest, VerifyOTPRequest, OTPVerificationDoc } from "@shared/api";
import { otpVerifications } from "../db/collections";

dotenv.config();

const OTP_SERVICE_API_KEY = process.env.OTP_SERVICE_API_KEY;
const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL;

export async function sendOTP(request: SendOTPRequest): Promise<{ success: boolean; message: string }> {
  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    // Store OTP in database
    const otpCol = await otpVerifications();
    
    // Remove any existing OTP for this email
    await otpCol.deleteMany({ email: request.email });
    
    const otpDoc: OTPVerificationDoc = {
      email: request.email,
      phone: request.phone,
      otp,
      isVerified: false,
      expiresAt,
      createdAt: Date.now(),
      attempts: 0,
    };
    
    await otpCol.insertOne(otpDoc);

    // Send OTP via external service if configured
    if (OTP_SERVICE_API_KEY && OTP_SERVICE_URL && OTP_SERVICE_API_KEY !== "your_otp_service_api_key_here") {
      const response = await fetch(`${OTP_SERVICE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OTP_SERVICE_API_KEY}`,
        },
        body: JSON.stringify({
          email: request.email,
          phone: request.phone,
          otp,
          message: `Your Society Ledgers verification code is: ${otp}. This code expires in 10 minutes.`,
        }),
      });

      if (!response.ok) {
        console.error("OTP service error:", await response.text());
        return { success: false, message: "Failed to send OTP via service" };
      }
    } else {
      // Fallback: Log OTP to console for development
      console.log(`OTP for ${request.email}: ${otp}`);
    }

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return { success: false, message: "Failed to send OTP" };
  }
}

export async function verifyOTP(request: VerifyOTPRequest): Promise<{ success: boolean; message: string }> {
  try {
    const otpCol = await otpVerifications();
    const otpDoc = await otpCol.findOne({ email: request.email, isVerified: false });

    if (!otpDoc) {
      return { success: false, message: "No pending OTP for this email or already verified." };
    }

    if (Date.now() > otpDoc.expiresAt) {
      await otpCol.deleteOne({ email: request.email });
      return { success: false, message: "OTP expired" };
    }

    if (otpDoc.attempts >= 3) {
      await otpCol.deleteOne({ email: request.email });
      return { success: false, message: "Too many attempts. Please request a new OTP" };
    }

    if (otpDoc.otp !== request.otp) {
      await otpCol.updateOne(
        { email: request.email },
        { $inc: { attempts: 1 } }
      );
      return { success: false, message: "Invalid OTP" };
    }

    // Mark as verified
    await otpCol.updateOne(
      { email: request.email },
      { $set: { isVerified: true } }
    );

    console.log(`OTP verified successfully for ${request.email}`);
    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("Failed to verify OTP:", error);
    return { success: false, message: "Failed to verify OTP" };
  }
}

export async function isOTPVerified(email: string): Promise<boolean> {
  try {
    const otpCol = await otpVerifications();
    const otpDoc = await otpCol.findOne({ email, isVerified: true });
    console.log(`Checking OTP verification for ${email}:`, otpDoc ? 'VERIFIED' : 'NOT VERIFIED');
    return !!otpDoc;
  } catch (error) {
    console.error("Failed to check OTP verification:", error);
    return false;
  }
}
