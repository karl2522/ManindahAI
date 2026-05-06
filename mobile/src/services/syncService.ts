import { queryClient } from '../lib/queryClient';
import { getOutbox, removeFromOutbox } from '../lib/outbox';
import { ProductService } from './product';
import { InventoryService } from './inventory';

export type SyncResult = { synced: number; failed: number };

export async function flushOutbox(): Promise<SyncResult> {
  const items = await getOutbox();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      switch (item.op) {
        case 'product_create':
          await ProductService.create(item.payload);
          break;
        case 'product_update':
          await ProductService.update(item.product_id, item.payload);
          break;
        case 'product_delete':
          await ProductService.delete(item.product_id);
          break;
        case 'inventory_adjust':
          await InventoryService.adjustStock(item.product_id, item.delta, item.change_type);
          break;
      }
      await removeFromOutbox(item.id);
      queryClient.invalidateQueries({ queryKey: ['products', item.store_id] });
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
