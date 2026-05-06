# Frontend Implementation Guide

This document lists the **backend services that are ready** and describes the **screens/UI your frontend needs to build**. All services live in `src/services/` and follow the same pattern — import, call, handle errors.

---

## Service Overview

| Service File | What It Does |
|---|---|
| `product.ts` | Product CRUD, OCR bulk-create, search by name, filter by category |
| `inventory.ts` | Stock adjustments (restock/sale/loss/adjustment), log history, low-stock query |
| `sales.ts` | Record sales (end-of-day), auto-deduct stock, sale history, date-range queries |
| `expense.ts` | Expense CRUD (rent, utilities, etc.), date-range queries, total calculation |
| `supplier.ts` | Supplier CRUD, record supplier prices per product, cheapest supplier lookup |
| `store.ts` | Store creation, fetch by user |
| `auth.ts` | Authentication |
| `user.ts` | User profile management |

---

## Screens To Build

### 1. Sales Screen (End-of-Day Flow)

**Location:** `app/(tabs)/sales.tsx` or `app/sales/`

**User Flow:**
1. Owner taps "Close Store" / "Record Sales" button
2. App shows a list of all products (use `ProductService.getByStoreId()`)
3. Owner inputs quantity sold for each product (skip products with 0 sold)
4. Owner reviews the summary (total amount, total profit)
5. Owner confirms → call `SalesService.create({ store_id, items })`
6. Stock is **automatically deducted** by the service (no need to call InventoryService separately)

**Service Calls:**
```ts
import { SalesService, SaleItemInput } from '../../src/services/sales';
import { ProductService, Product } from '../../src/services/product';

// Step 1: Fetch products to show in the form
const products = await ProductService.getByStoreId(store.store_id);

// Step 2: Build items array from what the owner inputs
const items: SaleItemInput[] = [
  {
    product_id: 'abc-123',
    quantity: 5,
    price_at_sale: 25.00, // use product.selling_price as default
  },
  // ... more items
];

// Step 3: Submit — this creates the sale, inserts items, AND deducts stock
const sale = await SalesService.create({
  store_id: store.store_id,
  items,
});
```

**Important Notes:**
- `price_at_sale` should default to the product's `selling_price` but be editable (owner might give a discount)
- The service computes `total_amount` and `total_profit` automatically
- Stock deduction happens inside `SalesService.create()` — don't call `InventoryService.adjustStock()` separately for sales

---

### 2. Sales History Screen

**Location:** `app/sales/history.tsx` or part of sales tab

**User Flow:**
1. Owner sees a list of past sales (date, total amount, total profit)
2. Owner taps a sale to see item-level details

**Service Calls:**
```ts
// Get all sales
const sales = await SalesService.getByStoreId(store.store_id);

// Get sales for a specific date range (e.g., today, this week, this month)
const todaySales = await SalesService.getByDateRange(
  store.store_id,
  '2026-05-04T00:00:00',
  '2026-05-04T23:59:59'
);

// Get items for a specific sale (with product names)
const items = await SalesService.getSaleItems(sale.sale_id);
// Each item has: product_name, quantity, price_at_sale
```

---

### 3. Expense Tracker Screen

**Location:** `app/(tabs)/expenses.tsx` or `app/expenses/`

**User Flow:**
1. Owner sees list of expenses (newest first)
2. Owner can add expense (name, amount, date)
3. Owner can edit/delete expenses
4. Show total expenses for a period

**Service Calls:**
```ts
import { ExpenseService, CreateExpenseInput } from '../../src/services/expense';

// Fetch all expenses
const expenses = await ExpenseService.getByStoreId(store.store_id);

// Create an expense
const expense = await ExpenseService.create({
  store_id: store.store_id,
  name: 'Electricity',
  amount: 500.00,
  date: '2026-05-04', // optional, defaults to now
});

// Update
await ExpenseService.update(expense.expense_id, { amount: 550.00 });

// Delete
await ExpenseService.delete(expense.expense_id);

// Get total for a date range (for P&L summary)
const monthlyTotal = await ExpenseService.getTotalByDateRange(
  store.store_id,
  '2026-05-01',
  '2026-05-31'
);
```

---

### 4. Inventory Log History (per product)

**Location:** Modal or sub-screen within the Inventory tab

**User Flow:**
1. Owner taps a product in the Inventory tab
2. In addition to the adjust-stock modal, show a "View History" option
3. Shows a timeline of all stock changes (restock, sale, loss, adjustment) with dates

**Service Calls:**
```ts
import { InventoryService } from '../../src/services/inventory';

// Get log history for a product
const logs = await InventoryService.getLogs(product.product_id);
// Each log: { log_id, product_id, change_type, quantity_changed, date }
// change_type is: 'restock' | 'sale' | 'adjustment' | 'loss'
// quantity_changed is positive for additions, negative for removals
```

---

### 5. Supplier Management Screen

**Location:** `app/suppliers/` or within a settings area

**User Flow:**
1. Owner adds suppliers (name, contact info)
2. Owner records prices from different suppliers for each product
3. When restocking, the app suggests the cheapest supplier

