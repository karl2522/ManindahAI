import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateProductInput, UpdateProductInput } from '../services/product';
import type { InventoryChangeType } from '../services/inventory';

const OUTBOX_KEY = 'MANINDAH_OUTBOX';

export type OutboxInput =
  | { op: 'product_create'; store_id: string; payload: CreateProductInput }
  | { op: 'product_update'; store_id: string; product_id: string; payload: UpdateProductInput }
  | { op: 'product_delete'; store_id: string; product_id: string }
  | { op: 'inventory_adjust'; store_id: string; product_id: string; delta: number; change_type: InventoryChangeType };

export type OutboxItem =
  | { id: string; op: 'product_create'; store_id: string; payload: CreateProductInput }
  | { id: string; op: 'product_update'; store_id: string; product_id: string; payload: UpdateProductInput }
  | { id: string; op: 'product_delete'; store_id: string; product_id: string }
  | { id: string; op: 'inventory_adjust'; store_id: string; product_id: string; delta: number; change_type: InventoryChangeType };

export async function getOutbox(): Promise<OutboxItem[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxItem[];
  } catch {
    return [];
  }
}

export async function addToOutbox(item: OutboxInput): Promise<void> {
  const current = await getOutbox();
  const newItem = { ...item, id: `${Date.now()}_${Math.random().toString(36).slice(2)}` } as OutboxItem;
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...current, newItem]));
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
