import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../lib/firebase';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { MenuItem, MenuCategory } from '../data/menu';

const PRODUCTS_COLLECTION = 'products';
const PRICE_OVERRIDES_COLLECTION = 'price_overrides';
const ASYNC_CUSTOM_PRODUCTS_KEY = '@billing_custom_products';
const ASYNC_PRICE_OVERRIDES_KEY = '@billing_price_overrides';

export interface PriceOverride {
  productId: string;
  price: number;
  updatedAt?: string;
}

/**
 * Loads cached custom products from local AsyncStorage.
 */
export async function getCachedCustomProducts(): Promise<MenuItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_CUSTOM_PRODUCTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[ProductService] Error reading cached custom products:', err);
  }
  return [];
}

/**
 * Loads cached price overrides from local AsyncStorage.
 */
export async function getCachedPriceOverrides(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_PRICE_OVERRIDES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[ProductService] Error reading cached price overrides:', err);
  }
  return {};
}

/**
 * Updates a product's price in Cloud Firestore and AsyncStorage.
 * Works for both built-in menu items and custom uploaded items.
 */
export async function updateProductPriceInFirestore(
  productId: string,
  newPrice: number
): Promise<{ success: boolean; error?: string }> {
  if (typeof newPrice !== 'number' || isNaN(newPrice) || newPrice < 0) {
    return { success: false, error: 'Please enter a valid price.' };
  }

  // 1. Immediately update local AsyncStorage cache for instant responsiveness
  try {
    const currentOverrides = await getCachedPriceOverrides();
    currentOverrides[productId] = newPrice;
    await AsyncStorage.setItem(ASYNC_PRICE_OVERRIDES_KEY, JSON.stringify(currentOverrides));
  } catch (localErr) {
    console.warn('[ProductService] Local cache update error:', localErr);
  }

  // 2. Persist to Cloud Firestore if connected
  if (isFirebaseConfigured()) {
    try {
      const db = getDb();
      const docRef = doc(db, PRICE_OVERRIDES_COLLECTION, productId);
      await setDoc(
        docRef,
        {
          productId,
          price: newPrice,
          updatedAt: serverTimestamp(),
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true }
      );

      // If it's a custom product, also update its main document price
      try {
        const customDocRef = doc(db, PRODUCTS_COLLECTION, productId);
        await setDoc(customDocRef, { price: newPrice }, { merge: true });
      } catch {
        // Ignore if not in products collection
      }

      return { success: true };
    } catch (err: any) {
      console.error('[ProductService] Firestore price update error:', err);
      return {
        success: false,
        error: err?.message || 'Failed to sync price with Cloud Firestore. Saved locally.',
      };
    }
  }

  return { success: true };
}

/**
 * Uploads a new product to Cloud Firestore and updates local cache.
 */
