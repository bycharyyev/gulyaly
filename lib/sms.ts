/**
 * SMS/OTP utility functions
 * Using sms.ibnux.net gateway
 */

import { sendOTP as sendOTPGateway } from './sms-gateway';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP code via SMS
 * @param phoneNumber - Phone number to send OTP to
 * @param otpCode - OTP code to send
 * @returns Promise<boolean> - True if sent successfully
 */
export async function sendOTP(
  phoneNumber: string,
  otpCode: string
): Promise<boolean> {
  try {
    // Use SMS Gateway integration
    const result = await sendOTPGateway(phoneNumber, otpCode);
    return result;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}
