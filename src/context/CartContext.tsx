import React, { createContext, useContext, useState, useMemo } from 'react';
import { MenuItem } from '../data/menu';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  discountPercent: number;
  setDiscountPercent: (discount: number) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  totalItemCount: number;
  getItemQuantity: (itemId: string) => number;
  updateItemPrice: (itemId: string, newPrice: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [tableNumber, setTableNumber] = useState<string>('Table 1');

  const addToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((ci) => ci.item.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter((ci): ci is CartItem => ci !== null);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountPercent(0);
  };

  const getItemQuantity = (itemId: string): number => {
    const found = cartItems.find((ci) => ci.item.id === itemId);
    return found ? found.quantity : 0;
  };

  const updateItemPrice = (itemId: string, newPrice: number) => {
    setCartItems((prev) =>
      prev.map((ci) =>
        ci.item.id === itemId
          ? { ...ci, item: { ...ci.item, price: newPrice } }
          : ci
      )
    );
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        discountPercent,
        setDiscountPercent,
        tableNumber,
        setTableNumber,
        subtotal,
        discountAmount,
        totalAmount,
        totalItemCount,
        getItemQuantity,
        updateItemPrice,
      }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