export async function uploadProductToFirestore(productInput: {
  name: string;
  category: MenuCategory | string;
  price: number;
  image?: string;
  isVeg?: boolean;
  description?: string;
}): Promise<{ success: boolean; product?: MenuItem; error?: string }> {
  const trimmedName = productInput.name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Product name cannot be empty.' };
  }
  if (typeof productInput.price !== 'number' || isNaN(productInput.price) || productInput.price < 0) {
    return { success: false, error: 'Please enter a valid price.' };
  }

  const productId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newProduct: MenuItem = {
    id: productId,
    name: trimmedName,
    category: (productInput.category as MenuCategory) || 'Bread Omelette',
    price: productInput.price,
    image: productInput.image?.trim() || '',
    isVeg: productInput.isVeg !== undefined ? productInput.isVeg : true,
    rating: 5.0,
    description: productInput.description?.trim() || 'Freshly prepared item',
  };

  // 1. Immediately cache locally
  try {
    const customProds = await getCachedCustomProducts();
    const updated = [newProduct, ...customProds.filter((p) => p.id !== productId)];
    await AsyncStorage.setItem(ASYNC_CUSTOM_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (localErr) {
    console.warn('[ProductService] Local custom product cache error:', localErr);
  }

  // 2. Persist to Cloud Firestore
  if (isFirebaseConfigured()) {
    try {
      const db = getDb();
      const docRef = doc(db, PRODUCTS_COLLECTION, productId);
      await setDoc(docRef, {
        ...newProduct,
        createdAt: serverTimestamp(),
        createdAtIso: new Date().toISOString(),
      });
      return { success: true, product: newProduct };
    } catch (err: any) {
      console.error('[ProductService] Firestore upload error:', err);
      return {
        success: false,
        product: newProduct,
        error: err?.message || 'Saved locally, but could not sync with Firestore. Please check connection.',
      };
    }
  }

  return { success: true, product: newProduct };
}

/**
 * Deletes a custom product or resets price override in Cloud Firestore and AsyncStorage.
 */
export async function deleteProductFromFirestore(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  // Update local caches
  try {
    const customProds = await getCachedCustomProducts();
    const updatedProds = customProds.filter((p) => p.id !== productId);
    await AsyncStorage.setItem(ASYNC_CUSTOM_PRODUCTS_KEY, JSON.stringify(updatedProds));

    const overrides = await getCachedPriceOverrides();
    delete overrides[productId];
    await AsyncStorage.setItem(ASYNC_PRICE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn('[ProductService] Cache delete error:', err);
  }

  if (isFirebaseConfigured()) {
    try {
      const db = getDb();
      // Try deleting from custom products
      const prodDoc = doc(db, PRODUCTS_COLLECTION, productId);
      await deleteDoc(prodDoc);

      // Try deleting from price overrides
      const overrideDoc = doc(db, PRICE_OVERRIDES_COLLECTION, productId);
      await deleteDoc(overrideDoc);

      return { success: true };
    } catch (err: any) {
      console.error('[ProductService] Firestore delete error:', err);
      return { success: false, error: err?.message || 'Failed to delete from Firestore.' };
    }
  }

  return { success: true };
}

/**
 * Subscribes to real-time custom products and price overrides from Cloud Firestore.
 */
export function subscribeToProductsAndOverrides(
  onUpdate: (data: { customProducts: MenuItem[]; priceOverrides: Record<string, number> }) => void,
  onError?: (err: any) => void
): () => void {
  let customProducts: MenuItem[] = [];
  let priceOverrides: Record<string, number> = {};

  const emit = () => {
    onUpdate({ customProducts, priceOverrides });
  };

  if (!isFirebaseConfigured()) {
    // Return empty unsubscribe if not configured
    return () => {};
  }

  let unsubProducts = () => {};
  let unsubOverrides = () => {};

  try {
    const db = getDb();

    // 1. Subscribe to custom products
    unsubProducts = onSnapshot(
      collection(db, PRODUCTS_COLLECTION),
      (snapshot) => {
        const prods: MenuItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          prods.push({
            id: d.id,
            name: data.name || 'Unnamed',
            category: data.category || 'Bread Omelette',
            price: Number(data.price) || 0,
            image: data.image || '',
            isVeg: data.isVeg !== undefined ? data.isVeg : true,
            rating: data.rating !== undefined ? Number(data.rating) : 5.0,
            description: data.description || '',
          });
        });
        customProducts = prods;
        AsyncStorage.setItem(ASYNC_CUSTOM_PRODUCTS_KEY, JSON.stringify(prods)).catch(() => {});
        emit();
      },
      (err) => {
        console.warn('[ProductService] Error listening to products collection:', err);
        if (onError) onError(err);
      }
    );

    // 2. Subscribe to price overrides
    unsubOverrides = onSnapshot(
      collection(db, PRICE_OVERRIDES_COLLECTION),
      (snapshot) => {
        const overrides: Record<string, number> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.price !== undefined) {
            overrides[d.id] = Number(data.price);
          }
        });
        priceOverrides = overrides;
        AsyncStorage.setItem(ASYNC_PRICE_OVERRIDES_KEY, JSON.stringify(overrides)).catch(() => {});
        emit();
      },
      (err) => {
        console.warn('[ProductService] Error listening to price overrides:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error('[ProductService] Failed to establish Firestore subscriptions:', err);
    if (onError) onError(err);
  }

  return () => {
    unsubProducts();
    unsubOverrides();
  };
}
