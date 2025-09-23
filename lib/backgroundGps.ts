// lib/background-gps.ts
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

const BACKGROUND_GPS_TASK = "background-gps-task";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

// ✅ Define at top-level, not inside a function/component
TaskManager.defineTask(BACKGROUND_GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background GPS error:", error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const loc = locations[0];
    if (loc) {
      console.log("📡 Background GPS:", loc.coords);

      // Send to FastAPI backend instead of WebSocket
      try {
        await fetch(`${SERVER_URL}/api/gps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourist_id: "some-tourist-id",
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("Failed to send GPS:", err);
      }
    }
  }
});

// Export helpers to start/stop
export async function startBackgroundGps() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted");

  const bgStatus = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus.status !== "granted") throw new Error("Background location not granted");

  await Location.startLocationUpdatesAsync(BACKGROUND_GPS_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 5,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Tourist Safety Monitoring",
      notificationBody: "Tracking your location for safety.",
    },
  });
}

export async function stopBackgroundGps() {
  const tasks = await Location.hasStartedLocationUpdatesAsync("BACKGROUND_GPS_TASK");
  if (tasks) {
    await Location.stopLocationUpdatesAsync("background-gps-task");
    console.log("✅ Background GPS task stopped");
  } else {
    console.log("⚠️ Background GPS task not running");
  }
}
