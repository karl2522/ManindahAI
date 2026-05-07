# ManindahAI Mobile App Development Status & Roadmap

This document provides a summary of the current implementation status of the ManindahAI mobile application based on the project requirements and existing codebase.

## 1. Sari-Sari Store Owner Features

- ✅ **Store Creation & Setup**: Onboarding flow for merchant registration and store profile setup (name, category, address).
- ✅ **Product Management**: CRUD operations for products, category tagging, and pricing (cost vs. selling).
- ✅ **Inventory Management**: Real-time stock tracking, low-stock visual indicators, and stock adjustment logs (restock, loss, adjustment).
- ✅ **Price History Tracking**: Internal price-history view logging historical price edits. Includes UI to view price changes to track margins and adjustments over time.
- ✅ **Financial Tracking**: Financial Hub handles sales logging (single/bulk) and expense tracking (rent, utilities). Profit/Loss calculation is functional.
- 🚧 **OCR Integration (Partial)**: UI for scanning receipts exists (`scan.tsx`), and services for OCR (Google Vision, Gemini) are integrated. Automated parsing of handwritten sales is in progress.
- ⚠️ **AI Suggestions (UI Only)**: The `insights.tsx` screen displays static/mocked "Smart Suggestions". Backend logic to generate these from actual sales data via AI is pending.
- ✅ **Offline-First Data**: Infrastructure for offline mutations and local state management is present.

## 2. Customer Features

- ✅ **Store Locator**: Customers can search for nearby stores and view store profiles and product availability.
- 🚧 **Community Remarks (Partial)**: UI for viewing reviews exists, but the full "Community Remarks" (rating/review submission) requires further integration with the backend.
- ✅ **Become a Seller**: Logic exists for verified customers to transition into a Sari-Sari Store owner role.
- ✅ **Saved Stores**: Feature to save/favorite stores for quick access.

## 3. Core Infrastructure

- **Authentication**: Fully integrated with Firebase for Login/Register/Onboarding.
- **Data Layer**: Supabase integrated as the primary data store with offline-ready hooks.
- **Architecture**: Clean separation of services (OCR, Inventory, Sales, Price History) and UI components.

## 4. Pending Tasks & Roadmap

### High Priority (Functional Gaps)

1. **Dynamic AI Insights**: Implement the logic in `insights.tsx` to pull real sales data and send it to the AI service (Gemini) to generate actual stock alerts and sales opportunities.
2. **Community Feedback Loop**: Complete the review submission flow for customers to allow them to rate and comment on stores.
3. **Advanced OCR Parsing**: Finalize the "handwritten daily sales" OCR feature to ensure high accuracy for diverse handwriting styles.

### Medium Priority (Enhancements)

1. **Notifications**: Activate the notification system for low-stock alerts and new community reviews.
2. **Dashboard Analytics**: Expand the Financial Hub with more visual data (charts for expenses vs. sales over longer periods).
3. **Supplier Comparison**: Plan integration of real supplier comparisons since mock logic was replaced by internal price history.

### Future Phase

1. **Customer Chatbot**: Implement the AI-powered assistant to help customers find products and stores through natural language.
2. **Moderator Web App**: (Out of mobile scope) Development of the administrative dashboard for content moderation.

---

_Last updated: May 7, 2026_
