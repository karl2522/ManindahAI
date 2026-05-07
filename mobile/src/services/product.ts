import { supabase } from '../lib/supabase';

export type Product = {
  product_id: string;
  store_id: string;
  name: string;
  original_price: number;
  selling_price: number;
  quantity: number;
  category: string | null;
  image_url: string | null;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  barcode: string | null;
};

export type CreateProductInput = {
  store_id: string;
  name: string;
  original_price: number;
  selling_price: number;
  quantity: number;
  category?: string;
  image_url?: string;
  low_stock_threshold?: number;
  barcode?: string;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'store_id'>>;

/**
 * OCR contract — shape that the OCR feature produces and passes into this service.
 * The OCR screen calls `ProductService.createFromOCR()` after the owner confirms the scanned list.
 */
export type OCRProductEntry = {
  name: string;
  original_price?: number;
  selling_price?: number;
  quantity?: number;
  category?: string;
  image_url?: string;
  barcode?: string;
};

export const ProductService = {
  /**
   * Fetch all products for a given store, ordered by name.
   */
  async getByStoreId(store_id: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store_id)
      .order('name');

    if (error) throw new Error(`Failed to fetch products: ${error.message}`);

    return data as Product[];
  },

  /**
   * Create a single product manually.
   */
  async create(input: CreateProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Failed to create product: ${error.message}`);

    return data as Product;
  },

  /**
   * Bulk-create products from OCR output.
   * Called by the OCR feature after the owner confirms the scanned list.
   */
  async createFromOCR(store_id: string, entries: OCRProductEntry[]): Promise<Product[]> {
    const rows = entries.map((e) => ({
      store_id,
      name: e.name,
      original_price: e.original_price ?? 0,
      selling_price: e.selling_price ?? 0,
      quantity: e.quantity ?? 0,
      category: e.category ?? null,
      image_url: e.image_url ?? null,
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(rows)
      .select();

    if (error) throw new Error(`Failed to create products from OCR: ${error.message}`);

    return data as Product[];
  },

  /**
   * Update an existing product by its ID.
   */
  async update(product_id: string, input: UpdateProductInput): Promise<Product> {
    // 1. Fetch current product to detect price changes
    const { data: current, error: fetchError } = await supabase
      .from('products')
      .select('selling_price')
      .eq('product_id', product_id)
      .single();

    if (fetchError) throw new Error(`Failed to fetch product for update: ${fetchError.message}`);

    // 2. Perform the update
    const { data, error } = await supabase
      .from('products')
      .update(input)
      .eq('product_id', product_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update product: ${error.message}`);

    // 3. Log price change if detected
    const oldPrice = Number(current.selling_price);
    const newPrice = input.selling_price !== undefined ? Number(input.selling_price) : oldPrice;

    if (input.selling_price !== undefined && newPrice !== oldPrice) {
      const { error: logError } = await supabase.from('inventory_logs').insert({
        product_id,
        change_type: 'restock',
        quantity_changed: 0,
        old_price: oldPrice,
        new_price: newPrice,
        date: new Date().toISOString(),
      });

      if (logError) {
        console.error('[ProductService] Failed to log price change:', logError.message);
      }
    }

    return data as Product;
  },

  /**
   * Delete a product by its ID.
   */
  async delete(product_id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('product_id', product_id);

    if (error) throw new Error(`Failed to delete product: ${error.message}`);
  },

  /**
   * Search products by name (case-insensitive partial match).
   */
  async searchByName(store_id: string, query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store_id)
      .ilike('name', `%${query}%`)
      .order('name');

    if (error) throw new Error(`Failed to search products: ${error.message}`);

    return data as Product[];
  },

  /**
   * Get products filtered by category.
   */
  async getByCategory(store_id: string, category: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store_id)
      .eq('category', category)
      .order('name');

    if (error) throw new Error(`Failed to fetch products by category: ${error.message}`);

    return data as Product[];
  },

  /**
   * Get distinct categories for a store (useful for filter dropdowns).
   */
  async getCategories(store_id: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('store_id', store_id)
      .not('category', 'is', null);

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`);

    const unique = [...new Set((data ?? []).map((r: any) => r.category as string))];
    return unique.sort();
  },
};
