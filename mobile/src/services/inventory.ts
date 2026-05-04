import { supabase } from '../lib/supabase';
import { Product } from './product';

export type InventoryChangeType = 'restock' | 'sale' | 'adjustment' | 'loss';

export type InventoryLog = {
  log_id: string;
  product_id: string;
  change_type: InventoryChangeType;
  quantity_changed: number;
  date: string;
};

export const LOW_STOCK_THRESHOLD = 5;

export const InventoryService = {
  /**
   * Adjust a product's stock level and record the change in inventory_logs.
   * Pass a positive quantity_changed for additions (restock/adjustment),
   * and a negative value for removals (sale/loss).
   */
  async adjustStock(
    product_id: string,
    quantity_changed: number,
    change_type: InventoryChangeType
  ): Promise<void> {
    const { error: logError } = await supabase
      .from('inventory_logs')
      .insert({ product_id, quantity_changed, change_type });

    if (logError) throw new Error(`Failed to log inventory change: ${logError.message}`);

    const { data: current, error: fetchError } = await supabase
      .from('products')
      .select('quantity')
      .eq('product_id', product_id)
      .single();

    if (fetchError) throw new Error(`Failed to fetch current quantity: ${fetchError.message}`);

    const newQuantity = Math.max(0, (current.quantity as number) + quantity_changed);

    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('product_id', product_id);

    if (updateError) throw new Error(`Failed to update quantity: ${updateError.message}`);
  },

  /**
   * Get the full inventory log history for a product, newest first.
   */
  async getLogs(product_id: string): Promise<InventoryLog[]> {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('product_id', product_id)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch inventory logs: ${error.message}`);

    return data as InventoryLog[];
  },

  /**
   * Get all products for a store that are at or below the low stock threshold.
   */
  async getLowStockProducts(
    store_id: string,
    threshold = LOW_STOCK_THRESHOLD
  ): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store_id)
      .lte('quantity', threshold)
      .order('quantity');

    if (error) throw new Error(`Failed to fetch low stock products: ${error.message}`);

    return data as Product[];
  },
};
