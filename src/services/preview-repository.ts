import { initialOrders } from '../data/mock-orders';
import { previewMenu } from '../data/preview-menu';
import { fromCents, isClosed, primaryAction, toCents, validatePayment } from '../domain/orders';
import type { NewOrderInput, Order, OrderLine } from '../domain/orders';
import { OrderError } from './order-repository';
import type { Mutation, OrderRepository } from './order-repository';

let serial = 0;
export const previewId = (prefix = 'preview-op') => prefix + '-' + Date.now().toString(36) + '-' + (++serial);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const fail = (code: string, message: string): never => { throw new OrderError(code, message); };
const total = (lines: OrderLine[]) => fromCents(lines.reduce((sum, l) => sum + toCents(l.unitPrice) * l.quantity, 0));
function validateLines(lines: OrderLine[]) {
  if (!lines.length || lines.length > 50) fail('LINES_REQUIRED', 'Keep 1–50 lines. Use Cancel to remove the entire order.');
  if (new Set(lines.map(l => l.id)).size !== lines.length) fail('DUPLICATE_LINE_KEY', 'Each line must have a unique key.');
  if (lines.some(l => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 100 || l.note.length > 500)) fail('INVALID_LINES', 'Each item needs a quantity of 1–100 and a note under 500 characters.');
}
function resolvePreviewLine(l: OrderLine): OrderLine {
  const m = previewMenu.find(m => m.id === l.menuItemId);
  if (!m) return fail('MENU_ITEM_UNAVAILABLE', 'This sample item is no longer available.');
  const options = m.groups.flatMap(g => g.options);
  if (new Set(l.selectedComponentIds).size !== l.selectedComponentIds.length || l.selectedComponentIds.some(id => !options.some(o => o.id === id))) fail('INVALID_SELECTIONS', 'Check the item choices.');
  for (const g of m.groups) {
    const n = g.options.filter(o => l.selectedComponentIds.includes(o.id)).length;
    if (n < g.minimum || n > g.maximum) fail('INVALID_SELECTIONS', 'Complete ' + g.name + '.');
  }
  const chosen = options.filter(o => l.selectedComponentIds.includes(o.id));
  return { ...l, id: previewId('line'), name: m.name, unitPrice: m.price + chosen.reduce((n, o) => n + o.priceAdjustment, 0), modifiers: [...m.fixedItems, ...chosen.map(o => o.name)] };
}

