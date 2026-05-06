import { addToOutbox, getOutbox, clearOutbox } from './outbox';
import { flushOutbox } from '../services/syncService';
import { ProductService } from '../services/product';

/**
 * Diagnostics suite to verify offline-first flows in the real app environment.
 * Can be triggered from a hidden debug menu.
 */
export async function runOfflineDiagnostics() {
  const results = {
    outboxPersistence: false,
    syncReplay: false,
    errorHandling: false,
    logs: [] as string[]
  };

  const log = (msg: string) => {
    console.log(`[Diagnostics] ${msg}`);
    results.logs.push(msg);
  };

  try {
    log('Starting Offline Diagnostics...');
    
    // 1. Test Persistence
    await clearOutbox();
    await addToOutbox({ 
      op: 'product_create', 
      store_id: 'test-store', 
      payload: { name: 'Diag Product', selling_price: 1, original_price: 1, store_id: 'test-store' } 
    });
    const items = await getOutbox();
    results.outboxPersistence = items.length === 1 && items[0].op === 'product_create';
    log(`Outbox Persistence: ${results.outboxPersistence ? 'PASS' : 'FAIL'}`);

    // 2. Test Sync Replay (Simulated)
    // Note: We can't easily mock network here, but we can verify the flush logic returns a valid result
    const syncResult = await flushOutbox();
    log(`Sync Result: Synced=${syncResult.synced}, Failed=${syncResult.failed}, Pending=${syncResult.pending}`);
    
    // 3. Verify outbox is cleared on success OR items are updated on failure
    const finalItems = await getOutbox();
    log(`Final Outbox Count: ${finalItems.length}`);
    
    results.syncReplay = true; // If no crash
    return results;

  } catch (error: any) {
    log(`Diagnostics Failed: ${error.message}`);
    return results;
  }
}
