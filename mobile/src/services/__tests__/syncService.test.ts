import { flushOutbox } from '../syncService';
import { getOutbox, addToOutbox, clearOutbox } from '../../lib/outbox';
import { ProductService } from '../product';
import { queryClient } from '../../lib/queryClient';

jest.mock('../product');
jest.mock('../inventory');
jest.mock('../sales');
jest.mock('../expense');

describe('SyncService', () => {
  beforeEach(async () => {
    await clearOutbox();
    jest.clearAllMocks();
  });

  it('should process successful creation correctly', async () => {
    const payload = { name: 'Test Product', selling_price: 100, original_price: 80, store_id: 's1' };
    await addToOutbox({
      op: 'product_create',
      store_id: 's1',
      payload: payload as any
    });

    (ProductService.create as jest.Mock).mockResolvedValue({ id: 'p1' });

    const result = await flushOutbox();

    expect(result.synced).toBe(1);
    expect(ProductService.create).toHaveBeenCalledWith(payload);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['products', 's1'] });
    
    const remaining = await getOutbox();
    expect(remaining.length).toBe(0);
  });

  it('should increment retry count on failure', async () => {
    await addToOutbox({
      op: 'product_delete',
      store_id: 's1',
      product_id: 'p1'
    });

    (ProductService.delete as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const result = await flushOutbox();

    expect(result.synced).toBe(0);
    expect(result.pending).toBe(1);
    
    const items = await getOutbox();
    expect(items[0].retry_count).toBe(1);
    expect(items[0].last_error).toBe('Network Error');
  });

  it('should skip items that reached MAX_RETRIES', async () => {
    await addToOutbox({
      op: 'product_delete',
      store_id: 's1',
      product_id: 'p1'
    });
    
    // Manually set retry count to max
    const items = await getOutbox();
    items[0].retry_count = 5; 
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('MANINDAH_OUTBOX', JSON.stringify(items));

    const result = await flushOutbox();

    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
    expect(ProductService.delete).not.toHaveBeenCalled();
  });
});
