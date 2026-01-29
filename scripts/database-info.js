const { prisma } = require('../lib/prisma');

async function getDatabaseInfo() {
  try {
    console.log('🔍 Database Information');
    console.log('====================');
    
    // Get table info
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('\n📊 Tables:', tables.map(t => t.name).join(', '));
    
    // Get user count
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
    console.log('\n👥 Users:', userCount[0].count);
    
    // Get product count
    const productCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM products`;
    console.log('🛍️  Products:', productCount[0].count);
    
    // Get order count
    const orderCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM orders`;
    console.log('📦 Orders:', orderCount[0].count);
    
    // Get recent orders
    const recentOrders = await prisma.$queryRaw`
      SELECT o.id, u.name as userName, p.name as productName, o.status, o.createdAt
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN products p ON o.productId = p.id
      ORDER BY o.createdAt DESC
      LIMIT 5
    `;
    
    console.log('\n📋 Recent Orders:');
    recentOrders.forEach(order => {
      console.log(`  ${order.id} - ${order.userName || 'Unknown'} - ${order.productName} - ${order.status}`);
    });
    
    // Get admin users
    const adminUsers = await prisma.$queryRaw`SELECT email, name FROM users WHERE role = 'ADMIN'`;
    console.log('\n👑 Admin Users:');
    adminUsers.forEach(admin => {
      console.log(`  ${admin.email} - ${admin.name || 'No name'}`);
    });
    
    console.log('\n✅ Database connection successful!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getDatabaseInfo();
