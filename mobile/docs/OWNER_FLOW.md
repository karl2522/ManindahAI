# Sari-Sari Store Owner Flow

This document describes the complete user journey for a sari-sari store owner using ManindahAI, from first-time setup through daily operations.

---

## 1. Onboarding (First-Time Use)

### 1.1 Sign Up / Log In
- Owner opens the app → lands on the **Login screen**
- Signs up or logs in via Firebase authentication
- On first login, a user profile is created in Supabase

### 1.2 Store Creation
- After logging in, the owner is prompted to **create a store**
- Inputs: store name (required)
- Optional later: address, location (lat/long), store image
- Once created, the owner is assigned the `owner` role

### 1.3 Offline-First
- The app is designed to work **offline-first** — owners can manage products and inventory without an internet connection
- Data syncs to Supabase when connectivity is available
- Core operations (viewing products, stock levels) should function without network access

---

## 2. Setting Up Products

The owner needs to populate their product catalog. There are two ways:

### 2.1 Manual Entry
1. Owner goes to the **Products tab**
2. Taps **"+ Add"**
3. Fills in: product name, cost price (original), selling price, quantity, category (optional)
4. Taps **Save**
5. Product appears in the list

### 2.2 OCR Scan (Receipt from Mall/Supplier)
1. Owner goes to the mall or supplier and buys products for the store
2. Owner takes a **photo of the receipt**
3. The app scans the receipt using OCR
4. The system **assumes the items on the receipt are for the store**
5. Parsed products are shown in an editable list (name, price, quantity)
6. Owner reviews, corrects any errors, and confirms
7. Products are **bulk-created** into the catalog via `ProductService.createFromOCR()`

> **Note:** The OCR scan is for the **purchase receipt** (what the owner bought from the supplier), not for customer sales.

### 2.3 Daily Sales OCR (Handwritten Records)
- Some owners keep handwritten notes of daily sales on paper
- At the end of the day (or later), the owner can **take a photo of their handwritten sales record**
- The app scans the text using OCR and parses it into sale entries
- A **verification step** is shown where the app reads back the results for the owner to confirm
- Once confirmed, the sales data is recorded and a **searchable history** is maintained
- This helps owners who are used to paper-based tracking transition to digital records

> **Note:** This is separate from the end-of-day manual sales input (Section 4). This OCR flow is for owners who prefer writing sales on paper first, then digitizing.

---

## 3. Daily Operations

### 3.1 Opening the Store
- Owner opens the app in the morning
- Can check **Inventory tab** to see current stock levels
- **Low stock banner** appears if any products are at or below 5 units
- Owner can browse products, check prices

### 3.2 During the Day
- Owner sells products to customers normally (physical transactions, not through the app)
- The app is **not used per-transaction** — the owner runs the store as usual
- Owner can optionally check stock or product info if needed

### 3.3 Restocking Mid-Day (If Needed)
- If the owner restocks during the day:
  1. Go to **Inventory tab**
  2. Tap the product
  3. Select **"Restock (+)"**
  4. Enter quantity received
  5. Confirm → stock is updated, change is logged

---

## 4. End-of-Day: Recording Sales

This is the core daily workflow. The owner records what was sold **after** the store closes.

### 4.1 Close Store / Record Sales
1. Owner taps **"Close Store"** or **"Record Sales"** button
2. App shows the **full product list** with current stock
3. For each product sold, the owner inputs the **quantity sold**
   - Products with 0 sold can be skipped
   - Selling price is pre-filled from the product's `selling_price` but can be edited (e.g., discounts)
4. Owner reviews the summary:
   - Total items sold
   - Total revenue (amount)
   - Total profit (revenue minus cost)
5. Owner taps **Confirm**

### 4.2 What Happens on Confirm
- A **sale record** is created with totals
- Individual **sale items** are recorded (product, quantity, price at sale)
- Stock is **deducted** for each sold product (via inventory logs with `change_type: 'sale'`)
- All of this happens in a single service call: `SalesService.create()`

### 4.3 Recording Losses
- If products were lost/damaged/expired during the day:
  1. Go to **Inventory tab**
  2. Tap the product
  3. Select **"Loss (−)"**
  4. Enter quantity lost
  5. Confirm → stock is deducted, logged as `loss`

---

## 5. Tracking Expenses

The owner can log business expenses beyond product costs.

### 5.1 Adding an Expense
1. Go to **Expenses screen**
2. Tap **"Add Expense"**
3. Input: name (e.g., "Electricity", "Rent", "Permit Fee"), amount, date
4. Save

### 5.2 Viewing Expenses
- List of all expenses, newest first
- Can filter by date range (daily, weekly, monthly)
- Shows total expenses for the selected period

---

## 6. Reviewing Sales & Profit

### 6.1 Sales History
- Owner can view a list of past sales
- Each sale shows: date, total amount, total profit
- Tapping a sale shows the individual items sold

