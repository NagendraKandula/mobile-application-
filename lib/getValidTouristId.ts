import { auth, db } from "@/lib/firebase";
import { Trip } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";

export async function getValidTouristId(): Promise<string | null> {
  if (!auth.currentUser) return null;

  try {
    const tripsSnap = await getDocs(
      collection(db, "tourists", auth.currentUser.uid, "trips")
    );

    const trips: Trip[] = tripsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Trip, "id">),
    }));

    const firstValidTrip = trips.find((t) => t.valid);
    return firstValidTrip?.blockchainId || null;
  } catch (err) {
    console.error("Failed to fetch trips:", err);
    return null;
  }
}
