// /lib/fcm.ts
import messaging from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getValidTouristId } from './getValidTouristId';

const SERVER_URL: string = process.env.NEXT_PUBLIC_SERVER_URL!;


export async function getFCMToken(): Promise<string | null> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (err) {
    console.error('Failed to get FCM token:', err);
    return null;
  }
}

export function useFcm() {
  const fcmRegistered = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (fcmRegistered.current) return;
    fcmRegistered.current = true;

    const registerToken = async () => {
      const authStatus = await messaging().requestPermission();
      if (
        authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        authStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) return;

      const token = await messaging().getToken();
      console.log("FCM Token:", token);

      const touristId = await getValidTouristId();
      if (touristId) {
        await fetch(`${SERVER_URL}/save_push_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tourist_id: touristId, token }),
        });
      }
    };

    registerToken();

    const foregroundSub = messaging().onMessage(async (remoteMessage) => {
      Alert.alert(
        remoteMessage.notification?.title ?? "Alert",
        remoteMessage.notification?.body ?? ""
      );
    });

    const backgroundSub = messaging().onNotificationOpenedApp((remoteMessage) => {
      setTimeout(() => router.push("/index"), 500);
    });

    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        setTimeout(() => router.push("/index"), 500);
      }
    });

    return () => {
      foregroundSub();
      backgroundSub();
    };
  }, []);
}
