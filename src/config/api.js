import { Platform } from 'react-native';

// Sur navigateur Web (PC), localhost fonctionne directement.
// Sur smartphone avec Expo Go, l'adresse IP locale du PC est utilisée.
export const DEFAULT_API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000/api'
    : 'http://192.168.1.2:3000/api';

let currentApiUrl = DEFAULT_API_URL;

export const getApiUrl = () => currentApiUrl;

export const setApiUrl = (newUrl) => {
  currentApiUrl = newUrl;
};
