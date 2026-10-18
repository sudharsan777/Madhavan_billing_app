import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { MENU_ITEMS, MENU_CATEGORIES, MenuItem, MenuCategory } from '../data/menu';
import {
  getCachedCustomProducts,
  getCachedPriceOverrides,
  subscribeToProductsAndOverrides,
  updateProductPriceInFirestore,
  uploadProductToFirestore,
  deleteProductFromFirestore,
} from '../services/productService';

interface ProductContextType {
  products: MenuItem[];
  categories: string[];
  updatePrice: (productId: string, newPrice: number) => Promise<{ success: boolean; error?: string }>;
  uploadProduct: (data: {
    name: string;
    category: MenuCategory | string;
    price: number;
    image?: string;
    isVeg?: boolean;
    description?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  editingProduct: MenuItem | null;
  openPriceEdit: (item: MenuItem) => void;
  closePriceEdit: () => void;
  isUploadModalOpen: boolean;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  isSyncing: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customProducts, setCustomProducts] = useState<MenuItem[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  // 1. Initial Load from Local Cache for instant UI boot
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [cachedCustom, cachedOverrides] = await Promise.all([
          getCachedCustomProducts(),
          getCachedPriceOverrides(),
        ]);
        if (isMounted) {
          if (cachedCustom.length > 0) setCustomProducts(cachedCustom);
          if (Object.keys(cachedOverrides).length > 0) setPriceOverrides(cachedOverrides);
        }
      } catch (e) {
        console.warn('[ProductContext] Error loading initial cache:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-Time Cloud Firestore Sync
  useEffect(() => {
    const unsubscribe = subscribeToProductsAndOverrides(
      ({ customProducts: liveCustom, priceOverrides: liveOverrides }) => {
        setCustomProducts(liveCustom);
        setPriceOverrides(liveOverrides);
        setIsSyncing(false);
      },
      () => {
        setIsSyncing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 3. Merged Product List: Base MENU_ITEMS + Custom Items + Price Overrides applied
  const products: MenuItem[] = useMemo(() => {
    // Map base items with overrides applied
    const baseWithOverrides = MENU_ITEMS.map((item) => {
      const overriddenPrice = priceOverrides[item.id];
      if (overriddenPrice !== undefined) {
        return { ...item, price: overriddenPrice };
      }
      return item;
    });

    // Map custom items with overrides applied
    const customWithOverrides = customProducts.map((item) => {
      const overriddenPrice = priceOverrides[item.id];
      if (overriddenPrice !== undefined) {
        return { ...item, price: overriddenPrice };
      }
      return item;
    });

    // Custom items are placed at the top for easy access
    return [...customWithOverrides, ...baseWithOverrides];
  }, [customProducts, priceOverrides]);

  // 4. Dynamic Categories (preserves base order, appends any custom ones)
  const categories = useMemo(() => {
    const set = new Set<string>(MENU_CATEGORIES);
    customProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [customProducts]);

  // 5. Update Price Action
  const updatePrice = useCallback(async (productId: string, newPrice: number) => {
    // Optimistic UI update
    setPriceOverrides((prev) => ({ ...prev, [productId]: newPrice }));
    const result = await updateProductPriceInFirestore(productId, newPrice);
    return result;
  }, []);

  // 6. Upload Product Action
  const uploadProduct = useCallback(async (data: {
    name: string;
    category: MenuCategory | string;
    price: number;
    image?: string;
    isVeg?: boolean;
    description?: string;
  }) => {
    const result = await uploadProductToFirestore(data);
    if (result.success && result.product) {
      setCustomProducts((prev) => [result.product!, ...prev.filter((p) => p.id !== result.product!.id)]);
    }
    return result;
  }, []);

  // 7. Delete Product Action
  const deleteProduct = useCallback(async (productId: string) => {
    setCustomProducts((prev) => prev.filter((p) => p.id !== productId));
    setPriceOverrides((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    return await deleteProductFromFirestore(productId);
  }, []);

  const openPriceEdit = useCallback((item: MenuItem) => {
    setEditingProduct(item);
  }, []);

  const closePriceEdit = useCallback(() => {
    setEditingProduct(null);
  }, []);

  const openUploadModal = useCallback(() => {
    setIsUploadModalOpen(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    setIsUploadModalOpen(false);
  }, []);

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        updatePrice,
        uploadProduct,
        deleteProduct,
        editingProduct,
        openPriceEdit,
        closePriceEdit,
        isUploadModalOpen,
        openUploadModal,
        closeUploadModal,
        isSyncing,
      }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export default ProductContext;
