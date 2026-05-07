process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'dummy-key';

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock QueryClient
jest.mock('./src/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Global mocks
global.fetch = jest.fn();
console.error = jest.fn();
