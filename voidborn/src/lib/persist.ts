// Tiny JSON persistence over AsyncStorage — the offline floor under the trial/saga stores.
// Storage failures degrade to in-memory only; they never throw into the UI.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — in-memory state still stands */
  }
}
