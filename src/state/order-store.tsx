import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { initialOrders } from '@/data/mock-orders';
import { FulfilmentType, Order, OrderLine } from '@/domain/orders';

type NewOrderInput = { customerName: string; customerPhone?: string; fulfilment: FulfilmentType; lines: OrderLine[] };
type OrderStore = {
  orders: Order[];
  acceptOrder: (id: string) => void;
  startPreparing: (id: string) => void;
  markReady: (id: string) => void;
  completeOrder: (id: string) => boolean;
  recordPayment: (id: string, amount?: number) => void;
  createOrder: (input: NewOrderInput) => string;
};

const OrderStoreContext = createContext<OrderStore | null>(null);

export function OrderStoreProvider({ children }: PropsWithChildren) {
  const [orders, setOrders] = useState(initialOrders);
  const patchOrder = (id: string, patch: Partial<Order>) => setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch } : order));

  const value = useMemo<OrderStore>(() => ({
    orders,
    acceptOrder: (id) => patchOrder(id, { status: 'accepted', acceptedAt: new Date().toISOString() }),
    startPreparing: (id) => patchOrder(id, { status: 'preparing', preparingAt: new Date().toISOString() }),
    markReady: (id) => patchOrder(id, { status: 'ready', readyAt: new Date().toISOString() }),
    completeOrder: (id) => {
      const order = orders.find((candidate) => candidate.id === id);
      if (!order || order.paymentStatus !== 'paid') return false;
      patchOrder(id, { status: 'completed' });
      return true;
    },
    recordPayment: (id, amount) => {
      const order = orders.find((candidate) => candidate.id === id);
      if (!order) return;
      const paid = Math.min(order.total, order.netPaid + (amount ?? order.total - order.netPaid));
      patchOrder(id, { netPaid: paid, paymentStatus: paid >= order.total ? 'paid' : paid > 0 ? 'part_paid' : 'unpaid' });
    },
    createOrder: (input) => {
      const nextNumber = Math.max(...orders.map((order) => Number(order.id)), 148) + 1;
      const id = String(nextNumber);
      const total = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const order: Order = { id, displayNumber: `MR-${id}`, customerName: input.customerName || 'Walk-in guest', customerPhone: input.customerPhone, source: 'staff', fulfilment: input.fulfilment, status: 'received', paymentStatus: 'unpaid', total, netPaid: 0, revision: 1, receivedAt: new Date().toISOString(), lines: input.lines };
      setOrders((current) => [order, ...current]);
      return id;
    },
  }), [orders]);

  return <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>;
}

export function useOrderStore() {
  const store = useContext(OrderStoreContext);
  if (!store) throw new Error('useOrderStore must be used inside OrderStoreProvider');
  return store;
}
