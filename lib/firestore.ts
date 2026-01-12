// Firestore Database Helpers
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

// Collections
export const COLLECTIONS = {
  PRODUCTS: 'products',
  PRODUCT_VARIANTS: 'productVariants',
  ORDERS: 'orders',
  USERS: 'users',
  SUPPORT_MESSAGES: 'supportMessages',
  FOOTER_SETTINGS: 'footerSettings',
  SMS_SETTINGS: 'smsSettings',
  SMS_LOGS: 'smsLogs'
};

// Product functions
export const getProducts = async (activeOnly = true) => {
  try {
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    let q = query(productsRef, orderBy('createdAt', 'desc'));
    
    if (activeOnly) {
      q = query(productsRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      variants: [] as any[]
    }));
    
    // Get variants for each product
    for (const product of products) {
      const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
      const variantsQuery = query(variantsRef, where('productId', '==', product.id));
      const variantsSnapshot = await getDocs(variantsQuery);
      product.variants = variantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    
    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProduct = async (id: string) => {
  try {
    const productDoc = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    if (!productDoc.exists()) return null;
    
    const product = {
      id: productDoc.id,
      ...productDoc.data(),
      createdAt: productDoc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: productDoc.data().updatedAt?.toDate?.() || new Date(),
      variants: [] as any[]
    };
    
    // Get variants
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const variantsQuery = query(variantsRef, where('productId', '==', id));
    const variantsSnapshot = await getDocs(variantsQuery);
    product.variants = variantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return product;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
};

export const createProduct = async (data: any) => {
  try {
    const { variants, ...productData } = data;
    
    // Create product
    const productRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
      ...productData,
      isActive: productData.isActive ?? true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Create variants
    const variantPromises = variants.map((variant: any) =>
      addDoc(collection(db, COLLECTIONS.PRODUCT_VARIANTS), {
        ...variant,
        productId: productRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    );
    
    await Promise.all(variantPromises);
    
    return { id: productRef.id, ...productData };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, data: any) => {
  try {
    const { variants, ...productData } = data;
    
    // Update product
    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), {
      ...productData,
      updatedAt: Timestamp.now()
    });
    
    // Delete old variants
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const oldVariantsQuery = query(variantsRef, where('productId', '==', id));
    const oldVariantsSnapshot = await getDocs(oldVariantsQuery);
    const deletePromises = oldVariantsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Create new variants
    if (variants && variants.length > 0) {
      const variantPromises = variants.map((variant: any) =>
        addDoc(collection(db, COLLECTIONS.PRODUCT_VARIANTS), {
          ...variant,
          productId: id,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      );
      await Promise.all(variantPromises);
    }
    
    return { id, ...productData };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    // Delete variants first
    const variantsRef = collection(db, COLLECTIONS.PRODUCT_VARIANTS);
    const variantsQuery = query(variantsRef, where('productId', '==', id));
    const variantsSnapshot = await getDocs(variantsQuery);
    const deletePromises = variantsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete product
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Footer settings
export const getFooterSettings = async () => {
  try {
    const settingsRef = collection(db, COLLECTIONS.FOOTER_SETTINGS);
    const snapshot = await getDocs(settingsRef);
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting footer settings:', error);
    return null;
  }
};

export const updateFooterSettings = async (data: any) => {
  try {
    const settingsRef = collection(db, COLLECTIONS.FOOTER_SETTINGS);
    const snapshot = await getDocs(settingsRef);
    
    if (snapshot.empty) {
      // Create new
      await addDoc(settingsRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } else {
      // Update existing
      await updateDoc(snapshot.docs[0].ref, {
        ...data,
        updatedAt: Timestamp.now()
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error updating footer settings:', error);
    throw error;
  }
};

// SMS Settings functions
export const getSMSSettings = async () => {
  try {
    const settingsRef = collection(db, COLLECTIONS.SMS_SETTINGS);
    const snapshot = await getDocs(settingsRef);
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting SMS settings:', error);
    return null;
  }
};

export const updateSMSSettings = async (data: any) => {
  try {
    console.log('Updating SMS settings:', data);
    const settingsRef = collection(db, COLLECTIONS.SMS_SETTINGS);
    const snapshot = await getDocs(settingsRef);
    
    if (snapshot.empty) {
      // Create new
      console.log('Creating new SMS settings');
      const docRef = await addDoc(settingsRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      console.log('SMS settings created with ID:', docRef.id);
    } else {
      // Update existing
      console.log('Updating existing SMS settings, doc ID:', snapshot.docs[0].id);
      await updateDoc(snapshot.docs[0].ref, {
        ...data,
        updatedAt: Timestamp.now()
      });
      console.log('SMS settings updated successfully');
    }
    
    return data;
  } catch (error: any) {
    console.error('Error updating SMS settings:', error);
    console.error('Error details:', error.message, error.code);
    
    if (error.code === 'permission-denied') {
      throw new Error('Firestore permissions denied. Please update Security Rules in Firebase Console.');
    }
    
    throw error;
  }
};
