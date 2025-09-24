// app/(tabs)/attractions.tsx

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Attraction {
  name: string;
  address: string;
  distance: number;
  lat: number;
  lon: number;
}

export default function AttractionsScreen() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttractions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        // ⚠️ IMPORTANT: Replace this with your full ngrok URL
        const serverUrl = 'https://ccc26495aafe.ngrok-free.app';
        
        const response = await fetch(`${serverUrl}/get_nearby_attractions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch attractions.');
        }

        const data = await response.json();
        setAttractions(data);

      } catch (e) {
        console.error("Error fetching attractions:", e);
        setError("Could not load nearby attractions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  const handleDirections = (attraction: Attraction) => {
    router.push({
      pathname: '/',
      params: { 
        destinationLat: attraction.lat, 
        destinationLon: attraction.lon,
        destinationName: attraction.name,
      },
    });
  };

  const renderItem = ({ item }: { item: Attraction }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText style={styles.address}>{item.address}</ThemedText>
        <ThemedText style={styles.distance}>
          {(item.distance / 1000).toFixed(1)} km away
        </ThemedText>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => handleDirections(item)}>
        {/* Corrected Icon Name */}
        <FontAwesome name="location-arrow" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Nearby Attractions</ThemedText>
      {isLoading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>

      ) : (
        <FlatList
          data={attractions}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#0055A4', // A nice blue color for the main title
  },
  attractionName: {
    color: '#140707ff', // A dark gray for the attraction name
    fontWeight: '600',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  // ... (rest of the styles are the same) ...
  loader: { marginTop: 50 },
  errorText: { textAlign: 'center', marginTop: 50, color: 'red' },
  list: { paddingBottom: 20 },
  itemContent: { flex: 1 },
  address: { fontSize: 14, color: '#666', marginTop: 4 },
  distance: { fontSize: 12, color: '#007BFF', marginTop: 8, fontWeight: '600' },
  button: { backgroundColor: '#007BFF', padding: 12, borderRadius: 50, marginLeft: 12 },
});