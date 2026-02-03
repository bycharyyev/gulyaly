import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    stripe: 'configured' | 'not_configured' | 'error';
  };
  checks: {
    databaseLatency?: number;
  };
}

// GET /api/health - Health check endpoint for monitoring
// Verifies database and Stripe connectivity
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'unknown',
    services: {
      database: 'disconnected',
      stripe: 'not_configured',
    },
    checks: {},
  };

  // Check database connection with latency measurement
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.databaseLatency = Date.now() - dbStart;
    health.services.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.services.database = 'disconnected';
    console.error('[HEALTH_CHECK] Database connection failed');
  }

  // Check Stripe configuration
  if (process.env.STRIPE_SECRET_KEY) {
    if (stripe) {
      health.services.stripe = 'configured';
    } else {
      health.status = 'degraded';
      health.services.stripe = 'error';
      console.error('[HEALTH_CHECK] Stripe client initialization failed');
    }
  }

  const totalLatency = Date.now() - startTime;
  const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;

  console.log(`[HEALTH_CHECK] Completed in ${totalLatency}ms - status: ${health.status}`);

  return NextResponse.json(health, { status: statusCode });
}
