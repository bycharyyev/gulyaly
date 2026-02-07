const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const passwordHash = await hash('TestPassword123!', 12);
    
    // Create seller
    const seller = await prisma.seller.create({
      data: {
        email: 'seller@test.com',
        passwordHash,
        name: 'Test Seller',
        role: 'SELLER',
        sellerStatus: 'APPROVED',
        isActive: true,
        banned: false
      }
    });
    
    console.log('Seller created:', seller.email, 'ID:', seller.id);
    
    // Create admin
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@test.com',
        passwordHash,
        name: 'Test Admin',
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('Admin created:', admin.email, 'ID:', admin.id);
    
    // Create store
    const store = await prisma.store.create({
      data: {
        name: 'Test Store',
        slug: 'test-store',
        description: 'A test store for products',
        isActive: true,
        ownerId: seller.id
      }
    });
    
    console.log('Store created:', store.name);
    
    // Create a sample product (will be pending approval)
    const product = await prisma.product.create({
      data: {
        name: 'Sample Digital Product',
        description: 'This is a sample product for testing',
        isActive: false,
        status: 'PENDING_APPROVAL',
        storeId: store.id,
        variants: {
          create: {
            name: 'Standard',
            price: 9900, // 99.00 in kopecks
            description: 'Standard version'
          }
        }
      }
    });
    
    console.log('Product created (PENDING_APPROVAL):', product.name);
    
    console.log('\n--- Test Accounts ---');
    console.log('Seller: seller@test.com / TestPassword123!');
    console.log('Admin: admin@test.com / TestPassword123!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
