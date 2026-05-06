import { supabase } from '../lib/supabase';
import { Product } from './product';

export type GlobalProduct = {
  barcode: string;
  name: string;
  category?: string;
  image_url?: string;
};

export type BarcodeScanResult = {
  source: 'local' | 'global' | 'openfoodfacts' | 'not_found';
  product?: Product | GlobalProduct;
};

export const BarcodeService = {
  /**
   * Multi-tiered barcode resolution strategy:
   * Tier 1: Local Cache (Supabase products table for the store)
   * Tier 2: Global Crowdsourced Cloud Database (ManindahAI's global records)
   * Tier 3: Unlimited Open-Source Ecosystem (Open Food Facts)
   */
  async resolveBarcode(barcode: string, storeId: string): Promise<BarcodeScanResult> {
    try {
      // Tier 1: Local / Store Inventory
      // (Assuming a 'barcode' column will be added to the products table)
      const { data: localData, error: localError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('barcode', barcode)
        .maybeSingle();

      if (!localError && localData) {
        return { source: 'local', product: localData as Product };
      }

      // Tier 2: Global Crowdsourced Database
      // (Assuming a 'global_products' table)
      const { data: globalData, error: globalError } = await supabase
        .from('global_products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (!globalError && globalData) {
        return { source: 'global', product: globalData as GlobalProduct };
      }

      // Tier 3: Unlimited Open-Source Ecosystem (Open Food Facts)
      console.log(`Querying Open Food Facts for barcode: ${barcode}`);
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      
      if (offResponse.ok) {
        const offData = await offResponse.json();
        if (offData.status === 1 && offData.product) {
          const product = offData.product;
          console.log(`Found product in Open Food Facts: ${product.product_name}`);
          return {
            source: 'openfoodfacts',
            product: {
              barcode: barcode,
              name: product.product_name || product.product_name_en || 'Unknown Product',
              category: product.categories_tags ? product.categories_tags[0] : undefined,
              image_url: product.image_url,
            } as GlobalProduct
          };
        }
      }

      console.log(`Product not found in any tier for barcode: ${barcode}`);
      // Tier 4: Not Found -> Prompt for manual entry
      return { source: 'not_found' };

    } catch (error) {
      console.error('Barcode resolution error:', error);
      // Failsafe: Return not found to trigger manual entry
      return { source: 'not_found' };
    }
  },
};
