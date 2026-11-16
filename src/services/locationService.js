import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const locationService = {
  // 1. Demande de permissions
  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Erreur permission géolocalisation:', e);
      return false;
    }
  },

  // 2. Récupérer la position GPS actuelle
  async getCurrentLocation() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      // Coordonnées par défaut (Paris centre) si permission refusée
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        isDefault: true,
      };
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        isDefault: false,
      };
    } catch (e) {
      console.warn('Erreur obtention position GPS, position par défaut utilisée:', e);
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        isDefault: true,
      };
    }
  },

  // 3. Obtenir le nom du lieu depuis les coordonnées (Reverse Geocoding OpenStreetMap Nominatim)
  async reverseGeocode(latitude, longitude) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'MyTasksMobileApp/1.0',
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    } catch (e) {
      console.warn('Erreur geocoding Nominatim:', e);
    }
    return `Position (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  },

  // 4. Calcul de la distance entre 2 points GPS (Formule Haversine en mètres)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const rad = (deg) => (deg * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en mètres
  },

  // 5. Vérifier si l'utilisateur est dans la zone de rappel
  checkProximity(currentCoords, targetCoords, radiusMeters = 500) {
    const distance = this.calculateDistance(
      currentCoords.latitude,
      currentCoords.longitude,
      targetCoords.latitude,
      targetCoords.longitude
    );

    return {
      isNearby: distance <= radiusMeters,
      distanceMeters: Math.round(distance),
    };
  },
};

export default locationService;
