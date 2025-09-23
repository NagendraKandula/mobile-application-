// app/safety.tsx

import { onValue, ref } from "firebase/database";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { getCurrentLocation, LocationCoords } from "@/lib/currentLocation";
import { db, dbRealtime } from "@/lib/firebase";
// eslint-disable-next-line import/no-unresolved
import mapTemplate from "@/lib/map-template";
import { RefreshCw } from "lucide-react-native"; // ✅ optional nice icon

export default function SafetyScreen() {
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [highRiskZones, setHighRiskZones] = useState<
    { coords: [number, number]; radius: number }[]
  >([]);
  const [efirs, setefirs] = useState<
    { coords: [number, number]; touristId: string }[]
  >([]);

  const webViewRef = useRef<WebView>(null);

  // 1️⃣ Get current user location
  const fetchLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setOriginCoords(loc);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // 2️⃣ Subscribe to Firestore geofencing zones
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "geofencing_zones"), (snapshot) => {
      const zones: { coords: [number, number]; radius: number }[] =
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            coords: [data.coordinates[1], data.coordinates[0]], // [lon, lat]
            radius: data.radius,
          };
        });
      setHighRiskZones(zones);
    });
    return () => unsub();
  }, []);

  // 3️⃣ Subscribe to RTDB efirs efirs
  useEffect(() => {
    const efirsRef = ref(dbRealtime, "efirs");
    const unsubscribe = onValue(efirsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const parsed: { coords: [number, number]; touristId: string }[] = [];

        Object.values(val).forEach((entry: any) => {
          if (entry.location?.latitude && entry.location?.longitude) {
            parsed.push({
              coords: [entry.location.longitude, entry.location.latitude],
              touristId: entry.tourist_id || "unknown",
            });
          }
        });

        setefirs(parsed);
        console.log("✅ efirs loaded:", parsed);
      } else {
        setefirs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Monitor</Text>
      </View>

      <View style={styles.container}>
        {!originCoords ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Fetching location...</Text>
          </View>
        ) : (
          <>
            {/* Map */}
            <WebView
              ref={webViewRef}
              style={styles.map}
              originWhitelist={["*"]}
              onMessage={(event) =>
                console.log("Map Event:", event.nativeEvent.data)
              }
              source={{
                html: mapTemplate(
                  highRiskZones,
                  [originCoords.longitude, originCoords.latitude],
                  efirs,
                  16
                ),
              }}
            />

            {/* Floating refresh button */}
            <TouchableOpacity
              style={styles.fab}
              onPress={fetchLocation}
              activeOpacity={0.8}
            >
              <RefreshCw color="#fff" size={20} />
            </TouchableOpacity>

            {/* Legend */}
            <View style={styles.legend}>
              <Text style={styles.legendText}>🟦 You</Text>
              <Text style={styles.legendText}>🔴 Risk Zones</Text>
              <Text style={styles.legendText}>🟧 SOS efirs</Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, position: "relative" },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f8f9fa",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 8, fontSize: 16, color: "#555" },
  map: { flex: 1 },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#007AFF",
    borderRadius: 50,
    padding: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  legend: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "500",
    marginVertical: 2,
  },
});
