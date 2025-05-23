import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Fallback for web
const webStorageKey = 'cards';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function saveCard(card: any) {
  const data = await getItem(webStorageKey);
  const cards = data ? JSON.parse(data) : [];
  cards.push(card);
  await setItem(webStorageKey, JSON.stringify(cards));
}

export async function getCards(): Promise<any[]> {
  const data = await getItem(webStorageKey);
  return data ? JSON.parse(data) : [];
}

export async function clearCards() {
  await deleteItem(webStorageKey);
}
