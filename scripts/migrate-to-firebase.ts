// Migration script: SQLite → Firebase Firestore
import { prisma } from '../lib/prisma';
import { 
  createProduct, 
  updateFooterSettings,
  COLLECTIONS 
} from '../lib/firestore';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function migrateProducts() {
  console.log('📦 Migrating products...');
  
  try {
    const products = await prisma.product.findMany({
      include: { variants: true }
    });
    
    console.log(`Found ${products.length} products to migrate`);
    
    for (const product of products) {
      const { variants, ...productData } = product;
      
      await createProduct({
        ...productData,
        images: product.images || [],
        variants: variants.map(v => ({
          name: v.name,
          price: v.price,
          description: v.description
        }))
      });
      
      console.log(`✅ Migrated: ${product.name}`);
    }
    
    console.log('✅ Products migration complete!');
  } catch (error) {
    console.error('❌ Error migrating products:', error);
  }
}

async function migrateFooterSettings() {
  console.log('⚙️ Migrating footer settings...');
  
  try {
    const settings = await prisma.footerSettings.findFirst();
    
    if (settings) {
      await updateFooterSettings({
        companyName: settings.companyName,
        email: settings.email,
        phone: settings.phone,
        telegram: settings.telegram,
        whatsapp: settings.whatsapp,
        vk: settings.vk,
        instagram: settings.instagram,
        description: settings.description,
        year: settings.year
      });
      
      console.log('✅ Footer settings migrated!');
    } else {
      console.log('ℹ️ No footer settings found');
    }
  } catch (error) {
    console.error('❌ Error migrating footer settings:', error);
  }
}

async function migrateUsers() {
  console.log('👤 Migrating users...');
  
  try {
    const users = await prisma.user.findMany();
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      await addDoc(collection(db, COLLECTIONS.USERS), {
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: user.password, // Keep hashed passwords
        role: user.role,
        createdAt: Timestamp.fromDate(user.createdAt),
        updatedAt: Timestamp.fromDate(user.updatedAt)
      });
      
      console.log(`✅ Migrated user: ${user.email}`);
    }
    
    console.log('✅ Users migration complete!');
  } catch (error) {
    console.error('❌ Error migrating users:', error);
  }
}

async function migrateOrders() {
  console.log('🛒 Migrating orders...');
  
  try {
    const orders = await prisma.order.findMany({
      include: { user: true }
    });
    
    console.log(`Found ${orders.length} orders to migrate`);
    
    for (const order of orders) {
      await addDoc(collection(db, COLLECTIONS.ORDERS), {
        userId: order.userId,
        userEmail: order.user.email,
        userName: order.user.name,
        productId: order.productId,
        variantId: order.variantId,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        status: order.status,
        stripeSessionId: order.stripeSessionId,
        downloadUrl: order.downloadUrl,
        createdAt: Timestamp.fromDate(order.createdAt),
        updatedAt: Timestamp.fromDate(order.updatedAt)
      });
      
      console.log(`✅ Migrated order: ${order.id}`);
    }
    
    console.log('✅ Orders migration complete!');
  } catch (error) {
    console.error('❌ Error migrating orders:', error);
  }
}

async function main() {
  console.log('🚀 Starting migration from SQLite to Firebase Firestore...\n');
  
  await migrateProducts();
  console.log('');
  
  await migrateFooterSettings();
  console.log('');
  
  await migrateUsers();
  console.log('');
  
  await migrateOrders();
  console.log('');
  
  console.log('✅ Migration complete! You can now use Firebase Firestore!');
  console.log('\n📝 Next steps:');
  console.log('1. Verify data in Firebase Console');
  console.log('2. Test your application');
  console.log('3. Update Firestore Security Rules');
  console.log('4. Optional: Remove prisma dependency if not needed');
  
  process.exit(0);
}

main().catch(console.error);
