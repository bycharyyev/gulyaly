import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendSMS } from '@/lib/sms-gateway';

// POST /api/sms/test - Test SMS sending (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    const result = await sendSMS(phone, message);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending test SMS:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error.message || 'Failed to send SMS'
      },
      { status: 500 }
    );
  }
}
