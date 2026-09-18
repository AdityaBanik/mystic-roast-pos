import { QueryClient } from '@tanstack/react-query';
import type { NewOrderInput, Order } from '../domain/orders';
import { OrderError, type Command, type OrderRepository } from './order-repository';
import { previewId } from './preview-repository';

export type OrderScope = { userId: string; branchId: string };
export type OrderMutation = { type: 'update'; order: Order; command: Command } | { type: 'create'; input: NewOrderInput; requestId: string };

// One runtime per signed-in scope. When live auth is added, dispose this runtime
// and clear the query cache on logout/branch changes; never share tickets across users.
export function createOrderQueryRuntime(repository: OrderRepository, scope: OrderScope, client: QueryClient) {
  const prefix = [repository.mode, scope.userId, scope.branchId] as const;
  const ordersKey = [...prefix, 'orders'] as const;
  const menuKey = [...prefix, 'menu'] as const;
  const mutationKey = [...prefix, 'order-action'] as const;
  const locks = new Set<string>();
  const operationKeys = new Map<string, string>();
  const ordersOptions = { queryKey: ordersKey, queryFn: () => repository.list(), staleTime: 15_000, retry: false as const, networkMode: 'always' as const };
  const menuOptions = { queryKey: menuKey, queryFn: () => repository.menu(), staleTime: 60_000, retry: false as const, networkMode: 'always' as const };

  async function execute(mutation: OrderMutation): Promise<Order> {
    const lock = mutation.type === 'update' ? mutation.order.id : 'create';
    if (locks.has(lock)) throw new OrderError('BUSY', 'This action is already in progress.');
    locks.add(lock);
    try {
      await client.cancelQueries({ queryKey: ordersKey, exact: true });
      let result: Order;
      if (mutation.type === 'create') result = await repository.create(mutation.input, mutation.requestId);
      else {
        const { order, command } = mutation;
        const signature = JSON.stringify([order.id, order.version, command]);
        let operationId = operationKeys.get(signature);
        if (!operationId) { operationId = previewId(); operationKeys.set(signature, operationId); }
        result = await repository.mutate({ orderId: order.id, expectedVersion: order.version, operationId, command });
      }
      // A focus refresh may have started while the mutation was in flight.
      await client.cancelQueries({ queryKey: ordersKey, exact: true });
      client.setQueryData<Order[]>(ordersKey, current => {
        const existing = current?.find(o => o.id === result.id);
        if (existing && existing.version > result.version) return current;
        return existing ? current!.map(o => o.id === result.id ? result : o) : [result, ...(current ?? [])];
      });
      // Mark stale without racing an immediate background read against this ticket.
      await client.invalidateQueries({ queryKey: ordersKey, exact: true, refetchType: 'none' });
      return result;
    } catch (error) {
      if (error instanceof OrderError && error.code === 'ORDER_VERSION_CONFLICT') {
        await client.invalidateQueries({ queryKey: ordersKey, exact: true });
      }
      throw error;
    } finally { locks.delete(lock); }
  }
  return { repository, scope, ordersKey, menuKey, mutationKey, ordersOptions, menuOptions, execute };
}
