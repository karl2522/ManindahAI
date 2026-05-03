# ManindahAI Mobile - Project Structure

This document outlines the recommended directory structure tailored specifically for a **React Native Expo** application backed by **Supabase** with an **Offline-First** requirement. It uses modern Expo patterns like **Expo Router** for file-based navigation.

## Directory Tree

```text
ManindahAI/mobile/
├── app/                    # Expo Router file-based routing (Replaces traditional navigation)
│   ├── (auth)/             # Authentication flow (Login, Register)
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/             # Main app tabs (Dashboard, Inventory, POS)
│   │   ├── index.tsx       # Default tab screen
│   │   └── _layout.tsx     # Tab bar configuration
│   ├── _layout.tsx         # Root layout (Auth providers, global wrappers)
│   └── +not-found.tsx      # Fallback 404 screen
│
├── assets/                 # Static assets (images, fonts, splash screens, app icons)
│
├── src/                    # Core application logic & reusable code
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Domain-agnostic UI (Buttons, Inputs, Cards, Modals)
│   │   └── domain/         # Feature-specific UI (ProductList, SalesChart, OCRScanner)
│   │
│   ├── constants/          # Global configurations (Colors, Typography, Layout sizes)
│   │
│   ├── context/            # React Context providers (AuthContext, ThemeContext)
│   │
│   ├── hooks/              # Custom React hooks (e.g., useSupabaseAuth, useOfflineSync)
│   │
│   ├── lib/                # 3rd-party library initializations
│   │   └── supabase.ts     # Supabase client setup (w/ AsyncStorage or SecureStore adapter)
│   │
│   ├── services/           # Data access layer (Business Logic)
│   │   ├── auth.ts         # Supabase Auth wrappers
│   │   ├── inventory.ts    # CRUD operations with Supabase
│   │   └── sync.ts         # Offline-first queueing logic (SQLite fallback)
│   │
│   ├── store/              # Global state management (Zustand or Redux)
│   │
│   ├── types/              # Global TypeScript interfaces
│   │   ├── database.ts     # Generated Supabase TS types (npx supabase gen types)
│   │   └── env.d.ts        # Environment variable types
│   │
│   └── utils/              # Helper functions (Currency formatters, date parsers, validators)
│
├── app.json                # Expo configuration file
├── package.json            # Project dependencies and scripts
├── babel.config.js         # Babel presets
├── tsconfig.json           # TypeScript configuration
└── .env                    # Environment variables (EXPO_PUBLIC_SUPABASE_URL, etc.)
```

## Architectural Guidelines for Expo + Supabase

1. **Expo Router**: Do not use `react-navigation` directly. Place all screens inside the `/app` directory using file-based routing principles. Use Route Groups like `(auth)` to share layouts without adding path segments.
2. **Supabase Client Setup**: The Supabase client in `src/lib/supabase.ts` must use a custom storage adapter (e.g., `@react-native-async-storage/async-storage` or `expo-secure-store`) to persist the authentication session across app restarts in React Native.
3. **Offline-First Strategy**: 
   - **Reads**: Fetch from a local datastore (e.g., Zustand state, AsyncStorage, or SQLite) first. Hydrate the local store asynchronously from Supabase.
   - **Writes**: Queue mutations locally when offline. Implement a sync service (`src/services/sync.ts`) to replay queued mutations to Supabase when the connection is restored.
4. **Data Fetching**: Encapsulate Supabase RPCs and queries inside `src/services/` rather than writing raw `.select()` or `.insert()` calls directly in your UI components.
5. **Type Safety**: Generate Supabase types using the Supabase CLI and store them in `src/types/database.ts`. Pass these types into your Supabase client for full end-to-end type safety.
6. **Environment Variables**: Use the `EXPO_PUBLIC_` prefix for any variables (like the Supabase URL and Anon Key) that need to be accessed from within the client code.
