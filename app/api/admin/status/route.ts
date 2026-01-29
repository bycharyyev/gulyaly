import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/api-helpers';

const execAsync = promisify(exec);

// GET /api/admin/status - получить статус сервера (только для админов)
export async function GET() {
  try {
    const { session, error } = await requireAdmin();
    
    if (error) {
      return error;
    }
    
    // Получаем информацию о системе (Windows compatible)
    const [cpuInfo, memInfo, diskInfo, uptimeInfo] = await Promise.all([
      execAsync('wmic cpu get name /value').catch(() => ({ stdout: '' })),
      execAsync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value').catch(() => ({ stdout: '' })),
      execAsync('wmic logicaldisk get size,freespace,caption').catch(() => ({ stdout: '' })),
      execAsync('wmic os get lastbootuptime /value').catch(() => ({ stdout: '' }))
    ]);
    
    // Парсим информацию для Windows
    const cpuModel = cpuInfo.stdout.split('=')[1]?.trim() || 'Unknown CPU';
    
    const memLines = memInfo.stdout.trim().split('\n').filter(line => line.includes('='));
    const memTotal = memLines.find(line => line.includes('TotalVisibleMemorySize'))?.split('=')[1]?.trim() || '0';
    const memFree = memLines.find(line => line.includes('FreePhysicalMemory'))?.split('=')[1]?.trim() || '0';
    
    const totalMemMB = Math.round(parseInt(memTotal) / 1024) || 0;
    const freeMemMB = Math.round(parseInt(memFree) / 1024) || 0;
    const usedMemMB = totalMemMB - freeMemMB;
    const memPercent = totalMemMB > 0 ? Math.round((usedMemMB / totalMemMB) * 100) : 0;
    
    const diskLines = diskInfo.stdout.trim().split('\n').filter(line => line.trim() !== '');
    const diskInfoLine = diskLines.find(line => line.includes('C:')) || '';
    const diskParts = diskInfoLine.split(/\s+/);
    const diskTotal = diskParts[1] ? Math.round(parseInt(diskParts[1]) / (1024 * 1024 * 1024)) + ' GB' : 'Unknown';
    const diskFree = diskParts[2] ? Math.round(parseInt(diskParts[2]) / (1024 * 1024 * 1024)) + ' GB' : 'Unknown';
    const diskUsed = diskTotal !== 'Unknown' && diskFree !== 'Unknown' ? 
      (parseInt(diskTotal) - parseInt(diskFree)) + ' GB' : 'Unknown';
    
    const uptime = uptimeInfo.stdout.split('=')[1]?.trim() || 'Unknown';
    
    // Получаем список процессов Node.js
    let processes: Array<{user: string, pid: string, cpu: string, mem: string, command: string}> = [];
    try {
      const psResult = await execAsync('tasklist /fi "imagename eq node.exe"');
      processes = psResult.stdout.trim().split('\n').slice(3).filter(line => line.trim() !== '').map(line => {
        const parts = line.split(/\s+/);
        return {
          user: 'N/A',
          pid: parts[1] || 'N/A',
          cpu: 'N/A',
          mem: 'N/A',
          command: parts[0] || 'N/A'
        };
      }).filter(p => p.command !== 'N/A');
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

    // Генерируем статистику за последние 24 часа (простая симуляция)
    const onlineStats = [...Array(24)].map((_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 20) + (onlineUsers > 0 ? Math.floor(onlineUsers / 2) : 0)
    }));

    return NextResponse.json({
      server: {
        cpu: cpuModel,
        memory: {
          total: `${totalMemMB} MB`,
          used: `${usedMemMB} MB`,
          percent: memPercent
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          percent: diskTotal !== 'Unknown' ? Math.round((parseInt(diskUsed) / parseInt(diskTotal)) * 100) : 0
        },
        uptime: uptime,
        loadAverage: {
          '1min': 'N/A',
          '5min': 'N/A',
          '15min': 'N/A'
        },
        processes: processes.length,
        processesList: processes
      },
      app: {
        onlineUsers,
        totalUsers,
        activeOrders,
        onlineStats,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    return handleApiError(error, 'admin-status');
  }
}