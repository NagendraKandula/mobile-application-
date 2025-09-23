import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

let ws: WebSocket | null = null;
const BACKGROUND_GPS_TASK = "background-gps-task";

let globalTouristId: string | null = null;
let globalServerUrl: string | null = null;

/**
 * Foreground GPS streaming with WebSocket
 */
export async function startGpsStream(touristId: string, serverUrl: string) {
  globalTouristId = touristId;
  globalServerUrl = serverUrl;

  if (ws && ws.readyState === WebSocket.OPEN) return; // already running

  // Ask for permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    console.warn("⚠️ Location permission not granted");
    return;
  }

  // Connect WebSocket
  try {
    ws = new WebSocket(`${serverUrl.replace(/^http/, "ws")}/ws/gps`);

    ws.onopen = () => console.log("✅ GPS WebSocket connected");

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📡 Server risk update:", data);

        if (data.risk_level === "🚨 Unsafe") {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "⚠️ Unsafe Location Detected",
              body: "Be careful! Your current movement is flagged as unsafe.",
              sound: true,
            },
            trigger: null,
          });
        }
      } catch (err) {
        console.warn("⚠️ Failed to parse WS message:", err);
      }
    };

    ws.onerror = (err: Event) => {
      console.warn("⚠️ GPS WebSocket error:", err);
    };

    ws.onclose = (event) => {
      console.log(
        `⚠️ GPS WebSocket closed (code: ${event?.code}, reason: ${
          event?.reason || "N/A"
        })`
      );
      ws = null;
      // Optional: auto-reconnect
      setTimeout(() => {
        if (globalTouristId && globalServerUrl) {
          startGpsStream(globalTouristId, globalServerUrl);
        }
      }, 5000);
    };
  } catch (err) {
    console.warn("⚠️ Failed to connect GPS WebSocket:", err);
  }

  // Start watching GPS (foreground)
  await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
    },
    (loc) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          tourist_id: touristId,
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        })
      );
    }
  );

  // Also enable background tracking
  await startBackgroundGps();
}

export function stopGpsStream() {
  if (ws) {
    ws.close();
    ws = null;
  }
  stopBackgroundGps();
}

/**
 * Background GPS task (HTTP fallback)
 */
TaskManager.defineTask(BACKGROUND_GPS_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("⚠️ Background GPS error:", error);
    return;
  }
  if (!globalTouristId || !globalServerUrl) return;

  if (data) {
    const { locations } = data as any;
    const loc = locations[0];
    if (loc) {
      console.log("📡 Background GPS:", loc.coords);

      try {
        await fetch(`${globalServerUrl}/api/gps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tourist_id: globalTouristId,
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn("⚠️ Failed to send GPS (background):", err);
      }
    }
  }
});

async function startBackgroundGps() {
  const bgStatus = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus.status !== "granted") {
    console.warn("⚠️ Background location not granted");
    return;
  }

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

async function stopBackgroundGps() {
  await Location.stopLocationUpdatesAsync(BACKGROUND_GPS_TASK);
}
