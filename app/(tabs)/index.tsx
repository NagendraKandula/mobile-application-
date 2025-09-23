import { getCurrentLocation, LocationCoords } from "@/lib/currentLocation";
import { db } from "@/lib/firebase";
// eslint-disable-next-line import/no-unresolved
import mapTemplate from "@/lib/map-template";
import { useLocalSearchParams } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    name?: string;
  }>();
  console.log("Destination params:", params);

  const destinationFromParam = useMemo(() => {
    if (params.lat && params.lng) {
      return {
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lng),
        name: params.name || "",
      };
    }
    return null;
  }, [params.lat, params.lng, params.name]);

  const [originInput, setOriginInput] = useState("");
  const [destinationInput, setDestinationInput] = useState(
    destinationFromParam?.name || ""
  );
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [destinationCoords, setDestinationCoords] =
    useState<LocationCoords | null>(
      destinationFromParam
        ? {
            latitude: destinationFromParam.latitude,
            longitude: destinationFromParam.longitude,
          }
        : null
    );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<
    "origin" | "destination" | null
  >(null);
  const [highRiskZones, setHighRiskZones] = useState<
    { coords: [number, number]; radius: number }[]
  >([]);

  const webViewRef = useRef<WebView>(null);

  // 1️⃣ Get user location on mount
  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setOriginCoords(loc);
        setOriginInput(`${loc.latitude}, ${loc.longitude}`);
      }
    })();
  }, []);

  // 2️⃣ Firestore geofencing zones
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "geofencing_zones"),
      (snapshot) => {
        const zones = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            coords: [data.coordinates[1], data.coordinates[0]] as [
              number,
              number
            ],
            radius: data.radius,
          };
        });
        setHighRiskZones(zones);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3️⃣ TomTom suggestions
  const fetchSuggestions = async (
    query: string,
    field: "origin" | "destination"
  ) => {
    if (!query) return setSuggestions([]);
    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(
        query
      )}.json?key=${TOMTOM_API_KEY}&limit=5`;
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
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const drawRoute = () => {
    if (!originCoords || !destinationCoords) {
      Alert.alert("Error", "Please select valid origin and destination.");
      return;
    }
    const js = `
      if (typeof drawRoute === "function") {
        drawRoute([${originCoords.longitude}, ${originCoords.latitude}], [${destinationCoords.longitude}, ${destinationCoords.latitude}]);
      } else {
        window.ReactNativeWebView.postMessage("drawRoute function missing in mapTemplate");
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  // 4️⃣ Auto-set destination from URL param
  useEffect(() => {
    if (destinationFromParam) {
      setDestinationCoords({
        latitude: destinationFromParam.latitude,
        longitude: destinationFromParam.longitude,
      });
      setDestinationInput(destinationFromParam.name || "");
    }
  }, [destinationFromParam]);

  // 5️⃣ Auto-draw route when both coords are ready
  useEffect(() => {
    if (originCoords && destinationCoords) {
      drawRoute();
    }
  }, [originCoords, destinationCoords]);

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <Button title="Directions" onPress={drawRoute} />
      </View>

      {suggestions.length > 0 && (
        <FlatList
          style={styles.suggestions}
          data={suggestions}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectSuggestion(item)}>
              <Text style={styles.suggestionItem}>
                {item.address.freeformAddress}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <WebView
        ref={webViewRef}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={(event) => {
          const msg = event.nativeEvent.data;
          console.log("Map Event:", msg);
          if (msg === "map-ready" && originCoords && destinationCoords) {
            drawRoute();
          }
        }}
        source={{
          html: mapTemplate(
            highRiskZones,
            originCoords
              ? [originCoords.longitude, originCoords.latitude]
              : undefined,
            []
          ),
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  controls: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 6,
    marginRight: 8,
    borderRadius: 4,
  },
  suggestions: { backgroundColor: "#fff", maxHeight: 200 },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
