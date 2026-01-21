import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sms-settings - Get SMS configuration
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let settings = await prisma.sMSSettings.findFirst();
    
    // Return default settings structure if none exist
    if (!settings) {
      return NextResponse.json({
        id: null,
        deviceID: '',
        secret: '',
        gatewayURL: 'https://sms.ibnux.net/',
        simNumber: 0,
        enabled: false,
        createdAt: null,
        updatedAt: null
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PUT /api/sms-settings - Update SMS configuration (admin only)
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      deviceID,
      secret,
      gatewayURL,
      simNumber,
      enabled
    } = body;

    const data = {
      deviceID: deviceID || '',
      secret: secret || '',
      gatewayURL: gatewayURL || 'https://sms.ibnux.net/',
      simNumber: parseInt(simNumber) || 0,
      enabled: enabled === true
    };

    // Find existing settings
    const existing = await prisma.sMSSettings.findFirst();
    
    let settings;
    if (existing) {
      settings = await prisma.sMSSettings.update({
        where: { id: existing.id },
        data
      });
    } else {
      settings = await prisma.sMSSettings.create({
        data
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error updating SMS settings:', error);
    return NextResponse.json(
      { error: `Failed to update settings: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
