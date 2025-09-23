// (tabs)/_layout.tsx
import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { startBackgroundGps, stopBackgroundGps } from "@/lib/backgroundGps";
import { useFcm } from "@/lib/fcm";
import { auth, pushSOS } from "@/lib/firebase";
import { getValidTouristId } from "@/lib/getValidTouristId";
import { startGpsStream, stopGpsStream } from "@/lib/gps-stream";
import * as Location from "expo-location";
import { Tabs } from "expo-router";
import { AlertTriangle, Home, MapPin, Shield, User } from "lucide-react-native";
import React, { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

const SERVER_URL: string = process.env.NEXT_PUBLIC_SERVER_URL!;

export default function TabLayout() {
  useFcm();
  const colorScheme = useColorScheme();

  const triggerSOS = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert("Error", "User not logged in.");
        return;
      }

      const touristId = await getValidTouristId();
      if (!touristId) {
        Alert.alert(
          "No Active Trip",
          "SOS can only be sent if you have a valid active trip."
        );
        return;
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to send SOS."
        );
        return;
      }

      // Get current location
      const loc = await Location.getCurrentPositionAsync({});

      // Use blockchainId as touristId
      await pushSOS(touristId, loc.coords.latitude, loc.coords.longitude);

      Alert.alert(
        "🚨 SOS Sent",
        "Your emergency request was sent to authorities."
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send SOS.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initStream = async () => {
      const validTouristId = await getValidTouristId();

      if (isMounted && validTouristId) {
        console.log("Starting GPS stream for:", validTouristId);
        startGpsStream(validTouristId, SERVER_URL);
      } else {
        console.log("No valid trip found, skipping GPS stream.");
      }
    };

    initStream();

    return () => {
      isMounted = false;
      stopGpsStream();
    };
  }, []);

  useEffect(() => {
    startBackgroundGps();

    return () => {
      stopBackgroundGps();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="safety"
          options={{
            title: "Safety",
            tabBarIcon: ({ color, size }) => (
              <Shield color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Itinerary",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="attractions"
          options={{
            title: "Nearby",
            tabBarIcon: ({ color, size }) => (
              <MapPin color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Panic Button */}
      <TouchableOpacity style={styles.fab} onPress={triggerSOS}>
        <AlertTriangle color="white" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 110,
    right: 20,
    backgroundColor: "red",
    borderRadius: 40,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
