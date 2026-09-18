import type { MenuItem } from '../domain/menu';
import type { EditInput, NewOrderInput, Order, PaymentInput, Disposition } from '../domain/orders';

export type Command =
  | { action: 'accept' | 'start_preparing' | 'mark_ready' | 'complete'; payload?: undefined }
  | { action: 'edit'; payload: EditInput }
  | { action: 'record_payment'; payload: PaymentInput }
  | { action: 'cancel' | 'reject'; payload: { reason: string; disposition?: Disposition } };
export type Mutation = { orderId: string; expectedVersion: number; operationId: string; command: Command };
export interface OrderRepository {
  mode: 'preview' | 'unavailable';
  list(): Promise<Order[]>;
  menu(): Promise<MenuItem[]>;
  create(input: NewOrderInput, requestId: string): Promise<Order>;
  mutate(input: Mutation): Promise<Order>;
}
export class OrderError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = 'OrderError'; }
}
export function errorMessage(error: unknown): string {
  return error instanceof OrderError ? error.message : 'Could not finish this action. Refresh the order and try again.';
}

// Transport payload only. A future trusted API supplies p_actor_id from the verified
// session. Screens never call public RPCs directly or access privileged credentials.
export function manageOrderPayload(input: Mutation) {
  const c = input.command;
  let payload: object = c.payload ?? {};
  if (c.action === 'edit') payload = {
    lines: c.payload.lines.map(l => l.id.startsWith('draft-') ? {
      menu_item_id: l.menuItemId, quantity: l.quantity, selected_component_ids: l.selectedComponentIds, note: l.note,
    } : { line_key: l.id, quantity: l.quantity, note: l.note }),
    note: c.payload.note, removal_dispositions: c.payload.removalDispositions,
  };
  return { p_order_id: input.orderId, p_expected_version: input.expectedVersion, p_operation_id: input.operationId, p_action: c.action, p_payload: payload };
}
export const unavailableRepository: OrderRepository = {
  mode: 'unavailable',
  async list() { throw new OrderError('NOT_CONNECTED', 'Live orders are not connected. A secure staff service and branch access are required.'); },
  async menu() { return []; },
  async create() { throw new OrderError('NOT_CONNECTED', 'Live order creation is not available.'); },
  async mutate() { throw new OrderError('NOT_CONNECTED', 'Live order actions are not available.'); },
};
