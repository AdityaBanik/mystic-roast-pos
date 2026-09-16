import { Order } from '@/domain/orders';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const initialOrders: Order[] = [
  { id: '148', displayNumber: 'MR-148', customerName: 'Ananya', customerPhone: '9830012345', source: 'qr', fulfilment: 'takeaway', status: 'received', paymentStatus: 'unpaid', total: 398, netPaid: 0, revision: 1, receivedAt: minutesAgo(2), lines: [
    { id: '148-1', name: 'Veg Farmhouse Pizza', quantity: 1, unitPrice: 239 },
    { id: '148-2', name: 'Iced Mocha', quantity: 1, unitPrice: 159 },
  ] },
  { id: '147', displayNumber: 'MR-147', customerName: 'Rohan', source: 'staff', fulfilment: 'dine_in', status: 'accepted', paymentStatus: 'paid', total: 577, netPaid: 577, revision: 2, receivedAt: minutesAgo(6), acceptedAt: minutesAgo(4), lines: [
    { id: '147-1', name: 'BBQ Chicken Pizza', quantity: 2, unitPrice: 249, modifiers: ['No onion'] },
    { id: '147-2', name: 'Virgin Classic Mojito', quantity: 1, unitPrice: 79 },
  ] },
  { id: '146', displayNumber: 'MR-146', customerName: 'Soham', source: 'qr', fulfilment: 'takeaway', status: 'accepted', paymentStatus: 'part_paid', total: 238, netPaid: 100, revision: 1, receivedAt: minutesAgo(9), acceptedAt: minutesAgo(7), lines: [
    { id: '146-1', name: 'BBQ Chicken Momo Combo', quantity: 1, unitPrice: 159, modifiers: ['Extra cheese'] },
    { id: '146-2', name: 'Blue Lagoon', quantity: 1, unitPrice: 79 },
  ] },
  { id: '145', displayNumber: 'MR-145', customerName: 'Priya', source: 'staff', fulfilment: 'takeaway', status: 'preparing', paymentStatus: 'unpaid', total: 328, netPaid: 0, revision: 1, receivedAt: minutesAgo(14), acceptedAt: minutesAgo(12), preparingAt: minutesAgo(8), lines: [
    { id: '145-1', name: 'BBQ Chicken Pizza', quantity: 1, unitPrice: 249 },
    { id: '145-2', name: 'Mystic Pineapple Splash', quantity: 1, unitPrice: 79 },
  ] },
  { id: '144', displayNumber: 'MR-144', customerName: 'Arjun', source: 'delivery', fulfilment: 'delivery', status: 'ready', paymentStatus: 'paid', total: 498, netPaid: 498, revision: 1, receivedAt: minutesAgo(22), acceptedAt: minutesAgo(20), preparingAt: minutesAgo(16), readyAt: minutesAgo(3), lines: [
    { id: '144-1', name: 'Peri-Peri Chicken Pizza', quantity: 2, unitPrice: 249 },
  ] },
];
