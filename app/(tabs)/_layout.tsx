// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dbRealtime, pushSOS } from '@/lib/firebase';
import { getValidTouristId } from '@/lib/getValidTouristId';
import { startGpsStream, stopGpsStream } from '@/lib/gps-stream';
import { onValue, ref } from 'firebase/database';

// A simple TabBarIcon component. You can customize this as needed.
function TabBarIcon({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} name={name} color={color} />;
}

const SafetyScoreDisplay = () => {
  const [safetyInfo, setSafetyInfo] = useState<{
    score: number;
    level: string;
    district: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Make sure to replace this with your actual server URL
        const response = await fetch('https://e0d132f1f08a.ngrok-free.app/calculate_score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude }),
        });

        if (!response.ok) {
          throw new Error('Server error');
        }

        const data = await response.json();
        setSafetyInfo(data);
      } catch (e) {
        console.error("Error fetching safety score:", e);
        setError('Could not get score.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScore();
    const intervalId = setInterval(fetchScore, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const getScoreColor = () => {
    if (!safetyInfo) return '#666';
    if (safetyInfo.level === 'Safe') return '#2ecc71';
    if (safetyInfo.level === 'Caution') return '#f39c12';
    return '#e74c3c';
  };

  return (
    <View style={styles.scoreContainer}>
      {isLoading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={{ color: 'red' }}>{error}</Text>
      ) : safetyInfo ? (
        <Text style={{ color: getScoreColor(), fontWeight: 'bold' }}>
          Safety Score ({safetyInfo.district}): {safetyInfo.score}/100 ({safetyInfo.level})
        </Text>
      ) : (
        <Text>No score available.</Text>
      )}
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission denied');
        return;
      }

      let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.error('Background location permission denied');
      }

      const touristId = await getValidTouristId();
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

      if (touristId && serverUrl) {
        startGpsStream(touristId, serverUrl);
      }
    })();

    const sosRef = ref(dbRealtime, 'sos');
    onValue(sosRef, (snapshot) => {
      // Logic to handle incoming SOS data if needed
    });

    return () => {
      stopGpsStream();
    };
  }, []);

  const handleSOS = async () => {
    const touristId = await getValidTouristId();
    if (!touristId) {
      alert('Could not verify tourist ID.');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      await pushSOS(touristId, location.coords.latitude, location.coords.longitude);
      alert('SOS signal sent!');
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'SOS Sent!',
          body: 'Your emergency signal has been sent to the authorities.',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert('Failed to send SOS signal.');
    }
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <SafetyScoreDisplay />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Directions',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'map' : 'map-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="safety"
          options={{
            title: 'Safety Monitor',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'shield' : 'shield-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attractions"
          options={{
            title: 'Nearby',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'compass' : 'compass-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
      <TouchableOpacity
        style={[styles.panicButton, { bottom: insets.bottom + 65 }]}
        onPress={handleSOS}>
        <Text style={styles.panicButtonText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    paddingTop: 40, // Added padding to avoid overlap with status bar
  },
  tabBar: {
    height: 60,
    paddingBottom: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: -5,
  },
  panicButton: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panicButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});