### 6.2 Profit & Loss Summary
- **Income**: total sales amount for a period
- **Expenses**: total expenses for the same period
- **Profit**: total sales profit minus total expenses
- Helps the owner understand if they're actually making money

---

## 7. Supplier Management

### 7.1 Adding Suppliers
1. Owner goes to **Suppliers screen**
2. Adds a supplier: name, contact info
3. Can add multiple suppliers

### 7.2 Recording Supplier Prices
- For each product, the owner can record prices from different suppliers
- Example: "Supplier A sells Lucky Me noodles for ₱8, Supplier B sells for ₱7.50"

### 7.3 Price Comparison (When Restocking)
- When it's time to restock, the app shows the **cheapest supplier** for each product
- Helps the owner decide where to buy from to maximize profit margin

---

## 8. Inventory Management

### 8.1 Viewing Stock
- **Inventory tab** shows all products sorted by stock level (lowest first)
- Color-coded: red badge for low stock (≤ 5), green for healthy stock
- Low stock banner at the top lists items running low

### 8.2 Stock Adjustments
The owner can manually adjust stock for three reasons:

| Type | When to Use | Effect |
|---|---|---|
| **Restock (+)** | Received new stock from supplier | Adds to quantity |
| **Adjust (+)** | Correcting a count error (found extra) | Adds to quantity |
| **Loss (−)** | Damaged, expired, or missing items | Subtracts from quantity |

> **Sales deductions** happen automatically through the end-of-day flow (Section 4), not through the Inventory tab.

### 8.3 Viewing Stock History
- For each product, the owner can view a timeline of all stock changes
- Shows: date, type (restock/sale/adjustment/loss), quantity changed
- Helps track where stock went

---

## 9. Product Search & Filtering

### 9.1 Search
- Search bar at the top of Products/Inventory tabs
- Type a product name → filtered results (case-insensitive, partial match)

### 9.2 Category Filter
- Horizontal scroll of category chips (e.g., "Snacks", "Beverages", "Canned Goods")
- Tap a category → shows only products in that category
- Tap again or "All" → clears filter

---

## 10. AI Suggestions (Future Feature)

> **Status:** Planned — requires sales data to be accumulated first.

- At the end of the day, week, or month, the AI scans records of popular products
- Suggests actions to increase sales, such as:
  - "Lucky Me noodles sold 40% more this week — consider stocking more"
  - "Canned sardines haven't sold in 2 weeks — consider reducing stock or running a promo"
  - "Your most profitable category is Beverages"
- Requires the owner to have recorded sales data (Section 4) consistently
- Requires internet connectivity to process suggestions

---

## 11. Sales & Profit Analytics Dashboard (Future Feature)

> **Status:** Planned — backend data (sales, expenses) is being collected; frontend visualization needed.

- Visual charts and key metrics based on recorded sales data:
  - **Top-selling products** (bar chart or ranked list)
  - **Daily/weekly/monthly profit trends** (line chart)
  - **Most profitable categories** (pie chart or breakdown)
  - **Revenue vs. Expenses** comparison
- Enables data-driven business decisions
- Builds on data from Sales (Section 4) and Expenses (Section 5)

---

## Daily Routine Summary

```
Morning:
  └─ Open app → check Inventory tab → note low stock items

During the day:
  └─ Sell products normally (no app interaction needed)
  └─ Optionally restock if supplier delivers

End of day:
  └─ Tap "Close Store" / "Record Sales"
  └─ Input what was sold → Confirm
  └─ Log any losses (damaged/expired items)
  └─ Optionally log expenses (electricity bill, etc.)

Weekly/Monthly:
  └─ Review sales history & profit trends
  └─ Compare supplier prices before restocking trip
  └─ Check which products are most/least profitable
  └─ (Future) Review AI suggestions
  └─ (Future) Check analytics dashboard
```

---

## Flow Diagram

```
[Login] → [Create Store] → [Add Products (Manual / OCR)]
                                     ↓
                            ┌────────────────────┐
                            │   DAILY LOOP       │
                            ├────────────────────┤
                            │ Morning:           │
                            │  Check inventory   │
                            │  Note low stock    │
                            │                    │
                            │ During day:        │
                            │  Sell normally     │
                            │  Restock if needed │
                            │                    │
                            │ End of day:        │
                            │  Record sales      │
                            │  → auto-deduct     │
                            │  Log losses        │
                            │  Log expenses      │
                            └────────┬───────────┘
                                     ↓
                            ┌────────────────────┐
                            │ REVIEW (anytime)   │
                            ├────────────────────┤
                            │ Sales history      │
                            │ P&L summary        │
                            │ Supplier compare   │
                            │ Stock history      │
                            │ AI suggestions *   │
                            │ Analytics dash *   │
                            │ (* = future)       │
                            └────────────────────┘
```
