"use client";

import { Colors, Sizing } from "@/constants/theme"; // Import theme constants
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Copy, ShieldCheck, Ticket, User, Wallet } from "lucide-react-native"; // Import icons
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
import QRCode from 'react-native-qrcode-svg';

// Interfaces remain the same
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
      if (!auth.currentUser) {
          setLoading(false);
          return;
      };

      try {
        const touristDoc = await getDoc(doc(db, "tourists", auth.currentUser.uid));
        if (!touristDoc.exists()) {
            setLoading(false);
            return;
        }

        const touristData = touristDoc.data() as any;
        const tripsSnap = await getDocs(
          collection(db, "tourists", auth.currentUser.uid, "trips")
        );
        const trips: Trip[] = tripsSnap.docs.map((doc) => doc.data() as Trip);

        setTourist({ ...touristData, trips });
      } catch (error) {
        console.error("Error fetching tourist data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTouristData();
  }, []);
  
  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    ToastAndroid.show("Copied to clipboard!", ToastAndroid.SHORT);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Fetching Profile...</Text>
      </View>
    );
  }

  if (!tourist) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No tourist data found.</Text>
      </View>
    );
  }

  const currentTrips = tourist.trips.filter((t) => t.valid);
  const pastTrips = tourist.trips.filter((t) => !t.valid);
  const activeBlockchainId = currentTrips[0]?.blockchainId;

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const InfoRow = ({ icon: Icon, label, value, onCopy }: any) => (
    <View style={styles.infoRow}>
      <Icon color="#555" size={20} style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
      {onCopy && (
        <TouchableOpacity onPress={onCopy} style={styles.copyButton}>
          <Copy color={Colors.light.primary} size={18} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Digital Tourist ID</Text>

        {/* Digital ID Card */}
        <View style={styles.idCard}>
            <View style={styles.idHeader}>
                <ShieldCheck color="#fff" size={24} />
                <Text style={styles.idHeaderText}>Active Tourist Permit</Text>
            </View>

            {activeBlockchainId && (
                <View style={styles.qrContainer}>
                    <QRCode value={activeBlockchainId} size={120} />
                </View>
            )}

            <InfoRow 
                icon={Ticket} 
                label="Tourist ID" 
                value={activeBlockchainId ? truncateAddress(activeBlockchainId) : "N/A"}
                onCopy={activeBlockchainId ? () => copyToClipboard(activeBlockchainId) : undefined}
            />
            <InfoRow 
                icon={Wallet} 
                label="Wallet" 
                value={truncateAddress(tourist.walletAddress)}
                onCopy={() => copyToClipboard(tourist.walletAddress)}
            />
             <InfoRow 
                icon={User} 
                label="Emergency Contact" 
                value={tourist.emergencyContact}
            />
        </View>

        {/* Current Trips */}
        <Text style={styles.sectionTitle}>Current Trip</Text>
        {currentTrips.length > 0 ? currentTrips.map((trip, idx) => (
          <View key={idx} style={[styles.tripCard, styles.currentTripCard]}>
            <Text style={styles.tripItinerary}>{trip.itinerary}</Text>
            <Text style={styles.subText}>
              Valid: {trip.startDate?.toDate().toLocaleDateString()} -{" "}
              {trip.endDate?.toDate().toLocaleDateString()}
            </Text>
          </View>
        )) : <Text style={styles.noTrips}>No active trips.</Text>}

        {/* Past Trips */}
        <Text style={styles.sectionTitle}>Past Trips</Text>
        {pastTrips.length > 0 ? pastTrips.map((trip, idx) => (
          <View key={idx} style={[styles.tripCard, styles.pastTripCard]}>
            <Text style={styles.tripItinerary}>{trip.itinerary}</Text>
            <Text style={styles.subText}>
              {trip.startDate?.toDate().toLocaleDateString()} -{" "}
              {trip.endDate?.toDate().toLocaleDateString()}
            </Text>
          </View>
        )) : <Text style={styles.noTrips}>No past trip history.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
  },
  scrollContent: {
    padding: Sizing.padding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },
  title: {
    fontSize: Sizing.h1,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  idCard: {
    backgroundColor: Colors.light.card,
    borderRadius: Sizing.borderRadius,
    padding: Sizing.padding,
    marginBottom: Sizing.margin * 1.5,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  idHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: Sizing.borderRadius - 4,
    margin: -Sizing.padding,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: Sizing.padding,
  },
  idHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  icon: {
    marginRight: 12,
  },
  label: { 
      fontWeight: "600", 
      color: "#555", 
      fontSize: 16
  },
  value: { 
      fontSize: 16, 
      color: "#333", 
      marginLeft: 'auto',
      marginRight: 8,
      flexShrink: 1,
      textAlign: 'right',
  },
  copyButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: Sizing.h2,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    color: "#34495e",
  },
  tripCard: {
    padding: 16,
    borderRadius: Sizing.borderRadius,
    marginBottom: 10,
    borderLeftWidth: 5,
  },
  currentTripCard: {
    backgroundColor: '#E6F4FF',
    borderColor: Colors.light.primary,
  },
  pastTripCard: {
    backgroundColor: '#F5F5F5',
    borderColor: Colors.light.border,
  },
  tripItinerary: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#2c3e50",
  },
  subText: { 
      fontSize: 14, 
      color: "#555" 
  },
  noTrips: { 
      fontStyle: "italic", 
      color: "#888", 
      textAlign: 'center',
      padding: 20,
      backgroundColor: Colors.light.card,
      borderRadius: Sizing.borderRadius,
  },
});