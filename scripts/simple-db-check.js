const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 DATABASE PANEL INFO');
    console.log('======================');
    
    // Database info
    console.log('\n🗄️  Database Details:');
    console.log('   Type: SQLite');
    console.log('   Location: ./prisma/dev.db');
    console.log('   Size: 131KB');
    
    // Tables
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('\n📊 Tables:', tables.length);
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
    
    // Records count
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
    const productCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products`;
    const orderCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM orders`;
    const addressCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM addresses`;
    
    console.log('\n📈 Records:');
    console.log(`   👥 Users: ${userCount[0].count}`);
    console.log(`   🛍️  Products: ${productCount[0].count}`);
    console.log(`   📦 Orders: ${orderCount[0].count}`);
    console.log(`   🏠 Addresses: ${addressCount[0].count}`);
    
    // Admin users
    const adminUsers = await prisma.$queryRaw`SELECT email, name FROM users WHERE role = 'ADMIN'`;
    console.log('\n👑 Admin Users:');
    if (adminUsers.length === 0) {
      console.log('   No admin users found');
    } else {
      adminUsers.forEach(admin => {
        console.log(`   ✅ ${admin.email} - ${admin.name || 'No name'}`);
      });
    }
    
    // Recent orders
    const recentOrders = await prisma.$queryRaw`
      SELECT o.id, u.name as userName, p.name as productName, o.status, o.amount, o.createdAt
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN products p ON o.productId = p.id
      ORDER BY o.createdAt DESC
      LIMIT 3
    `;
    
    console.log('\n📋 Recent Orders:');
    if (recentOrders.length === 0) {
      console.log('   No orders found');
    } else {
      recentOrders.forEach(order => {
        const date = new Date(order.createdAt).toLocaleDateString('ru-RU');
        const amount = order.amount ? `${order.amount / 100} ₽` : 'N/A';
        console.log(`   ${order.id} - ${order.userName || 'Unknown'} - ${order.productName} - ${order.status} - ${amount} - ${date}`);
      });
    }
    
    // Active products
    const activeProducts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products WHERE isActive = true`;
    console.log('\n🛍️  Products Status:');
    console.log(`   ✅ Active: ${activeProducts[0].count}`);
    console.log(`   ❌ Inactive: ${productCount[0].count - activeProducts[0].count}`);
    
    console.log('\n🌐 Access URLs:');
    console.log('   📱 Main App: http://localhost:3000');
    console.log('   🔐 Admin Panel: http://localhost:3000/admin-signin');
    console.log('   🔒 Database Info: http://localhost:5555 (admin/admin123)');
    console.log('   🗄️  Prisma Studio: npm run studio (port 5556)');
    
    console.log('\n✅ Database is healthy and accessible!');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
