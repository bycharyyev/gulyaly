// Firebase Storage Helpers
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from './firebase';

// Upload image and get URL
export const uploadImage = async (
  file: File | Buffer, 
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    
    if (onProgress) {
      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    } else {
      // Simple upload
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image
export const deleteImage = async (url: string): Promise<boolean> => {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
    if (!pathMatch) return false;
    
    const path = decodeURIComponent(pathMatch[1]);
    const imageRef = ref(storage, path);
    
    await deleteObject(imageRef);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};

// Upload product image
export const uploadProductImage = async (
  file: File | Buffer,
  productId: string,
  index: number = 0
): Promise<string> => {
  const timestamp = Date.now();
  const path = `products/${productId}/image-${index}-${timestamp}`;
  return uploadImage(file, path);
};

// Upload multiple images
export const uploadMultipleImages = async (
  files: (File | Buffer)[],
  productId: string,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map((file, index) => 
    uploadProductImage(file, productId, index).then(url => {
      onProgress?.(index, 100);
      return url;
    })
  );
  
  return Promise.all(uploadPromises);
};

// Generate storage path
export const getStoragePath = (type: 'products' | 'users', id: string, filename: string) => {
  const timestamp = Date.now();
  return `${type}/${id}/${timestamp}-${filename}`;
};
