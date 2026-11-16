import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import locationService from '../services/locationService';

export const MapLocationPicker = ({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
}) => {
  const [selectedCoords, setSelectedCoords] = useState(
    initialLocation || { latitude: 48.8566, longitude: 2.3522 }
  );
  const [locationName, setLocationName] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingCurrentGps, setLoadingCurrentGps] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setSelectedCoords(initialLocation);
      updateLocationName(initialLocation.latitude, initialLocation.longitude);
    }
  }, [initialLocation]);

  const updateLocationName = async (lat, lng) => {
    setLoadingGeo(true);
    const name = await locationService.reverseGeocode(lat, lng);
    setLocationName(name);
    setLoadingGeo(false);
  };

  const handleUseCurrentLocation = async () => {
    setLoadingCurrentGps(true);
    const pos = await locationService.getCurrentLocation();
    setSelectedCoords({ latitude: pos.latitude, longitude: pos.longitude });
    await updateLocationName(pos.latitude, pos.longitude);
    setLoadingCurrentGps(false);
  };

  const handleConfirm = () => {
    onSelectLocation({
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      locationName: locationName || `${selectedCoords.latitude.toFixed(4)}, ${selectedCoords.longitude.toFixed(4)}`,
      radius: 500, // Rayon par défaut : 500 mètres
    });
    onClose();
  };

  // Code HTML Leaflet + OpenStreetMap injecté dans la WebView
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var lat = ${selectedCoords.latitude};
          var lng = ${selectedCoords.longitude};
          var map = L.map('map').setView([lat, lng], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          var marker = L.marker([lat, lng], { draggable: true }).addTo(map);

          function notifyCoords(cLat, cLng) {
            var payload = JSON.stringify({ lat: cLat, lng: cLng });
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(payload);
            } else if (window.parent) {
              window.parent.postMessage(payload, '*');
            }
          }

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            notifyCoords(e.latlng.lat, e.latlng.lng);
          });

          marker.on('dragend', function(e) {
            var position = marker.getLatLng();
            notifyCoords(position.lat, position.lng);
          });
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        setSelectedCoords({ latitude: data.lat, longitude: data.lng });
        updateLocationName(data.lat, data.lng);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choisir un lieu de rappel</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
            <Text style={styles.confirmText}>Valider</Text>
          </TouchableOpacity>
        </View>

        {/* Info lieu sélectionné */}
        <View style={styles.infoBar}>
          <Ionicons name="location" size={20} color="#EF4444" style={styles.pinIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.coordsText}>
              Lat: {selectedCoords.latitude.toFixed(5)} | Lon: {selectedCoords.longitude.toFixed(5)}
            </Text>
            {loadingGeo ? (
              <ActivityIndicator size="small" color="#0284C7" style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={styles.locationNameText} numberOfLines={2}>
                {locationName || 'Cliquez sur la carte pour sélectionner'}
              </Text>
            )}
          </View>
        </View>

        {/* Bouton GPS actuel */}
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleUseCurrentLocation}
          disabled={loadingCurrentGps}
          activeOpacity={0.8}
        >
          {loadingCurrentGps ? (
            <ActivityIndicator size="small" color="#0284C7" />
          ) : (
            <>
              <Ionicons name="navigate-outline" size={16} color="#0284C7" />
              <Text style={styles.gpsButtonText}>Ma position GPS actuelle</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Carte interactive OpenStreetMap */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              title="OpenStreetMap"
              srcDoc={leafletHtml}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              onMessage={handleMessage}
              style={styles.webView}
            />
          )}
        </View>

        {/* Aide en bas */}
        <View style={styles.footerHint}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" />
          <Text style={styles.footerHintText}>
            Touchez n'importe quel point de la carte pour placer le repère de rappel.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pinIcon: {
    marginRight: 10,
  },
  coordsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  locationNameText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  gpsButtonText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 13,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  webView: {
    flex: 1,
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
  },
  footerHintText: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default MapLocationPicker;
