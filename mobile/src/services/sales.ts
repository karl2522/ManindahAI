import { supabase } from '../lib/supabase';
import { InventoryService } from './inventory';

// ─── Types ───────────────────────────────────────────────────────────

export type Sale = {
  sale_id: string;
  store_id: string;
  date: string;
  total_amount: number;
  total_profit: number;
  created_at: string;
};

export type SaleItem = {
  sale_item_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
};

/**
 * Shape the UI passes when the owner records what was sold.
 * `price_at_sale` defaults to the product's current selling_price if omitted.
 */
export type SaleItemInput = {
  product_id: string;
  quantity: number;
  price_at_sale: number;
};

export type CreateSaleInput = {
  store_id: string;
  items: SaleItemInput[];
  /**
   * Optional map of product_id -> original_price.
   * If provided, avoids a network call to fetch prices for profit calculation.
   */
  originalPrices?: Record<string, number>;
};

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the original_price for each product so we can compute per-item profit.
 */
async function fetchOriginalPrices(
  productIds: string[]
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('products')
    .select('product_id, original_price')
    .in('product_id', productIds);

  if (error) throw new Error(`Failed to fetch product prices: ${error.message}`);

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    map[row.product_id] = row.original_price as number;
  }
  return map;
}

// ─── Service ─────────────────────────────────────────────────────────

export const SalesService = {
  /**
   * Record a completed sale.
   *
   * Flow (owner's perspective):
   * 1. Owner presses "Close Store" / "End of Day".
   * 2. Owner inputs which products were sold and quantities.
   * 3. UI calls `SalesService.create(...)`.
   * 4. This function:
   *    a) computes total_amount & total_profit
   *    b) inserts a row into `sales`
   *    c) inserts rows into `sale_items`
   *    d) deducts stock for each product via InventoryService (change_type = 'sale')
   */
  async create(input: CreateSaleInput): Promise<Sale> {
    if (input.items.length === 0) {
      throw new Error('A sale must contain at least one item.');
    }

    const productIds = input.items.map((i) => i.product_id);
    const originalPrices = input.originalPrices ?? (await fetchOriginalPrices(productIds));

    // Compute totals
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of input.items) {
      const lineAmount = item.price_at_sale * item.quantity;
      const originalPrice = originalPrices[item.product_id] ?? 0;
      const lineProfit = (item.price_at_sale - originalPrice) * item.quantity;

      totalAmount += lineAmount;
      totalProfit += lineProfit;
    }

    // 1. Insert sale header
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: input.store_id,
        total_amount: totalAmount,
        total_profit: totalProfit,
      })
      .select()
      .single();

    if (saleError) throw new Error(`Failed to create sale: ${saleError.message}`);

    // 2. Insert sale items
    const saleItemRows = input.items.map((item) => ({
      sale_id: sale.sale_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_sale: item.price_at_sale,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemRows);

    if (itemsError) throw new Error(`Failed to create sale items: ${itemsError.message}`);

    // 3. Deduct stock for each item (manual deduction, triggered by owner)
    for (const item of input.items) {
      await InventoryService.adjustStock(
        item.product_id,
        -item.quantity,
        'sale'
      );
    }

    return sale as Sale;
  },

  /**
   * Get all sales for a store, newest first.
   */
  async getByStoreId(store_id: string): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', store_id)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch sales: ${error.message}`);

    return data as Sale[];
  },

  /**
   * Get sale items for a specific sale, with product name joined.
   */
  async getSaleItems(
    sale_id: string
  ): Promise<(SaleItem & { product_name: string })[]> {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, products(name)')
      .eq('sale_id', sale_id);

    if (error) throw new Error(`Failed to fetch sale items: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      sale_item_id: row.sale_item_id,
      sale_id: row.sale_id,
      product_id: row.product_id,
      quantity: row.quantity,
      price_at_sale: row.price_at_sale,
      product_name: row.products?.name ?? 'Unknown',
    }));
  },

  /**
   * Get sales for a store within a date range (inclusive).
   * Useful for daily / monthly summaries.
   */
  async getByDateRange(
    store_id: string,
    startDate: string,
    endDate: string
  ): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', store_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch sales by date range: ${error.message}`);

    return data as Sale[];
  },

  /**
   * Delete a sale and its items. Use with caution.
   * NOTE: This does NOT reverse stock deductions.
   */
  async delete(sale_id: string): Promise<void> {
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', sale_id);

    if (itemsError) throw new Error(`Failed to delete sale items: ${itemsError.message}`);

    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('sale_id', sale_id);

    if (saleError) throw new Error(`Failed to delete sale: ${saleError.message}`);
  },
};
