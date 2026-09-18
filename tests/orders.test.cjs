const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PreviewOrderRepository } = require('../.test-build/services/preview-repository.js');
const { manageOrderPayload, unavailableRepository } = require('../.test-build/services/order-repository.js');
const { decodeTicket } = require('../.test-build/services/ticket-adapter.js');
const { initialOrders } = require('../.test-build/data/mock-orders.js');
const { amountDue, refundDue, inTab, primaryAction, paymentKind, parseMoney, validatePayment, formatMoney } = require('../.test-build/domain/orders.js');
let sequence = 0;
const act = (repo, o, action, payload, id = 'test-' + ++sequence) => repo.mutate({ orderId: o.id, expectedVersion: o.version, operationId: id, command: { action, payload } });
const collection = o => ({ kind: 'collection', cash: amountDue(o), upi: 0, reference: '' });

test('tab filters keep received and accepted together and exclude all closed states', () => {
  const o = initialOrders()[0];
  for (const status of ['received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected']) {
    const matches = ['orders', 'preparing', 'ready'].filter(t => inTab({ ...o, status }, t));
    assert.deepEqual(matches, ['received', 'accepted'].includes(status) ? ['orders'] : ['preparing', 'ready'].includes(status) ? [status] : []);
  }
});
test('received payment is unavailable, accepted supports full split and rejects partial', () => {
  const [received, accepted] = initialOrders();
  assert.equal(paymentKind(received), null);
  assert.equal(paymentKind(accepted), 'collection');
  assert.equal(validatePayment(accepted, { ...collection(accepted), cash: 100, upi: accepted.total - 100 }), null);
  assert.match(validatePayment(accepted, { ...collection(accepted), cash: 100 }), /must total/);
});
test('money parsing preserves paise and rejects signs, exponents and invalid precision', () => {
  for (const s of ['-1', '1e2', 'NaN', 'Infinity', '.2', '2.999', '', '100000001']) assert.equal(parseMoney(s), null);
  assert.equal(parseMoney('12.34'), 12.34); assert.equal(formatMoney(12.34), '₹12.34');
});
test('payment simulation leaves kitchen timestamps and consumed revision untouched', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[1];
  const result = await act(repo, o, 'record_payment', collection(o));
  for (const field of ['status', 'revision', 'acceptedAt', 'preparingAt', 'readyAt', 'stockConsumedAt', 'consumedRevision']) assert.equal(result[field], o[field]);
  assert.equal(result.paymentStatus, 'paid'); assert.equal(result.payments.length, 1);
});
test('same operation replay does not add another payment, altered reuse conflicts', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[1];
  const payload = collection(o); const first = await act(repo, o, 'record_payment', payload, 'stable');
  assert.deepEqual(await act(repo, o, 'record_payment', payload, 'stable'), first);
  await assert.rejects(act(repo, o, 'record_payment', { ...payload, reference: 'changed' }, 'stable'), { code: 'OPERATION_KEY_CONFLICT' });
  assert.equal((await repo.list()).find(n => n.id === o.id).payments.length, 1);
});
test('stale concurrent mutation conflicts rather than overwriting a newer ticket', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[1];
  const results = await Promise.allSettled([act(repo, o, 'start_preparing'), act(repo, o, 'record_payment', collection(o))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'ORDER_VERSION_CONFLICT');
});
test('preparation replay preserves the original timestamp and revision', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[1];
  const first = await act(repo, o, 'start_preparing', undefined, 'start');
  assert.deepEqual(await act(repo, o, 'start_preparing', undefined, 'start'), first);
  const again = await act(repo, first, 'start_preparing');
  assert.equal(again.preparingAt, first.preparingAt); assert.equal(again.consumedRevision, first.revision);
});
test('ready and complete do not change preparation markers; due blocks complete', async () => {
  const repo = new PreviewOrderRepository(); const preparing = (await repo.list())[2];
  const ready = await act(repo, preparing, 'mark_ready');
  assert.equal(ready.stockConsumedAt, preparing.stockConsumedAt);
  await assert.rejects(act(repo, ready, 'complete'), { code: 'UNSETTLED_ORDER' });
  const paid = await act(repo, ready, 'record_payment', collection(ready));
  const done = await act(repo, paid, 'complete');
  assert.equal(done.consumedRevision, preparing.consumedRevision); assert.equal(done.preparingAt, preparing.preparingAt);
  assert.equal(primaryAction(done), null); assert.equal(paymentKind(done), null);
});
test('prepared additions reserve a new revision and require Prepare added items', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[2];
  const lines = o.lines.map((l, i) => ({ ...l, quantity: i === 0 ? l.quantity + 1 : l.quantity }));
  const edited = await act(repo, o, 'edit', { lines, note: '', removalDispositions: {} });
  assert.equal(edited.consumedRevision, null); assert.equal(primaryAction(edited).label, 'PREPARE ADDED ITEMS');
  await assert.rejects(act(repo, edited, 'mark_ready'), { code: 'UNPREPARED_REVISION' });
  const prepared = await act(repo, edited, 'start_preparing');
  assert.equal(primaryAction(prepared).action, 'mark_ready');
});
test('prepared reduction needs explicit classification and keeps a refund visible', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[3];
  const lines = o.lines.map(l => ({ ...l, quantity: 1 }));
  await assert.rejects(act(repo, o, 'edit', { lines, note: '', removalDispositions: {} }), { code: 'REMOVAL_DISPOSITION_REQUIRED' });
  assert.equal((await repo.list()).find(n => n.id === o.id).revision, o.revision);
  const edited = await act(repo, o, 'edit', { lines, note: '', removalDispositions: { [lines[0].id]: 'waste' } });
  assert.equal(edited.status, 'preparing'); assert.equal(edited.readyAt, undefined);
  assert.equal(edited.paymentStatus, 'refund_due'); assert.equal(refundDue(edited), 249);
  assert.match(edited.events.at(-1).description, /waste/);
});
test('cancelled refunds settle money without moving kitchen or preparation', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[4];
  assert.equal(paymentKind(o), 'refund');
  const refunded = await act(repo, o, 'record_payment', { kind: 'refund', cash: 100, upi: 79, reference: 'return' });
  assert.equal(refunded.status, 'cancelled'); assert.equal(refunded.paymentStatus, 'refunded');
  assert.equal(refunded.netPaid, 0); assert.equal(refundDue(refunded), 0);
  assert.equal(refunded.payments.filter(p => p.kind === 'refund').length, 2);
});
test('cancelling prepared items requires disposition and does not automatically refund', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[3];
  await assert.rejects(act(repo, o, 'cancel', { reason: 'Changed mind' }), { code: 'DISPOSITION_REQUIRED' });
  const result = await act(repo, o, 'cancel', { reason: 'Changed mind', disposition: 'unused' });
  assert.equal(result.netPaid, o.netPaid); assert.equal(result.paymentStatus, 'refund_due');
  assert.equal(result.payments.length, o.payments.length);
});
test('closed order editing and ready skip are rejected', async () => {
  const repo = new PreviewOrderRepository(); const [received, , , , cancelled] = await repo.list();
  await assert.rejects(act(repo, received, 'mark_ready'), { code: 'UNPREPARED_REVISION' });
  await assert.rejects(act(repo, cancelled, 'edit', { lines: cancelled.lines, note: '', removalDispositions: {} }), { code: 'ORDER_CLOSED' });
});
test('submission retry is stable, uses canonical sample prices and starts received', async () => {
  const repo = new PreviewOrderRepository(); const o = (await repo.list())[0];
  const input = { customerName: 'Walk-in', fulfilment: 'takeaway', notes: '', lines: o.lines.map(l => ({ ...l, unitPrice: 0.01 })) };
  const created = await repo.create(input, 'checkout');
  assert.deepEqual(await repo.create(input, 'checkout'), created);
  assert.equal(created.status, 'received'); assert.equal(created.acceptedAt, undefined); assert.equal(created.stockConsumedAt, undefined);
  assert.equal(created.total, 398);
  await assert.rejects(repo.create({ ...input, notes: 'changed' }, 'checkout'), { code: 'OPERATION_KEY_CONFLICT' });
});
test('edit transport excludes client prices and separates old line keys from new selections', () => {
  const line = initialOrders()[0].lines[0];
  const payload = manageOrderPayload({ orderId: 'order', expectedVersion: 4, operationId: 'op', command: { action: 'edit', payload: { lines: [line, { ...line, id: 'draft-new' }], note: 'Note', removalDispositions: {} } } });
  assert.deepEqual(payload.p_payload.lines[0], { line_key: line.id, quantity: line.quantity, note: line.note });
  assert.equal(payload.p_payload.lines[1].menu_item_id, line.menuItemId);
  assert.equal('unit_price' in payload.p_payload.lines[1], false); assert.equal('p_actor_id' in payload, false);
});
test('unavailable adapter never falls back to demo writes', async () => {
  await assert.rejects(unavailableRepository.list(), { code: 'NOT_CONNECTED' });
  await assert.rejects(unavailableRepository.create({}, 'key'), { code: 'NOT_CONNECTED' });
});
test('ticket adapter preserves live version and rejects invented enum values', () => {
  const raw = { id: 'id', branch_id: 'branch', order_number: 123, customer_name: 'Guest', source: 'qr_customer', status: 'rejected', payment_status: 'refunded', revision: 2, version: 7, consumed_revision: null, total: 0, net_paid: 0, lines: [], note: '', received_at: '2026-09-18T00:00:00Z' };
  const o = decodeTicket(raw); assert.equal(o.version, 7); assert.equal(o.customerPhone, undefined); assert.equal(o.fulfilment, undefined);
  for (const change of [{ status: 'pending' }, { source: 'delivery' }, { payment_status: 'partial' }, { total: NaN }, { version: 1.2 }, { received_at: 'bad-date' }]) assert.throws(() => decodeTicket({ ...raw, ...change }), { code: 'INVALID_TICKET' });
});
