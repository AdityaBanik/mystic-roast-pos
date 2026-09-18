import { createStore } from 'zustand/vanilla';
import type { MenuItem } from '../domain/menu';
import { fromCents, toCents, type Disposition, type FulfilmentType, type Order, type OrderLine } from '../domain/orders';
import { previewId } from '../services/preview-repository';

export type CartState = {
  baseline?: Order; lines: OrderLine[]; customerName: string; customerPhone: string;
  fulfilment: FulfilmentType; table: string; notes: string; dispositions: Record<string, Disposition>;
  query: string; category: string; drawer: 'closed' | 'cart' | 'customer';
  setQuery: (value: string) => void; setCategory: (value: string) => void;
  setDrawer: (value: CartState['drawer']) => void;
  setCustomer: (field: 'customerName' | 'customerPhone' | 'table' | 'notes', value: string) => void;
  setFulfilment: (value: FulfilmentType) => void;
  addItem: (item: MenuItem, selected?: string[], note?: string) => string | null;
  changeQuantity: (id: string, delta: number) => void; removeLine: (id: string) => void;
  setLineNote: (id: string, note: string) => void; clearCart: () => void;
  setDisposition: (id: string, value: Disposition) => void;
};

export function createCartStore(order?: Order) {
  return createStore<CartState>()((set, get) => ({
    baseline: order, lines: order?.lines.map(l => ({ ...l, selectedComponentIds: [...l.selectedComponentIds], modifiers: [...l.modifiers] })) ?? [],
    customerName: order?.customerName ?? '', customerPhone: order?.customerPhone ?? '',
    fulfilment: order?.fulfilment ?? 'takeaway', table: order?.tableNumber?.toString() ?? '', notes: order?.notes ?? '', dispositions: {},
    query: '', category: 'All', drawer: 'closed',
    setQuery: query => set({ query }), setCategory: category => set({ category }), setDrawer: drawer => set({ drawer }),
    setCustomer: (field, value) => set({ [field]: value }),
    setFulfilment: fulfilment => set({ fulfilment, table: fulfilment === 'dine_in' ? get().table : '' }),
    addItem: (item, selected = [], note = '') => {
      for (const group of item.groups) {
        const count = group.options.filter(o => selected.includes(o.id)).length;
        if (count < group.minimum || count > group.maximum) return 'Choose ' + group.minimum + '–' + group.maximum + ' options for ' + group.name + '.';
      }
      const options = item.groups.flatMap(g => g.options);
      if (new Set(selected).size !== selected.length || selected.some(id => !options.some(o => o.id === id))) return 'Check the item selections.';
      const ids = [...selected].sort(); const cleanNote = note.trim();
      const existing = get().lines.find(l => l.id.startsWith('draft-') && l.menuItemId === item.id && l.note === cleanNote && JSON.stringify(l.selectedComponentIds) === JSON.stringify(ids));
      if (existing) {
        if (existing.quantity >= 100) return 'An item can have at most 100 portions.';
        get().changeQuantity(existing.id, 1); return null;
      }
      if (get().lines.length >= 50) return 'An order can have at most 50 lines.';
      const chosen = options.filter(o => ids.includes(o.id));
      const line: OrderLine = { id: previewId('draft'), menuItemId: item.id, name: item.name, quantity: 1,
        unitPrice: fromCents(toCents(item.price) + chosen.reduce((s, o) => s + toCents(o.priceAdjustment), 0)),
        selectedComponentIds: ids, modifiers: [...item.fixedItems, ...chosen.map(o => o.name)], note: cleanNote };
      set(s => ({ lines: [...s.lines, line] })); return null;
    },
    changeQuantity: (id, delta) => set(s => ({ lines: s.lines.map(l => l.id === id ? { ...l, quantity: Math.min(100, Math.max(1, l.quantity + delta)) } : l) })),
    removeLine: id => set(s => ({ lines: s.lines.filter(l => l.id !== id) })),
    setLineNote: (id, note) => set(s => ({ lines: s.lines.map(l => l.id === id ? { ...l, note: note.slice(0, 500) } : l) })),
    clearCart: () => set({ lines: [], dispositions: {} }),
    setDisposition: (id, value) => set(s => ({ dispositions: { ...s.dispositions, [id]: value } })),
  }));
}
export const cartTotal = (s: Pick<CartState, 'lines'>) => fromCents(s.lines.reduce((n, l) => n + toCents(l.unitPrice) * l.quantity, 0));
export const cartCount = (s: Pick<CartState, 'lines'>) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const cartDirty = (s: CartState) => s.baseline
  ? JSON.stringify(s.lines) !== JSON.stringify(s.baseline.lines) || s.notes !== s.baseline.notes
  : !!(s.lines.length || s.customerName || s.customerPhone || s.table || s.notes || s.fulfilment !== 'takeaway');
export function checkoutError(s: CartState): string | null {
  if (!s.lines.length) return 'Add at least one item.';
  if (!s.baseline && !s.customerName.trim()) return 'Enter a customer name.';
  if (!s.baseline && s.customerPhone && !/^[0-9]{10}$/.test(s.customerPhone)) return 'Enter a ten-digit phone number, or leave it empty.';
  if (!s.baseline && s.fulfilment === 'dine_in' && !/^[1-9][0-9]{0,3}$/.test(s.table)) return 'Enter a table number between 1 and 9999 for dine-in.';
  if (s.baseline?.stockConsumedAt && s.baseline.lines.some(l => (s.lines.find(n => n.id === l.id)?.quantity ?? 0) < l.quantity && !s.dispositions[l.id])) return 'Classify removed prepared items as unused or waste.';
  return null;
}
