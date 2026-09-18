const { test } = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient } = require('@tanstack/react-query');
const { createCartStore, cartTotal, cartCount, checkoutError } = require('../.test-build/state/cart-store.js');
const { createOrderQueryRuntime } = require('../.test-build/services/order-query-runtime.js');
const { previewMenu } = require('../.test-build/data/preview-menu.js');
const { initialOrders } = require('../.test-build/data/mock-orders.js');

test('cart merges equivalent drafts but keeps preparation notes separate', () => {
  const store = createCartStore(); const s = store.getState();
  s.addItem(previewMenu[0]); s.addItem(previewMenu[0]); s.addItem(previewMenu[0], [], 'No onion');
  assert.equal(store.getState().lines.length, 2);
  assert.equal(cartCount(store.getState()), 3); assert.equal(cartTotal(store.getState()), 747);
  assert.equal(createCartStore().getState().lines.length, 0);
});
test('combo selections are validated and priced before entering the cart', () => {
  const store = createCartStore(); const s = store.getState(); const combo = previewMenu[3];
  assert.match(s.addItem(combo), /Choose/);
  assert.match(s.addItem(combo, ['unknown']), /Choose|Check/);
  assert.equal(s.addItem(combo, ['preview-sauce-cheese']), null);
  assert.equal(cartTotal(store.getState()), 169);
});
test('checkout preserves customer across drawer steps and requires a dine-in table', () => {
  const store = createCartStore(); const s = store.getState(); s.addItem(previewMenu[0]);
  assert.match(checkoutError(store.getState()), /customer name/);
  s.setCustomer('customerName', 'Aditya'); s.setFulfilment('dine_in');
  assert.match(checkoutError(store.getState()), /table number/);
  s.setCustomer('table', '3'); s.setDrawer('customer'); s.setDrawer('cart');
  assert.equal(store.getState().customerName, 'Aditya'); assert.equal(checkoutError(store.getState()), null);
  s.setFulfilment('takeaway'); assert.equal(store.getState().table, '');
  s.setCustomer('customerPhone', '123'); assert.match(checkoutError(store.getState()), /ten-digit/);
});
test('editing preserves original line identity and does not mutate saved tickets', () => {
  const order = initialOrders()[0]; const snapshot = structuredClone(order);
  const store = createCartStore(order); const s = store.getState();
  s.changeQuantity(s.lines[0].id, 1); s.setLineNote(s.lines[0].id, 'Test');
  s.addItem(previewMenu.find(m => m.id === s.lines[0].menuItemId));
  assert.equal(store.getState().lines.length, order.lines.length + 1);
  assert.deepEqual(order, snapshot); assert.equal(store.getState().lines[0].id, order.lines[0].id);
});
test('prepared reductions require an unused/waste decision', () => {
  const order = initialOrders()[3]; const store = createCartStore(order); const s = store.getState();
  s.changeQuantity(s.lines[0].id, -1);
  assert.match(checkoutError(store.getState()), /unused or waste/);
  s.setDisposition(s.lines[0].id, 'waste'); assert.equal(checkoutError(store.getState()), null);
});

function runtime(t, mutate) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  t.after(() => client.clear());
  const repo = { mode: 'preview', list: async () => initialOrders(), menu: async () => previewMenu, mutate };
  return { client, repo, rt: createOrderQueryRuntime(repo, { userId: 'staff', branchId: 'a' }, client) };
}
test('query keys isolate staff and branches', t => {
  const { client, repo, rt } = runtime(t, async () => {});
  const other = createOrderQueryRuntime(repo, { userId: 'staff', branchId: 'b' }, client);
  client.setQueryData(rt.ordersKey, initialOrders());
  assert.equal(client.getQueryData(other.ordersKey), undefined);
});
test('pending commands cannot double-submit and do not optimistically move kitchen state', async t => {
  let finish; let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const { client, rt } = runtime(t, () => { entered(); return new Promise(resolve => { finish = resolve; }); });
  const order = initialOrders()[0]; client.setQueryData(rt.ordersKey, [order]);
  const mutation = { type: 'update', order, command: { action: 'accept' } };
  const pending = rt.execute(mutation); await started;
  assert.equal(client.getQueryData(rt.ordersKey)[0].status, 'received');
  await assert.rejects(rt.execute(mutation), { code: 'BUSY' });
  finish({ ...order, status: 'accepted', version: order.version + 1 }); await pending;
  assert.equal(client.getQueryData(rt.ordersKey)[0].status, 'accepted');
});
test('manual retry keeps the operation key after an ambiguous failure', async t => {
  const requests = []; const order = initialOrders()[0];
  const { rt } = runtime(t, async request => { requests.push(request); if (requests.length === 1) throw new Error('Response lost'); return { ...order, version: order.version + 1 }; });
  const mutation = { type: 'update', order, command: { action: 'accept' } };
  await assert.rejects(rt.execute(mutation), /Response lost/); await rt.execute(mutation);
  assert.equal(requests[0].operationId, requests[1].operationId);
  assert.equal(requests[0].expectedVersion, requests[1].expectedVersion);
});
test('a replayed older response cannot downgrade a newer cached ticket', async t => {
  const order = initialOrders()[0]; const newer = { ...order, version: order.version + 3 };
  const { client, rt } = runtime(t, async () => ({ ...order, version: order.version + 1 }));
  client.setQueryData(rt.ordersKey, [newer]);
  await rt.execute({ type: 'update', order, command: { action: 'accept' } });
  assert.equal(client.getQueryData(rt.ordersKey)[0].version, newer.version);
});
