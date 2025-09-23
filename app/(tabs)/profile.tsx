"use client";

import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Clipboard,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";

interface Trip {
  itinerary: string;
  startDate: any;
  endDate: any;
  blockchainId: string;
  valid: boolean;
}

interface Tourist {
  walletAddress: string;
  passport: string;
  emergencyContact: string;
  trips: Trip[];
}

export default function ProfileScreen() {
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTouristData = async () => {
      if (!auth.currentUser) return;

      const touristDoc = await getDoc(doc(db, "tourists", auth.currentUser.uid));
      if (!touristDoc.exists()) return;

      const touristData = touristDoc.data() as any;

      // Fetch trips subcollection
      const tripsSnap = await getDocs(
        collection(db, "tourists", auth.currentUser.uid, "trips")
      );
      const trips: Trip[] = tripsSnap.docs.map((doc) => doc.data() as Trip);

      setTourist({ ...touristData, trips });
      setLoading(false);
    };

    fetchTouristData();
  }, []);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    ToastAndroid.show("Copied to clipboard!", ToastAndroid.SHORT);
  };

  if (loading)
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Fetching tourist data...</Text>
      </View>
    );

  if (!tourist)
    return (
      <View style={styles.loadingCard}>
        <Text style={styles.loadingText}>No tourist data found</Text>
      </View>
    );

  const currentTrips = tourist.trips.filter((t) => t.valid);
  const pastTrips = tourist.trips.filter((t) => !t.valid);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Digital Tourist ID</Text>

        {/* Wallet & Blockchain */}
        <View style={styles.section}>
          <Text style={styles.label}>Tourist ID</Text>
          <View style={styles.row}>
            <Text style={styles.value}>
              {tourist.trips[0]?.valid
                ? truncateAddress(tourist.trips[0].blockchainId)
                : "N/A"}
            </Text>
            {tourist.trips[0]?.valid && (
              <TouchableOpacity
                onPress={() => copyToClipboard(tourist.trips[0].blockchainId)}
              >
                <Text style={styles.copyBtn}>Copy</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>Wallet Address</Text>
          <View style={styles.row}>
            <Text style={styles.value}>{truncateAddress(tourist.walletAddress)}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(tourist.walletAddress)}>
              <Text style={styles.copyBtn}>Copy</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Passport</Text>
          <Text style={styles.value}>{tourist.passport}</Text>

          <Text style={styles.label}>Emergency Contact</Text>
          <Text style={styles.value}>{tourist.emergencyContact}</Text>
        </View>

        {/* Current Trips */}
        <Text style={styles.sectionTitle}>Current Trip(s)</Text>
        {currentTrips.length === 0 && <Text style={styles.noTrips}>No active trips</Text>}
        {currentTrips.map((trip, idx) => (
          <View key={idx} style={styles.tripCard}>
            <Text style={styles.tripItinerary}>{trip.itinerary}</Text>
            <Text style={styles.subText}>
              {trip.startDate?.toDate().toLocaleDateString()} -{" "}
              {trip.endDate?.toDate().toLocaleDateString()}
            </Text>
          </View>
        ))}

        {/* Past Trips */}
        <Text style={styles.sectionTitle}>Past Trips</Text>
        {pastTrips.length === 0 && <Text style={styles.noTrips}>No past trips</Text>}
        {pastTrips.map((trip, idx) => (
          <View key={idx} style={styles.tripCardPast}>
            <Text style={styles.tripItinerary}>{trip.itinerary}</Text>
            <Text style={styles.subText}>
              {trip.startDate?.toDate().toLocaleDateString()} -{" "}
              {trip.endDate?.toDate().toLocaleDateString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
    paddingTop: 34,
    paddingLeft: 9,
    paddingRight: 9,
  },
  loadingCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 12,
    elevation: 3,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  section: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
  },
  label: { fontWeight: "600", color: "#555", marginTop: 8 },
  value: { fontSize: 16, marginBottom: 4, color: "#333" },
  copyBtn: { color: "#3498db", fontWeight: "600", marginLeft: 10 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    color: "#34495e",
  },
  tripCard: {
    padding: 14,
    backgroundColor: "#d0f0fd",
    borderRadius: 12,
    marginBottom: 10,
  },
  tripCardPast: {
    padding: 14,
    backgroundColor: "#eee",
    borderRadius: 12,
    marginBottom: 10,
  },
  tripItinerary: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#2c3e50",
  },
  subText: { fontSize: 14, color: "#555" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  noTrips: { fontStyle: "italic", color: "#888", marginBottom: 10 },
});
