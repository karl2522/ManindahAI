import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────

export type Supplier = {
  supplier_id: string;
  name: string;
  contact_info: string | null;
  created_at: string;
};

export type SupplierPrice = {
  supplier_price_id: string;
  product_id: string;
  supplier_id: string;
  price: number;
  date_recorded: string;
};

export type CreateSupplierInput = {
  name: string;
  contact_info?: string;
};

export type CreateSupplierPriceInput = {
  product_id: string;
  supplier_id: string;
  price: number;
};

/**
 * Returned by `getCheapestForProduct` — includes supplier details alongside the price.
 */
export type SupplierPriceWithName = SupplierPrice & { supplier_name: string };

// ─── Service ─────────────────────────────────────────────────────────

export const SupplierService = {
  /**
   * Get all suppliers, ordered by name.
   */
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to fetch suppliers: ${error.message}`);

    return data as Supplier[];
  },

  /**
   * Create a new supplier.
   */
  async create(input: CreateSupplierInput): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create supplier: ${error.message}`);

    return data as Supplier;
  },

  /**
   * Update an existing supplier.
   */
  async update(
    supplier_id: string,
    input: Partial<CreateSupplierInput>
  ): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(input)
      .eq('supplier_id', supplier_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update supplier: ${error.message}`);

    return data as Supplier;
  },

  /**
   * Delete a supplier by ID.
   */
  async delete(supplier_id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('supplier_id', supplier_id);

    if (error) throw new Error(`Failed to delete supplier: ${error.message}`);
  },
};

// ─── Supplier Prices ─────────────────────────────────────────────────

export const SupplierPriceService = {
  /**
   * Record a price from a supplier for a product.
   */
  async create(input: CreateSupplierPriceInput): Promise<SupplierPrice> {
    const { data, error } = await supabase
      .from('supplier_prices')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to record supplier price: ${error.message}`);

    return data as SupplierPrice;
  },

  /**
   * Get all recorded prices for a product, with supplier name, cheapest first.
   */
  async getByProductId(product_id: string): Promise<SupplierPriceWithName[]> {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select('*, suppliers(name)')
      .eq('product_id', product_id)
      .order('price', { ascending: true });

    if (error) throw new Error(`Failed to fetch supplier prices: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      supplier_price_id: row.supplier_price_id,
      product_id: row.product_id,
      supplier_id: row.supplier_id,
      price: row.price,
      date_recorded: row.date_recorded,
      supplier_name: row.suppliers?.name ?? 'Unknown',
    }));
  },

  /**
   * Get the cheapest supplier price for a product.
   * Returns null if no supplier prices have been recorded.
   */
  async getCheapestForProduct(
    product_id: string
  ): Promise<SupplierPriceWithName | null> {
    const prices = await this.getByProductId(product_id);
    return prices.length > 0 ? prices[0] : null;
  },

  /**
   * Get all prices from a specific supplier, ordered by product.
   */
  async getBySupplierId(supplier_id: string): Promise<SupplierPrice[]> {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select('*')
      .eq('supplier_id', supplier_id)
      .order('date_recorded', { ascending: false });

    if (error) throw new Error(`Failed to fetch prices by supplier: ${error.message}`);

    return data as SupplierPrice[];
  },

  /**
   * Delete a supplier price record.
   */
  async delete(supplier_price_id: string): Promise<void> {
    const { error } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('supplier_price_id', supplier_price_id);

    if (error) throw new Error(`Failed to delete supplier price: ${error.message}`);
  },
};
