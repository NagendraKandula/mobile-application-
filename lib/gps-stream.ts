import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const BACKGROUND_GPS_TASK = "background-gps-task";

// Store these globally so the background task can access them
let globalTouristId: string | null = null;
let globalServerUrl: string | null = null;

// Keep track of the foreground subscription to stop it later
let foregroundSubscription: Location.LocationSubscription | null = null;

/**
 * Sends a location update to the backend tracking endpoint.
 */
async function sendLocationUpdate(location: Location.LocationObject) {
  if (!globalTouristId || !globalServerUrl) {
    return;
  }

  // --- TODO: Get the user's next destination from your app's state ---
  // For now, these are placeholder values. You'll need to replace them.
  const destination = {
    lat: null, // e.g., currentItinerary.nextStop.latitude
    lon: null, // e.g., currentItinerary.nextStop.longitude
  };
  // --------------------------------------------------------------------

  try {
    const response = await fetch(`${globalServerUrl}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourist_id: globalTouristId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        destination_lat: destination.lat,
        destination_lon: destination.lon,
      }),
    });
    
    // You can check the response for any anomalies found by the server
    const data = await response.json();
    if (data.anomalies && data.anomalies.length > 0) {
        console.log("Anomalies Detected:", data.anomalies);
        // Here you could trigger a notification for the user
    }

  } catch (err) {
    console.warn("⚠️ Failed to send GPS tracking update:", err);
  }
}

/**
 * Starts both foreground and background location tracking.
 */
export async function startGpsStream(touristId: string, serverUrl: string) {
  globalTouristId = touristId;
  globalServerUrl = serverUrl;

  console.log("✅ Starting GPS Stream...");

  // Start foreground tracking
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Send update every 10 seconds
      distanceInterval: 10, // Or every 10 meters
    },
    (location) => {
      console.log("📡 Foreground GPS:", location.coords);
      sendLocationUpdate(location);
    }
  );

  // Start background tracking
  await startBackgroundGps();
}

/**
 * Stops all location tracking.
 */
export function stopGpsStream() {
  console.log("🛑 Stopping GPS Stream...");
  if (foregroundSubscription) {
    foregroundSubscription.remove();
    foregroundSubscription = null;
  }
  stopBackgroundGps();
}

/**
 * Background GPS task definition.
 */
TaskManager.defineTask(BACKGROUND_GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("⚠️ Background GPS error:", error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    if (location) {
      console.log("📡 Background GPS:", location.coords);
      // The background task also sends its data to the same endpoint
      await sendLocationUpdate(location);
    }
  }
});

async function startBackgroundGps() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_GPS_TASK);
  if (hasStarted) {
    console.log("Background GPS already started.");
    return;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 60000, // 30 seconds
    distanceInterval: 50, // 50 meters
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Tourist Safety Monitoring",
      notificationBody: "Your location is being monitored for your safety.",
    },
  });
  console.log("Background GPS task started.");
}

async function stopBackgroundGps() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_GPS_TASK);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_GPS_TASK);
    console.log("Background GPS task stopped.");
  }
}