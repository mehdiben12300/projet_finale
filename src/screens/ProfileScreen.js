import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { saveTasksToStorage, initialTasks } from '../storage/asyncStorage';

export const ProfileScreen = () => {
  const { stats } = useTasks();

  const performReset = async () => {
    await saveTasksToStorage(initialTasks);
    if (Platform.OS === 'web') {
      window.alert('Données réinitialisées. Rafraîchissez la page (F5) pour recharger.');
    } else {
      Alert.alert(
        'Succès',
        'Données réinitialisées. Redémarrez ou rafraîchissez pour recharger.'
      );
    }
  };

  const handleResetData = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous restaurer les 4 tâches de démonstration complètes ?')) {
        performReset();
      }
    } else {
      Alert.alert(
        'Réinitialiser les données',
        'Voulez-vous restaurer les 4 tâches de démonstration complètes ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réinitialiser', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  const featuresList = [
    { icon: 'camera', color: '#0284C7', title: 'Caméra & Galerie', desc: 'Capture de photo directe et sélection avec expo-image-picker' },
    { icon: 'document-text', color: '#6366F1', title: 'Fichiers locaux', desc: 'Sélection de documents PDF/Word avec expo-document-picker & partage' },
    { icon: 'cloud-download', color: '#059669', title: 'Appel API Fichiers', desc: 'Téléchargement de documents distants via expo-file-system' },
    { icon: 'alarm', color: '#D97706', title: 'Rappels Date & Heure', desc: 'Notifications locales programmées avec expo-notifications' },
    { icon: 'location', color: '#DC2626', title: 'Carte OpenStreetMap & GPS', desc: 'Sélection interactive sur Leaflet & calcul de proximité GPS' },
    { icon: 'chatbubbles', color: '#8B5CF6', title: 'Observateurs & Commentaires', desc: 'Discussions d’observateurs avec notification instantanée' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* En-tête profil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="school" size={40} color="#0284C7" />
          </View>
          <Text style={styles.userName}>Projet Final — MyTasks Pro</Text>
          <Text style={styles.userRole}>Étudiant / Développeur Mobile</Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Résumé des tâches</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Terminées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>À faire</Text>
            </View>
          </View>
        </View>

        {/* Synthèse des 6 fonctionnalités demandées */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>6 Fonctionnalités implémentées</Text>
          <View style={{ gap: 12, marginTop: 10 }}>
            {featuresList.map((f, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={[styles.featureIconBox, { backgroundColor: f.color + '15' }]}>
                  <Ionicons name={f.icon} size={20} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureName}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bouton de réinitialisation */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetData}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color="#DC2626" />
          <Text style={styles.resetButtonText}>Réinitialiser les tâches d'exemple</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  featureDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
  },
  resetButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ProfileScreen;
