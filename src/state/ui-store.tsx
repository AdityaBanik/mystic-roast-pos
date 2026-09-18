import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { KitchenTab } from '@/domain/orders';

type UiState = { kitchenTab: KitchenTab; setKitchenTab: (tab: KitchenTab) => void };
const createUiStore = () => createStore<UiState>()(set => ({ kitchenTab: 'orders', setKitchenTab: kitchenTab => set({ kitchenTab }) }));
const UiContext = createContext<ReturnType<typeof createUiStore> | null>(null);
export function UiProvider({ children }: PropsWithChildren) {
  const [store] = useState(createUiStore);
  return <UiContext.Provider value={store}>{children}</UiContext.Provider>;
}
export function useUi<T>(selector: (state: UiState) => T) {
  const store = useContext(UiContext);
  if (!store) throw new Error('UI store is missing');
  return useStore(store, selector);
}
