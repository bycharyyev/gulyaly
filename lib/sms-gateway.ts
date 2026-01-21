// SMS Gateway Integration (sms.ibnux.net)
import { prisma } from './prisma';
import * as crypto from 'crypto';

interface SMSConfig {
  deviceID: string;
  secret: string;
  gatewayURL: string;
  simNumber: number; // 0 for default, 1/2/3/4 for specific SIM
}

interface SMSLog {
  to: string;
  text: string;
  status: 'sent' | 'failed';
  response?: string;
  error?: string;
  timestamp: Date;
}

// Get SMS config from Prisma or environment
export async function getSMSConfig(): Promise<SMSConfig> {
  try {
    // Try to get from Prisma first (server-side only)
    const settings = await prisma.sMSSettings.findFirst();
    
    if (settings && settings.enabled && settings.deviceID && settings.secret) {
      return {
        deviceID: settings.deviceID,
        secret: settings.secret,
        gatewayURL: settings.gatewayURL || 'https://sms.ibnux.net/',
        simNumber: settings.simNumber || 0
      };
    }
  } catch (error) {
    console.log('Failed to fetch SMS settings from database, using environment variables:', error);
  }
  
  // Fallback to environment variables
  const config = {
    deviceID: process.env.SMS_DEVICE_ID || '',
    secret: process.env.SMS_SECRET || '',
    gatewayURL: process.env.SMS_GATEWAY_URL || 'https://sms.ibnux.net/',
    simNumber: parseInt(process.env.SMS_SIM_NUMBER || '0')
  };
  
  // Check if config is valid
  if (!config.deviceID || !config.secret) {
    console.warn('SMS configuration is not set. Configure in /admin/sms or set environment variables.');
  }
  
  return config;
}

// Generate MD5 hash
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Send SMS via Gateway
export async function sendSMS(
  to: string, 
  text: string,
  config?: SMSConfig
): Promise<{ success: boolean; message: string; response?: string }> {
  try {
    // Get config if not provided
    const smsConfig = config || await getSMSConfig();
    
    // Validate config
    if (!smsConfig.deviceID || !smsConfig.secret) {
      throw new Error('SMS configuration is missing. Please configure in admin panel.');
    }

    // Get current timestamp
    const time = Math.floor(Date.now() / 1000);
    
    // Generate secret hash (MD5(secret + time) as per IBNUX API)
    const secretHash = md5(smsConfig.secret + time);
    
    // Build request URL/params
    const params = new URLSearchParams({
      to: to,
      text: text,
      secret: secretHash,
      time: time.toString(),
      deviceID: smsConfig.deviceID,
      sim: smsConfig.simNumber.toString()
    });

    // Send SMS via GET request (as per IBNUX API specification)
    const response = await fetch(`${smsConfig.gatewayURL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, */*'
      }
    });

    const responseText = await response.text();

    // Log SMS to database
    await logSMS({
      to,
      text,
      status: response.ok ? 'sent' : 'failed',
      response: responseText,
      timestamp: new Date()
    });

    if (!response.ok) {
      throw new Error(`SMS Gateway error: ${responseText}`);
    }

    return {
      success: true,
      message: 'SMS sent successfully',
      response: responseText
    };

  } catch (error: any) {
    console.error('SMS sending error:', error);
    
    // Log failed attempt
    await logSMS({
      to,
      text,
      status: 'failed',
      error: error.message,
      timestamp: new Date()
    });

    return {
      success: false,
      message: error.message || 'Failed to send SMS'
    };
  }
}

// Send OTP SMS
export async function sendOTP(phone: string, otp: string): Promise<boolean> {
  const message = `Ваш код подтверждения: ${otp}\n\nНикому не сообщайте этот код.\nGulyaly.com`;
  
  const result = await sendSMS(phone, message);
  return result.success;
}

// Send USSD command (for balance check, etc)
export async function sendUSSD(
  ussdCode: string,
  config?: SMSConfig
): Promise<{ success: boolean; message: string; response?: string }> {
  // USSD codes start with * and end with #
  if (!ussdCode.startsWith('*') || !ussdCode.endsWith('#')) {
    return {
      success: false,
      message: 'Invalid USSD code. Must start with * and end with #'
    };
  }

  // For USSD, message is required but ignored
  return await sendSMS(ussdCode, 'USSD Command', config);
}

// Log SMS to Prisma database
async function logSMS(log: SMSLog): Promise<void> {
  try {
    await prisma.sMSLog.create({
      data: {
        to: log.to,
        text: log.text,
        status: log.status,
        response: log.response,
        error: log.error
      }
    });
  } catch (error) {
    console.error('Failed to log SMS:', error);
  }
}

// Get SMS statistics
export async function getSMSStats() {
  try {
    const total = await prisma.sMSLog.count();
    const sent = await prisma.sMSLog.count({ where: { status: 'sent' } });
    const failed = await prisma.sMSLog.count({ where: { status: 'failed' } });
    const lastLog = await prisma.sMSLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      totalSent: sent,
      totalFailed: failed,
      lastSent: lastLog?.createdAt || null
    };
  } catch (error) {
    console.error('Failed to get SMS stats:', error);
    return {
      totalSent: 0,
      totalFailed: 0,
      lastSent: null
    };
  }
}
