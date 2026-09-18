import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useStore } from 'zustand';
import type { Order } from '@/domain/orders';
import { createCartStore, type CartState } from './cart-store';

const CartContext = createContext<ReturnType<typeof createCartStore> | null>(null);
export function CartProvider({ order, children }: PropsWithChildren<{ order?: Order }>) {
  const [store] = useState(() => createCartStore(order));
  return <CartContext.Provider value={store}>{children}</CartContext.Provider>;
}
export function useCartApi() {
  const store = useContext(CartContext);
  if (!store) throw new Error('Cart provider is missing');
  return store;
}
export function useCart<T>(selector: (state: CartState) => T) {
  return useStore(useCartApi(), selector);
}
