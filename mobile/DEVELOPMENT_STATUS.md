# ManindahAI Mobile App Development Status & Roadmap

This document provides a summary of the current implementation status of the ManindahAI mobile application based on the project requirements and existing codebase.

## 🛠 Tech Stack (Senior Developer Audit)

- **Frontend**: React Native 0.83.6 / Expo 55 (TypeScript)
- **Navigation**: Expo Router 55
- **State Management**: TanStack Query (React Query) v5 with Offline Persistence
- **Backend/DB**: Supabase (PostgreSQL) + Firebase (Google Auth)
- **AI/ML**: 
  - **Insights**: Google Gemini Flash 1.5 (via `AIInsightService`)
  - **OCR**: Google ML Kit (Local) + Google Vision API + Gemini Flash
- **Styling**: Theme-based Vanilla React Native StyleSheet
- **Charts**: `react-native-chart-kit` (available in package.json)

## 1. Sari-Sari Store Owner Features

- ✅ **Store Creation & Setup**: Onboarding flow for merchant registration and store profile setup.
- ✅ **Product Management**: CRUD operations for products, category tagging, and pricing (cost vs. selling).
- ✅ **Inventory Management**: Real-time stock tracking, low-stock visual indicators, and stock adjustment logs.
- ✅ **Price History Tracking**: Internal price-history view logging historical price edits.
- ✅ **Financial Tracking**: Financial Hub handles sales logging (single/bulk) and expense tracking. Profit/Loss calculation is functional.
- ✅ **OCR Integration**: Triple-tier extraction engine (Google Vision, Gemini, and Local OCR) for receipt parsing.
- ✅ **AI Suggestions (Dynamic)**: `insights.tsx` generates business advice via Gemini Flash.
- ✅ **Offline-First Data**: Infrastructure for offline mutations and local state management via TanStack Query and custom outbox logic.
- 🟡 **Supplier Comparison**: `SupplierService` and `SupplierPriceService` are fully implemented (CRUD + logic). **UI integration is pending.**

## 2. Customer Features

- ✅ **Store Locator**: Customers can search for nearby stores and view store profiles.
- ✅ **Community Remarks**: Full rating and review submission system integrated.
- ✅ **Become a Seller**: Logic for verified customers to transition into owner role.
- ✅ **Saved Stores**: Feature to favorite stores.

## 3. Core Infrastructure

- **Authentication**: Firebase/Google Authentication integration.
- **Data Layer**: Supabase with offline-ready hooks (`useOfflineMutation`).
- **Architecture**: Service-oriented architecture with clean separation of concerns.

## 4. Pending Tasks & Roadmap

### High Priority (Functional Gaps)

1. **Push Notifications**: Activate the notification system for low-stock alerts and new reviews. (Infrastructure missing in `package.json`).
2. **Dashboard Analytics (V2)**: Expand Financial Hub with interactive charts (categorical expense breakdown).
3. **Multi-Store Management**: Support for owners with multiple physical locations.

### Medium Priority (Enhancements)

1. **Supplier UI**: Implement the frontend screens for the existing `SupplierService`.
2. **Enhanced Search**: Implement fuzzy search and voice search for products.

### Future Phase

1. **Customer Chatbot**: AI-powered assistant for customers.
2. **Moderator Web App**: Administrative dashboard for content moderation.

---

_Last updated: May 7, 2026_
