import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { onlineManager } from '@tanstack/react-query';
import { queryClient, asyncStoragePersister } from '../src/lib/queryClient';
import { flushOutbox } from '../src/services/syncService';

export default function RootLayout() {
  useEffect(() => {
    if (onlineManager.isOnline()) flushOutbox();
    return onlineManager.subscribe(() => {
      if (onlineManager.isOnline()) flushOutbox();
    });
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </PersistQueryClientProvider>
  );
}
