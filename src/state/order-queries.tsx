import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import type { NewOrderInput, Order } from '@/domain/orders';
import { errorMessage, unavailableRepository, type Command } from '@/services/order-repository';
import { createOrderQueryRuntime, type OrderMutation } from '@/services/order-query-runtime';
import { PreviewOrderRepository } from '@/services/preview-repository';

const RuntimeContext = createContext<ReturnType<typeof createOrderQueryRuntime> | null>(null);

export function OrderDataProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: true, refetchOnReconnect: true },
    mutations: { retry: false, networkMode: 'always' },
  } }));
  const [runtime] = useState(() => {
    const preview = process.env.EXPO_PUBLIC_ORDER_MODE === 'preview' || (!process.env.EXPO_PUBLIC_ORDER_MODE && __DEV__);
    return createOrderQueryRuntime(preview ? new PreviewOrderRepository() : unavailableRepository,
      { userId: preview ? 'preview-staff' : 'signed-out', branchId: preview ? 'preview-batanagar' : 'none' }, client);
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    return () => { subscription.remove(); focusManager.setFocused(undefined); };
  }, []);
  return <QueryClientProvider client={client}><RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider></QueryClientProvider>;
}

// Query cache owns saved tickets/menu. Zustand owns local UI and draft state only.
export function useOrders() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('useOrders must be used inside OrderDataProvider');
  const ordersQuery = useQuery(runtime.ordersOptions);
  const menuQuery = useQuery(runtime.menuOptions);
  const mutation = useMutation({ mutationKey: runtime.mutationKey, mutationFn: runtime.execute });
  const busy = useMutationState({ filters: { mutationKey: runtime.mutationKey, status: 'pending' }, select: m => {
    const input = m.state.variables as OrderMutation;
    return input.type === 'update' ? input.order.id : 'create';
  } });
  const error = ordersQuery.error ?? menuQuery.error;
  return {
    mode: runtime.repository.mode,
    orders: ordersQuery.data ?? [], menu: menuQuery.data ?? [],
    loading: ordersQuery.isFetching || menuQuery.isFetching,
    error: error ? errorMessage(error) : null,
    lastUpdated: ordersQuery.dataUpdatedAt ? new Date(ordersQuery.dataUpdatedAt).toISOString() : undefined,
    busy,
    refresh: async () => { await Promise.all([ordersQuery.refetch(), menuQuery.refetch()]); },
    mutate: (order: Order, command: Command) => mutation.mutateAsync({ type: 'update', order, command }),
    createOrder: (input: NewOrderInput, requestId: string) => mutation.mutateAsync({ type: 'create', input, requestId }),
  };
}
