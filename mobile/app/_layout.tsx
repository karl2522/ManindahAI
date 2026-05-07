import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { onlineManager } from '@tanstack/react-query';
import { queryClient, asyncStoragePersister } from '../src/lib/queryClient';
import { flushOutbox } from '../src/services/syncService';
import { SyncBadge } from '../src/components/SyncBadge';
import { NotificationService } from '../src/services/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplashScreen } from '../src/components/AnimatedSplashScreen';
import { useStore } from '../src/hooks/useStore';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Handles notification registration and listeners within the Query context.
 */
function NotificationHandler() {
  const { profile } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!profile?.user_id) return;

    // Register for push notifications
    NotificationService.registerForPushNotificationsAsync().then(token => {
      if (token && profile.user_id) {
        NotificationService.updateUserPushToken(profile.user_id, token);
      }
    });

    // Set up listeners
    const cleanup = NotificationService.addNotificationListeners(
      (notification) => {
        // Handle foreground notification if needed
        console.log('Foreground notification:', notification.request.content.title);
      },
      (response) => {
        // Handle notification click
        const data = response.notification.request.content.data;
        if (data?.url) {
          router.push(data.url as any);
        }
      }
    );

    return cleanup;
  }, [profile?.user_id]);

  return null;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(Platform.OS !== 'web');
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (isReady) {
      // Hide the native splash screen as soon as the app is ready
      // Our custom AnimatedSplashScreen will take over from here
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  useEffect(() => {
    // Polyfill for Barcode Detection API on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.log('Initializing BarcodeDetector polyfill...');
      import('barcode-detector').then(({ BarcodeDetector }) => {
        if (!('BarcodeDetector' in window)) {
          (window as any).BarcodeDetector = BarcodeDetector;
          console.log('BarcodeDetector polyfill loaded successfully.');
        } else {
          console.log('Native BarcodeDetector already exists.');
        }
        setIsReady(true);
      }).catch(err => {
        console.error('BarcodeDetector polyfill failed to load:', err);
        setIsReady(true); // Proceed anyway
      });
    }
  }, []);

  useEffect(() => {
    if (onlineManager.isOnline()) flushOutbox();
    const unsubscribe = onlineManager.subscribe(() => {
      if (onlineManager.isOnline()) flushOutbox();
    });
    return () => unsubscribe();
  }, []);

  if (!isReady) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <NotificationHandler />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="review-ocr" 
          options={{ 
            presentation: 'modal',
            headerTitle: 'Verify Scanned Items'
          }} 
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showAnimatedSplash && (
        <AnimatedSplashScreen onAnimationEnd={() => setShowAnimatedSplash(false)} />
      )}
    </PersistQueryClientProvider>
  );
}
