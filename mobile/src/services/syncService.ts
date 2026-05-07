import { queryClient } from '../lib/queryClient';
import { getOutbox, removeFromOutbox, updateOutboxItem } from '../lib/outbox';
import { ProductService } from './product';
import { InventoryService } from './inventory';
import { SalesService } from './sales';
import { ExpenseService } from './expense';

export type SyncResult = { synced: number; failed: number; pending: number };

const MAX_RETRIES = 5;

export async function flushOutbox(): Promise<SyncResult> {
  const items = await getOutbox();
  if (items.length === 0) return { synced: 0, failed: 0, pending: 0 };

  let synced = 0;
  let failed = 0;
  let pending = 0;

  for (const item of items) {
    if (item.retry_count >= MAX_RETRIES) {
      failed++;
      continue;
    }

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
        case 'sale_create':
          await SalesService.create(item.payload);
          break;
        case 'expense_create':
          await ExpenseService.create(item.payload);
          break;
        case 'expense_update':
          await ExpenseService.update(item.expense_id, item.payload);
          break;
        case 'expense_delete':
          await ExpenseService.delete(item.expense_id);
          break;
      }
      
      await removeFromOutbox(item.id);
      
      // Invalidate relevant queries
      const queryKeys: any[][] = [];
      const op = item.op as string;
      if (op.startsWith('product') || op === 'inventory_adjust') {
        queryKeys.push(['products', item.store_id]);
      } else if (op.startsWith('sale')) {
        queryKeys.push(['sales', item.store_id]);
      } else if (op.startsWith('expense')) {
        queryKeys.push(['expenses', item.store_id]);
      }
      
      queryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      synced++;
    } catch (e: any) {
      console.error(`[SyncService] Failed op ${item.op} for item ${item.id}:`, e.message);
      await updateOutboxItem(item.id, { 
        retry_count: item.retry_count + 1,
        last_error: e.message 
      });
      pending++;
    }
  }

  return { synced, failed, pending };
}
