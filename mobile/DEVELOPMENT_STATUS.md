# ManindahAI Mobile App Development Status & Roadmap

This document provides a summary of the current implementation status of the ManindahAI mobile application based on the project requirements and existing codebase.

## 1. Sari-Sari Store Owner Features

- ✅ **Store Creation & Setup**: Onboarding flow for merchant registration and store profile setup (name, category, address).
- ✅ **Product Management**: CRUD operations for products, category tagging, and pricing (cost vs. selling).
- ✅ **Inventory Management**: Real-time stock tracking, low-stock visual indicators, and stock adjustment logs (restock, loss, adjustment).
- ✅ **Price History Tracking**: Internal price-history view logging historical price edits. Includes UI to view price changes to track margins and adjustments over time.
- ✅ **Financial Tracking**: Financial Hub handles sales logging (single/bulk) and expense tracking (rent, utilities). Profit/Loss calculation is functional.
- ✅ **OCR Integration**: Triple-tier extraction engine (Google Vision, Gemini, and Local OCR) for high-fidelity receipt parsing. Automated parsing of handwritten sales and product labels is fully functional.
- ✅ **AI Suggestions (Dynamic)**: The `insights.tsx` screen generates personalized business advice by analyzing real-time sales and inventory data via Gemini Flash. Includes weekly trend analysis and urgent stock alerts.
- ✅ **Offline-First Data**: Infrastructure for offline mutations and local state management is present.

## 2. Customer Features

- ✅ **Store Locator**: Customers can search for nearby stores and view store profiles and product availability.
- ✅ **Community Remarks**: Full rating and review submission system integrated. Customers can share feedback, and owners can view community sentiment.
- ✅ **Become a Seller**: Logic exists for verified customers to transition into a Sari-Sari Store owner role.
- ✅ **Saved Stores**: Feature to save/favorite stores for quick access.

## 3. Core Infrastructure

- **Authentication**: Fully integrated with Firebase/Google Authentication for Login/Register/Onboarding.
- **Data Layer**: Supabase integrated as the primary data store with offline-ready hooks.
- **Architecture**: Clean separation of services (OCR, Inventory, Sales, AI Insights) and UI components.

## 4. Pending Tasks & Roadmap

### High Priority (Functional Gaps)

1. **Push Notifications**: Activate the notification system for low-stock alerts and new community reviews to keep owners engaged.
2. **Dashboard Analytics (V2)**: Expand the Financial Hub with more granular visual data (interactive charts for categorical expense breakdown).
3. **Multi-Store Management**: Plan support for owners with multiple physical locations under one account.

### Medium Priority (Enhancements)

1. **Supplier Comparison**: Integrate real-time or crowd-sourced supplier price comparisons to help owners optimize margins.
2. **Enhanced Search**: Implement fuzzy search and voice search for products within the inventory.

### Future Phase

1. **Customer Chatbot**: Implement the AI-powered assistant to help customers find products and stores through natural language.
2. **Moderator Web App**: (Out of mobile scope) Development of the administrative dashboard for content moderation.

---

_Last updated: May 7, 2026_
