import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateProductInput, UpdateProductInput } from '../services/product';
import type { InventoryChangeType } from '../services/inventory';
import type { CreateSaleInput } from '../services/sales';
import type { CreateExpenseInput, UpdateExpenseInput } from '../services/expense';

const OUTBOX_KEY = 'MANINDAH_OUTBOX';

export type OutboxOp =
  | 'product_create'
  | 'product_update'
  | 'product_delete'
  | 'inventory_adjust'
  | 'sale_create'
  | 'expense_create'
  | 'expense_update'
  | 'expense_delete';

export type OutboxInput =
  | { op: 'product_create'; store_id: string; payload: CreateProductInput }
  | { op: 'product_update'; store_id: string; product_id: string; payload: UpdateProductInput }
  | { op: 'product_delete'; store_id: string; product_id: string }
  | { op: 'inventory_adjust'; store_id: string; product_id: string; delta: number; change_type: InventoryChangeType }
  | { op: 'sale_create'; store_id: string; payload: CreateSaleInput }
  | { op: 'expense_create'; store_id: string; payload: CreateExpenseInput }
  | { op: 'expense_update'; store_id: string; expense_id: string; payload: UpdateExpenseInput }
  | { op: 'expense_delete'; store_id: string; expense_id: string };

export type OutboxItem = OutboxInput & {
  id: string;
  created_at: string;
  retry_count: number;
  last_error?: string;
};

export async function getOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as OutboxItem[];
    // Ensure chronological order
    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch {
    return [];
  }
}

export async function addToOutbox(item: OutboxInput): Promise<void> {
  const current = await getOutbox();
  const newItem: OutboxItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    retry_count: 0,
  };
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...current, newItem]));
}

export async function updateOutboxItem(id: string, updates: Partial<OutboxItem>): Promise<void> {
  const current = await getOutbox();
  const updated = current.map((i) => (i.id === id ? { ...i, ...updates } : i));
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(updated));
}

export async function removeFromOutbox(id: string): Promise<void> {
  const current = await getOutbox();
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(current.filter((i) => i.id !== id)));
}

export async function clearOutbox(): Promise<void> {
  await AsyncStorage.removeItem(OUTBOX_KEY);
}

export async function getOutboxCount(): Promise<number> {
  const items = await getOutbox();
  return items.length;
}
