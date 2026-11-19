import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 3000;

// Sur Expo Go, l'IP du PC qui fait tourner Metro est fournie par hostUri
// (ex: "192.168.1.239:8081"). On la réutilise pour joindre le backend,
// ce qui évite de coder l'IP en dur (elle change selon le réseau Wi-Fi).
const getDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  return hostUri ? hostUri.split(':')[0] : null;
};

const resolveDefaultApiUrl = () => {
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}/api`;
  const host = getDevHost();
  if (host) return `http://${host}:${API_PORT}/api`;
  // Repli : émulateur Android -> 10.0.2.2, sinon localhost
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}/api`
    : `http://localhost:${API_PORT}/api`;
};

export const DEFAULT_API_URL = resolveDefaultApiUrl();

let currentApiUrl = DEFAULT_API_URL;

export const getApiUrl = () => currentApiUrl;

export const setApiUrl = (newUrl) => {
  currentApiUrl = newUrl;
};
