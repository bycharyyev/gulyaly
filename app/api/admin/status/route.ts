import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);

// GET /api/admin/status - получить статус сервера (только для админов)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }
    
    // Получаем информацию о системе
    const [cpuInfo, memInfo, diskInfo, netInfo, uptimeInfo, loadInfo] = await Promise.all([
      execAsync('cat /proc/cpuinfo | grep "model name" | head -1'),
      execAsync('free -m'),
      execAsync('df -h /'),
      execAsync('cat /proc/net/dev | grep -E "^ *eth|^ *en"'),
      execAsync('uptime'),
      execAsync('cat /proc/loadavg')
    ]);
    
    // Парсим информацию
    const cpuModel = cpuInfo.stdout.trim().split(': ')[1];
    const memLines = memInfo.stdout.trim().split('\n').slice(1);
    const memTotal = parseInt(memLines[0].split(/\s+/)[1]);
    const memUsed = parseInt(memLines[0].split(/\s+/)[2]);
    const diskLine = diskInfo.stdout.trim().split('\n')[1];
    const diskParts = diskLine.split(/\s+/);
    const diskTotal = diskParts[1];
    const diskUsed = diskParts[2];
    const diskPercent = diskParts[4];
    const uptime = uptimeInfo.stdout.trim();
    const loadAvg = loadInfo.stdout.trim().split(' ');
    
    // Получаем информацию о сетевых интерфейсах
    const netInterfaces = netInfo.stdout.trim().split('\n').filter(line => line.trim() !== '');

    // Получаем список процессов Node.js
    let processes: Array<{user: string, pid: string, cpu: string, mem: string, command: string}> = [];    try {
      const psResult = await execAsync('ps aux | grep node | grep -v grep | head -10');
      processes = psResult.stdout.trim().split('\n').map(line => {
        const parts = line.split(/\s+/);
        return {
          user: parts[0],
          pid: parts[1],
          cpu: parts[2],
          mem: parts[3],
          command: parts.slice(10).join(' ')
        };
      }).filter(p => p.command);
    } catch (e) {
      processes = [];
    }

    // Получаем статистику по онлайну (из нашей базы данных)
    const onlineUsers = await prisma.user.count({
      where: { isOnline: true }
    });
    const totalUsers = await prisma.user.count();
    const activeOrders = await prisma.order.count({
      where: { status: { in: ['PENDING', 'PAID', 'PROCESSING'] } }
    });

    return NextResponse.json({
      server: {
        cpu: cpuModel,
        memory: {
          total: `${memTotal} MB`,
          used: `${memUsed} MB`,
          percent: Math.round((memUsed / memTotal) * 100)
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          percent: diskPercent
        },
        uptime: uptime,
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2]
        },
        processes: processes.length,
        processesList: processes
      },
      app: {
        onlineUsers,
        totalUsers,
        activeOrders,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Ошибка получения статуса сервера:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статуса сервера' },
      { status: 500 }
    );
  }
}