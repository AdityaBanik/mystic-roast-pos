export type KitchenStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'part_paid' | 'paid' | 'refund_due';
export type FulfilmentType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderSource = 'qr' | 'staff' | 'delivery';
export type KitchenTab = 'orders' | 'preparing' | 'ready';

export type OrderLine = { id: string; name: string; quantity: number; unitPrice: number; modifiers?: string[] };

export type Order = {
  id: string; displayNumber: string; customerName: string; customerPhone?: string;
  source: OrderSource; fulfilment: FulfilmentType; status: KitchenStatus; paymentStatus: PaymentStatus;
  total: number; netPaid: number; revision: number; lines: OrderLine[]; notes?: string;
  receivedAt: string; acceptedAt?: string; preparingAt?: string; readyAt?: string;
};

export const formatMoney = (amount: number) => `₹${amount.toFixed(0)}`;
export const sourceLabel: Record<OrderSource, string> = { qr: 'QR ORDER', staff: 'STAFF', delivery: 'DELIVERY APP' };
export const fulfilmentLabel: Record<FulfilmentType, string> = { dine_in: 'DINE-IN', takeaway: 'TAKEAWAY', delivery: 'DELIVERY' };
