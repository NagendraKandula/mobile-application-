// app/(tabs)/index.tsx

import { getCurrentLocation, LocationCoords } from "@/lib/currentLocation";
import { db } from "@/lib/firebase";
import mapTemplate from "@/lib/map-template";
import { useLocalSearchParams } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_KEY;

interface SafetyInfo {
  score: number;
  level: string;
  reasons: string[];
  district: string;
}

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    destinationLat?: string;
    destinationLon?: string;
    destinationName?: string;
    distance?: string;
  }>();

  const [safetyInfo, setSafetyInfo] = useState<SafetyInfo | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isSafetyLoading, setIsSafetyLoading] = useState(false);

  const destinationFromParam = useMemo(() => {
    if (params.destinationLat && params.destinationLon) {
      return {
        latitude: parseFloat(params.destinationLat),
        longitude: parseFloat(params.destinationLon),
        name: params.destinationName || "",
      };
    }
    return null;
  }, [params.destinationLat, params.destinationLon, params.destinationName]);

  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState(
    destinationFromParam?.name || ""
  );
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [destinationCoords, setDestinationCoords] =
    useState<LocationCoords | null>(destinationFromParam);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(null);
  const [highRiskZones, setHighRiskZones] = useState<{ coords: [number, number]; radius: number }[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setOriginCoords(loc);
        setOriginInput("Your Location");
      }
    })();
  }, []);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "geofencing_zones"), (snapshot) => {
        const zones: { coords: [number, number]; radius: number }[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            coords: [data.coordinates[1], data.coordinates[0]] as [number, number],
            radius: data.radius,
          };
        });
        setHighRiskZones(zones);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSafetyScore = async () => {
      if (!destinationCoords) {
        setSafetyInfo(null);
        return;
      }
      
      setIsSafetyLoading(true);
      try {
        const response = await fetch('https://e0d132f1f08a.ngrok-free.app/calculate_score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: 0,
            longitude: 0,
            destination_lat: destinationCoords.latitude,
            destination_lon: destinationCoords.longitude,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setSafetyInfo(data);
        }
      } catch (e) {
        console.error("Failed to fetch safety score", e);
        setSafetyInfo(null);
      } finally {
        setIsSafetyLoading(false);
      }
    };
    
    fetchSafetyScore();
  }, [destinationCoords]);

  const drawRoute = () => {
    if (!originCoords || !destinationCoords) return;
    const js = `
      if (typeof window.drawRoute === "function") {
        window.drawRoute([${originCoords.longitude}, ${originCoords.latitude}], [${destinationCoords.longitude}, ${destinationCoords.latitude}]);
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };
  
  useEffect(() => {
    if (isMapReady && originCoords && destinationCoords) {
      drawRoute();
    }
  }, [isMapReady, originCoords, destinationCoords]);
  
  useEffect(() => {
    if (destinationFromParam) {
      setDestinationCoords(destinationFromParam);
      setDestinationInput(destinationFromParam.name || "");
      if (params.distance) {
        setDistance(parseFloat(params.distance));
      }
    }
  }, [destinationFromParam, params.distance]);

  const fetchSuggestions = async (query: string, field: "origin" | "destination") => {
    if (!query || query === "Your Location") return setSuggestions([]);
    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setActiveField(field);
      setSuggestions(data.results || []);
    } catch (err) {
      console.error("TomTom API error:", err);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    const { lat, lon } = item.position;
    if (activeField === "origin") {
      setOriginCoords({ latitude: lat, longitude: lon });
      setOriginInput(item.address.freeformAddress || `${lat}, ${lon}`);
    } else if (activeField === "destination") {
      setDestinationCoords({ latitude: lat, longitude: lon });
      setDestinationInput(item.address.freeformAddress || `${lat}, ${lon}`);
      setDistance(null);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ✅ This View is now horizontal */}
      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          placeholder="Origin"
          value={originInput}
          onChangeText={(text) => {
            setOriginInput(text);
            fetchSuggestions(text, "origin");
          }}
        />
        <TextInput
          style={styles.input}
          placeholder="Destination"
          value={destinationInput}
          onChangeText={(text) => {
            setDestinationInput(text);
            fetchSuggestions(text, "destination");
          }}
        />
        <Button title="Go" onPress={drawRoute} />
      </View>

      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestions}
          data={suggestions}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectSuggestion(item)}>
              <Text style={styles.suggestionItem}>{item.address.freeformAddress}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      
      {destinationCoords && (
        <View style={styles.infoBox}>
          {distance && (
             <Text style={styles.infoText}>
                Distance: <Text style={styles.bold}>{(distance / 1000).toFixed(1)} km</Text>
             </Text>
          )}
          {isSafetyLoading ? (
            <ActivityIndicator />
          ) : safetyInfo ? (
            <Text style={styles.infoText}>
              Safety: <Text style={{fontWeight: 'bold', color: safetyInfo.level === 'Safe' ? 'green' : (safetyInfo.level === 'Caution' ? 'orange' : 'red')}}>
                {safetyInfo.score}/100 ({safetyInfo.level})
              </Text>
            </Text>
          ) : <Text style={styles.infoText}>Safety: N/A</Text>}
        </View>
      )}

      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={(event) => {
          if (event.nativeEvent.data === "map-ready") {
            setIsMapReady(true);
          }
        }}
        source={{
          html: mapTemplate(highRiskZones, originCoords ? [originCoords.longitude, originCoords.latitude] : undefined, []),
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  // ✅ Updated styles for the horizontal layout
  controls: {
    padding: 12,
    backgroundColor: "#f8f9fa",
    flexDirection: 'row', // This makes the items go side-by-side
    alignItems: 'center', // This aligns them vertically
  },
  input: {
    flex: 1, // This makes the inputs share the available space
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 8, // Add some space between the inputs and the button
  },
  suggestions: { 
    position: 'absolute',
    top: 70, // Adjust if necessary based on your new control height
    left: 12,
    right: 12,
    backgroundColor: "#fff", 
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
  },
  bold: {
    fontWeight: 'bold',
  }
});