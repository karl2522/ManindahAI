/**
 * Standalone Offline-First Logic Verification Script
 * Run this to verify the Outbox and SyncService logic without react-native environment.
 */

// --- Mocks ---
const mockStore: Record<string, string> = {};
const AsyncStorage = {
  getItem: async (key: string) => mockStore[key] || null,
  setItem: async (key: string, val: string) => { mockStore[key] = val; },
  removeItem: async (key: string) => { delete mockStore[key]; }
};

// Mock Services
const ProductService = {
  create: async (p: any) => {
    if (p.name === 'FAIL') throw new Error('Network Error');
    return { id: 'real-id-123' };
  }
};

// --- Core Logic (Simplified for verification) ---
const OUTBOX_KEY = 'MANINDAH_OUTBOX';

async function getOutbox() {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function addToOutbox(item: any) {
  const current = await getOutbox();
  const newItem = { ...item, id: Math.random().toString(), created_at: new Date().toISOString(), retry_count: 0 };
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...current, newItem]));
}

async function flushOutbox() {
  const items = await getOutbox();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.op === 'product_create') {
        await ProductService.create(item.payload);
      }
      // Remove from outbox
      const current = await getOutbox();
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(current.filter((i: any) => i.id !== item.id)));
      synced++;
    } catch (e) {
      failed++;
    }
  }
  return { synced, failed };
}

// --- Test Suite ---
async function runTests() {
  console.log('🚀 Running Offline-First Logic Verification...');

  // Test 1: Persistence
  await addToOutbox({ op: 'product_create', payload: { name: 'Success Product' } });
  let items = await getOutbox();
  if (items.length !== 1) throw new Error('Persistence Test Failed');
  console.log('✅ Persistence: PASS');

  // Test 2: Sync Success
  let result = await flushOutbox();
  if (result.synced !== 1) throw new Error('Sync Success Test Failed');
  items = await getOutbox();
  if (items.length !== 0) throw new Error('Outbox Cleanup Failed');
  console.log('✅ Sync Replay: PASS');

  // Test 3: Sync Failure Handling
  await addToOutbox({ op: 'product_create', payload: { name: 'FAIL' } });
  result = await flushOutbox();
  if (result.failed !== 1) throw new Error('Sync Failure Test Failed');
  items = await getOutbox();
  if (items.length !== 1) throw new Error('Outbox Retention Failed');
  console.log('✅ Error Handling: PASS');

  console.log('\n✨ ALL CORE LOGIC TESTS PASSED!');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:');
  console.error(err);
  process.exit(1);
});