// In-memory UI simulator only. No inventory balances, recipes, ledger writes or
// financial transactions are performed here. A production adapter must delegate
// all authoritative mutation logic to the trusted server.
export class PreviewOrderRepository implements OrderRepository {
  readonly mode = 'preview' as const;
  private orders: Order[];
  private operations = new Map<string, { request: string; result: Order }>();
  private creates = new Map<string, { request: string; result: Order }>();
  private prepared = new Map<string, Record<string, number>>();
  constructor(seed = initialOrders()) {
    this.orders = clone(seed);
    for (const o of seed) if (o.stockConsumedAt) this.prepared.set(o.id, Object.fromEntries(o.lines.map(l => [l.id, l.quantity])));
  }
  async list() { return clone(this.orders); }
  async menu() { return clone(previewMenu); }
  async create(input: NewOrderInput, requestId: string) {
    const request = JSON.stringify(input); const prior = this.creates.get(requestId);
    if (prior) { if (prior.request !== request) fail('OPERATION_KEY_CONFLICT', 'This request was already used for another draft.'); return clone(prior.result); }
    validateLines(input.lines);
    if (input.customerName.trim().length > 120 || input.notes.length > 1000 || (input.customerPhone && !/^[0-9]{10}$/.test(input.customerPhone))) fail('INVALID_CUSTOMER_DETAILS', 'Use a name up to 120 characters and, if provided, a ten-digit phone number.');
    const lines = input.lines.map(resolvePreviewLine); const now = new Date().toISOString();
    const order: Order = {
      id: previewId('preview-order'), displayNumber: 'MR-' + (149 + this.creates.size), branchId: 'preview-batanagar',
      customerName: input.customerName.trim() || 'Walk-in guest', customerPhone: input.customerPhone || undefined,
      fulfilment: input.fulfilment, tableNumber: input.tableNumber, source: 'staff_pos', status: 'received',
      paymentStatus: 'unpaid', total: total(lines), netPaid: 0, revision: 1, version: 2, consumedRevision: null,
      receivedAt: now, notes: input.notes, lines, payments: [], settlementConfirmed: false,
      events: [{ id: previewId(), version: 2, revision: 1, action: 'received', occurredAt: now, description: 'Preview order submitted; no stock action' }],
    };
    this.orders.unshift(order); this.creates.set(requestId, { request, result: clone(order) }); return clone(order);
  }
  async mutate(input: Mutation): Promise<Order> {
    const key = input.orderId + ':' + input.operationId; const request = JSON.stringify(input); const prior = this.operations.get(key);
    if (prior) { if (prior.request !== request) fail('OPERATION_KEY_CONFLICT', 'This operation ID was already used.'); return clone(prior.result); }
    const index = this.orders.findIndex(o => o.id === input.orderId);
    if (index < 0) return fail('ORDER_NOT_FOUND', 'Order not found.');
    const o = clone(this.orders[index]); const c = input.command; const now = new Date().toISOString();
    if (o.version !== input.expectedVersion) return fail('ORDER_VERSION_CONFLICT', 'This order changed. Refresh it and review your action again.');
    if (o.status === 'completed' || (isClosed(o) && c.action !== 'record_payment')) return fail('ORDER_CLOSED', 'This order is closed.');
    let description: string = c.action.replaceAll('_', ' ');
    const prepared = { ...this.prepared.get(o.id) };
    switch (c.action) {
      case 'accept':
        if (o.status !== 'received') return fail('INVALID_STATUS', 'Only new orders can be accepted.');
        o.status = 'accepted'; o.acceptedAt = now; description = 'Accepted · reservation simulated'; break;
      case 'start_preparing':
        if (!['accepted', 'preparing'].includes(o.status)) return fail('INVALID_STATUS', 'Accept the order before preparing it.');
        for (const l of o.lines) prepared[l.id] = l.quantity;
        o.consumedRevision = o.revision; o.stockConsumedAt ??= now; o.preparingAt ??= now; o.status = 'preparing';
        description = 'Preparation confirmed for revision ' + o.revision + ' · stock simulation only'; break;
      case 'mark_ready':
        if (o.status !== 'preparing' || o.consumedRevision !== o.revision) return fail('UNPREPARED_REVISION', 'Prepare added items before marking ready.');
        o.status = 'ready'; o.readyAt = now; break;
      case 'complete': {
        const action = primaryAction(o);
        if (action?.action !== 'complete' || action.reason || !o.settlementConfirmed) return fail('UNSETTLED_ORDER', action?.reason ?? 'The order is not ready to complete.');
        o.status = 'completed'; o.completedAt = now; break;
      }
      case 'record_payment': {
        const error = validatePayment(o, c.payload); if (error) return fail('INVALID_PAYMENT', error);
        for (const method of ['cash', 'upi'] as const) if (c.payload[method] > 0) (o.payments ??= []).push({ id: previewId(), operationId: input.operationId, method, kind: c.payload.kind, amount: c.payload[method], reference: c.payload.reference.slice(0, 200), occurredAt: now });
        o.netPaid = o.total; o.paymentStatus = o.status === 'cancelled' ? 'refunded' : 'paid';
        description = (c.payload.kind === 'refund' ? 'Refund' : 'Payment') + ' recorded in preview'; break;
      }
      case 'edit': {
        validateLines(c.payload.lines);
        if (c.payload.note.length > 1000) return fail('NOTE_TOO_LONG', 'Order notes must be at most 1000 characters.');
        const previous = new Map(o.lines.map(l => [l.id, l]));
        const lines = c.payload.lines.map(l => {
          const old = previous.get(l.id);
          if (!old) { if (!l.id.startsWith('draft-')) return fail('UNKNOWN_LINE_KEY', 'Refresh the order before editing.'); return resolvePreviewLine(l); }
          return { ...old, quantity: l.quantity, note: l.note };
        });
        const dispositions: string[] = [];
        for (const [id, quantity] of Object.entries(prepared)) {
          const target = lines.find(l => l.id === id)?.quantity ?? 0;
          if (target < quantity) {
            const disposition = c.payload.removalDispositions[id];
            if (!['unused', 'waste'].includes(disposition)) return fail('REMOVAL_DISPOSITION_REQUIRED', 'Classify each removed prepared line as unused or waste.');
            dispositions.push((previous.get(id)?.name ?? 'Item') + ': ' + disposition);
            prepared[id] = target;
          }
        }
        o.lines = lines; o.notes = c.payload.note; o.revision++; o.total = total(lines);
        o.consumedRevision = o.stockConsumedAt && lines.every(l => (prepared[l.id] ?? 0) >= l.quantity) ? o.revision : null;
        if (o.status === 'ready') { o.status = 'preparing'; o.readyAt = undefined; }
        o.paymentStatus = o.netPaid > o.total ? 'refund_due' : o.netPaid === o.total ? 'paid' : o.netPaid > 0 ? 'part_paid' : 'unpaid';
        description = 'Saved revision ' + o.revision + (dispositions.length ? ' · ' + dispositions.join('; ') : ''); break;
      }
      case 'cancel': case 'reject':
        if (!c.payload.reason.trim()) return fail('REASON_REQUIRED', 'Enter a reason.');
        if (c.action === 'reject' && o.status !== 'received') return fail('INVALID_STATUS', 'Only new orders can be rejected.');
        if (o.stockConsumedAt && !['unused', 'waste'].includes(c.payload.disposition ?? '')) return fail('DISPOSITION_REQUIRED', 'Choose unused or waste for prepared items.');
        o.status = c.action === 'reject' ? 'rejected' : 'cancelled';
        if (c.action === 'reject') o.rejectedAt = now; else o.cancelledAt = now;
        o.total = 0; o.paymentStatus = o.netPaid > 0 ? 'refund_due' : 'unpaid';
        for (const id of Object.keys(prepared)) delete prepared[id];
        description = c.action + ': ' + c.payload.reason + (c.payload.disposition ? ' · ' + c.payload.disposition : ''); break;
    }
    o.settlementConfirmed = !isClosed(o) && o.consumedRevision === o.revision && toCents(o.netPaid) === toCents(o.total);
    if (o.status === 'completed') o.settlementConfirmed = true;
    o.version++;
    (o.events ??= []).push({ id: previewId(), version: o.version, revision: o.revision, action: c.action, occurredAt: now, description });
    this.prepared.set(o.id, prepared); this.orders[index] = o;
    this.operations.set(key, { request, result: clone(o) }); return clone(o);
  }
}
