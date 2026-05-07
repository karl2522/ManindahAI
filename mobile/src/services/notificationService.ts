import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { UserService } from './user';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  /**
   * Register for push notifications and return the Expo Push Token.
   */
  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (Platform.OS === 'web') return undefined;

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return undefined;
    }

    try {
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (e) {
      console.error('Error getting push token:', e);
      return undefined;
    }
  },

  /**
   * Update the user's push token in Supabase.
   */
  async updateUserPushToken(user_id: string, token: string): Promise<void> {
    try {
      await UserService.update(user_id, { push_token: token });
      console.log('Push token updated in backend');
    } catch (e) {
      console.error('Failed to update push token in backend:', e);
    }
  },

  /**
   * Schedule a local notification (e.g., for low stock).
   */
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Local notifications are not supported on web:', title);
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // immediate
    });
  },

  /**
   * Add listeners for notification events.
   */
  addNotificationListeners(
    onReceived?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
      if (onReceived) onReceived(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response Received:', response);
      if (onResponse) onResponse(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  },
};
