// /lib/notifications.ts
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export async function savePushToken(touristId: string, token: string) {
  try {
    const res = await fetch(`${SERVER_URL}/save_push_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourist_id: touristId, token }),
    });

    if (!res.ok) {
      console.error("Failed to save push token:", await res.text());
    } else {
      console.log("✅ Push token saved for tourist:", touristId);
    }
  } catch (err) {
    console.error("Error sending push token:", err);
  }
}
