# <img src="../prompteng/design/logo/ManindahAI-logo-nobg.png" width="100" /> ManindahAI

**Empowering local Sari-Sari stores with AI-driven Digital Transformation.**

ManindahAI is a mobile-first platform designed specifically for **Filipino Sari-Sari store owners**. We combine a simple user experience with powerful backend automation to help local micro-merchants digitize their inventory, track finances, and grow their community presence.

---

## 🎯 The Vision

For most **Filipino Sari-Sari store owners**, operations still rely on manual ledgers and guesswork. **ManindahAI** provides a digital backbone—giving these local merchants access to high-end retail tools like real-time inventory tracking and automated data entry through their smartphones. We aim to move the store owner from 'analog exhaustion' to 'digital clarity,' helping them keep their community prices competitive and their family finances stable.

---

## 🚀 Key Features

- **Smart Inventory & Supply**: Real-time stock tracking with "Low Stock" alerts.
- **Customer Visibility**: Digital tracking of sales and customer credit (_Utang_) to stop the silent leak of family profit.
- **Gemini-Powered OCR**: Instant, high-accuracy data entry from supply receipts—designed to work even with messy print or poor internet.
- **AI-Powered OCR Scanning**: Uses the device camera to instantly parse product barcodes and supply receipts, eliminating manual data entry.
- **Financial Insights Hub**: Automated sales logging and profit/loss visualization for better financial decision-making.
- **Geospatial Store Locator**: Pins store locations on a community map, increasing visibility for local customers.
- **Trust & Community Reviews**: A built-in feedback system that bridges the gap between store owners and their regular customers.

---

## 🛠️ Technical Architecture (For Developers)

ManindahAI is built for performance, scalability, and resilience in variable network conditions.

- **Frontend**: React Native (Expo) - Shared codebase for iOS & Android with a focus on smooth UI/UX.
- **Backend-as-a-Service**: Supabase (PostgreSQL) - Handles real-time data synchronization, secure storage, and authentication.
- **Authentication**: Hybrid implementation using Firebase and Supabase for robust user management.
- **State Management**: Optimized with TanStack Query (React Query) for efficient caching and "Offline-First" capabilities.
- **OCR Pipeline**: Custom integration for automated image recognition and data extraction.

---

## 🏗️ Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Press w for the Web


# Press a for the Android


```

---

## 🏁 Strategic Edge

1.  **Low Barrier to Entry**: Designed for non-technical users while maintaining high-end security.
2.  **Scalable Data Model**: Architecture is ready to support thousands of concurrent micro-merchants.
3.  **Social Impact**: Directly addresses the digital divide in the Filipino micro-retail sector.
