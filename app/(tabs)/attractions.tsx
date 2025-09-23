import { getCurrentLocation, LocationCoords } from "@/lib/currentLocation";
import { db } from "@/lib/firebase";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface Attraction {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  latitude: number;
  longitude: number;
}

export default function AttractionsScreen() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        const loc = await getCurrentLocation();
        setUserLocation(loc || null);

        const snap = await getDocs(collection(db, "attractions"));
        const data: Attraction[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Attraction[];

        setAttractions(data);
      } catch (err) {
        console.error("Error fetching attractions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttractions();
  }, []);

  const calculateDistance = (lat: number, lng: number) => {
    if (!userLocation) return "-";
    const toRad = (x: number) => (x * Math.PI) / 180;

    const R = 6371000; // meters
    const dLat = toRad(lat - userLocation.latitude);
    const dLon = toRad(lng - userLocation.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(userLocation.latitude)) *
        Math.cos(toRad(lat)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const goToMap = (attraction: Attraction) => {
    console.log(attraction)
    router.push({
      pathname: "(tabs)",
      params: {
        lat: attraction.latitude,
        lng: attraction.longitude,
        name: attraction.name,
      },
    });
  };

  const truncate = (text: string, length = 80) =>
    text.length > length ? text.slice(0, length) + "..." : text;

  const renderItem = ({ item }: { item: Attraction }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.description}>{truncate(item.description)}</Text>
        {userLocation && (
          <>
            <Text style={styles.distance}>
              {calculateDistance(item.latitude, item.longitude)} meters away
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => goToMap(item)}
            >
              <Text style={styles.buttonText}>Directions</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Tourist Attractions</Text>
      <FlatList
        data={attractions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
    padding: 16,
    paddingTop: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 12 },
  cardContent: { flex: 1 },
  name: { fontSize: 18, fontWeight: "600", color: "#34495e" },
  category: { fontSize: 14, color: "#3498db", marginVertical: 2 },
  description: { fontSize: 14, color: "#555" },
  distance: { marginTop: 4, fontSize: 12, color: "#888" },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
