# ManindahAI

## Problem Statement
Sari-sari store owners often struggle with manual, handwritten calculations of their daily and monthly revenue. This process is prone to human error, even with multiple manual checks, leading to inaccurate financial records and potential debt. Furthermore, poor inventory tracking results in stockouts of essential goods, such as canned products, driving customers to find cheaper or more reliable alternatives in nearby locations.

## Introduction: ManindahAI
ManindahAI addresses the financial literacy of Filipino sari-sari store owners by developing an **offline-first mobile application**. The app allows owners to manage products, calculate profits, and track inventory even without an active internet connection. Customers can locate nearby stores and view product availability.

## Project Scope
The project aims to empower sari-sari store owners with digital tools for financial management and inventory tracking, while providing customers with a seamless way to find products in their local community.

## Features

### Sari-Sari Store Owner Side
- **Offline-First Management**: Work with product lists and inventory without needing internet access.
- **Product Management**: Create and manage product lists with pricing and quantity.
- **Inventory Management**: Track stock levels and receive low-stock alerts.
- **Financial Tracking**: Log sales, expenses (rent, utilities, etc.), and view profit/loss summaries.
- **AI Suggestions**: Receive actionable insights based on sales patterns (requires sync).
- **OCR Integration**: Scan handwritten records to automate sales entry.
- **Supplier Comparison**: Compare prices from different suppliers to maximize profit.

### Customer Side
- **Store Locator**: Search for products and find nearby sari-sari stores.
- **Community Remarks**: Provide feedback, ratings, and reviews for stores.

### Moderator Side
- **Account & Store Management**: Manage user accounts and store listings.
- **Content Moderation**: Review and moderate community remarks.

---

## Technical Stack
- **Framework**: [React Native](https://reactnative.dev)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com) (with Offline Sync)
- **Package Manager**: [pnpm](https://pnpm.io)

---

## Getting Started

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Start Metro Bundler
```bash
pnpm start
```

### Step 3: Run on Android or iOS
In a new terminal:
```bash
# For Android
pnpm android

# For iOS
pnpm ios
```

## Learn More
Check out the `AGENTS.md` file for project guidelines and coding standards.