**Service Calls:**
```ts
import { SupplierService, SupplierPriceService } from '../../src/services/supplier';

// --- Supplier CRUD ---
const suppliers = await SupplierService.getAll();

const supplier = await SupplierService.create({
  name: 'Supplier A',
  contact_info: '09171234567',
});

await SupplierService.update(supplier.supplier_id, { name: 'New Name' });
await SupplierService.delete(supplier.supplier_id);

// --- Supplier Prices ---

// Record a price: "Supplier A sells Product X for ₱15"
await SupplierPriceService.create({
  product_id: 'product-abc',
  supplier_id: supplier.supplier_id,
  price: 15.00,
});

// Get all prices for a product (sorted cheapest first, includes supplier name)
const prices = await SupplierPriceService.getByProductId('product-abc');
// Each: { supplier_price_id, product_id, supplier_id, price, date_recorded, supplier_name }

// Get the cheapest option for a product
const cheapest = await SupplierPriceService.getCheapestForProduct('product-abc');
// Returns: { supplier_name: 'Supplier A', price: 15.00, ... } or null

// Get all prices from a specific supplier
const supplierPrices = await SupplierPriceService.getBySupplierId(supplier.supplier_id);
```

---

### 6. Product Search & Filter (Enhancement to existing tabs)

**Location:** Add to existing Products tab and Inventory tab

**Service Calls:**
```ts
import { ProductService } from '../../src/services/product';

// Search by name (case-insensitive partial match)
const results = await ProductService.searchByName(store.store_id, 'chips');

// Get distinct categories for a filter dropdown
const categories = await ProductService.getCategories(store.store_id);
// Returns: ['Beverages', 'Canned Goods', 'Snacks']

// Filter by category
const snacks = await ProductService.getByCategory(store.store_id, 'Snacks');
```

**UI Suggestion:** Add a `TextInput` search bar at the top of both Products and Inventory tabs. Add a horizontal scroll of category filter chips below it.

---

## Shared Patterns

### Fetching on Tab Focus

Both existing tabs now use `useFocusEffect` to refetch data when the tab becomes active. **All new tabs should follow the same pattern:**

```ts
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchData();
  }, [fetchData])
);
```

### Getting the Store

All screens need the current store. Use the existing hook:

```ts
import { useStore } from '../../src/hooks/useStore';

const { store, loading, error } = useStore();
// store.store_id is what you pass to all service calls
```

### Error Handling

All service methods throw on failure. Always wrap in try/catch:

```ts
try {
  const result = await SomeService.method(...);
} catch (e: any) {
  Alert.alert('Error', e.message);
}
```

---

## Priority Order

| Priority | Screen | Reason |
|---|---|---|
| **1 (High)** | Sales (End-of-Day) | Core feature — connects products, inventory, and financials |
| **2 (High)** | Sales History | Owners need to review past sales |
| **3 (Medium)** | Expense Tracker | Needed for P&L summary |
| **4 (Medium)** | Inventory Log History | Data already being saved, just needs display |
| **5 (Medium)** | Product Search & Filter | UX improvement for stores with many products |
| **6 (Low)** | Supplier Management | Nice-to-have, not critical for MVP |
| **7 (Future)** | Sales & Profit Analytics Dashboard | Visual charts (top products, profit trends, category breakdown) — needs sales data first |
| **8 (Future)** | AI Suggestions | Actionable insights from sales patterns — needs accumulated data + AI integration |

---

## Future Screens (No Backend Yet)

### Analytics Dashboard

- Visual charts: top-selling products, daily/weekly/monthly profit trends, most profitable categories, revenue vs. expenses
- Data sources: `SalesService.getByDateRange()` + `ExpenseService.getByDateRange()` + `SalesService.getSaleItems()`
- Will need a charting library (e.g., `react-native-chart-kit` or `victory-native`)
- Backend data is already being collected — this is purely a frontend visualization task

### AI Suggestions

- At the end of day/week/month, AI scans sales records and suggests actions
- Examples: "Stock more of X", "Y hasn't sold in 2 weeks", "Most profitable category is Z"
- Will require an AI/LLM integration (e.g., OpenAI API or similar)
- Backend service (`src/services/ai.ts`) still needs to be created
- Requires internet connectivity

### Daily Sales OCR (Handwritten Records)

- Separate from the manual end-of-day flow — this is for owners who write sales on paper
- Owner photographs handwritten sales notes → OCR → parsed sale entries → verification → record
- Needs: camera/image picker, OCR engine, text parser for handwritten Filipino sales notes
- Backend: will use `SalesService.create()` after parsing

---

## Database Tables (Reference)

These Supabase tables already exist per the ERD:

- `products` — product catalog + current stock level
- `inventory_logs` — stock change audit trail
- `sales` — sale headers (date, totals)
- `sale_items` — individual items within a sale
- `expenses` — non-product business expenses
- `suppliers` — supplier directory
- `supplier_prices` — prices from suppliers per product
