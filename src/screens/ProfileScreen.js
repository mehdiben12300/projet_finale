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
import { useAuth } from '../context/AuthContext';
import { saveTasksToStorage, initialTasks } from '../storage/asyncStorage';
import { getApiUrl } from '../config/api';

export const ProfileScreen = () => {
  const { stats, triggerSync } = useTasks();
  const { currentUser, availableUsers, switchUser } = useAuth();

  const performReset = async () => {
    try {
      // 1. Réinitialiser localement
      await saveTasksToStorage(initialTasks);

      // 2. Réinitialiser sur le backend API
      try {
        await fetch(`${getApiUrl()}/tasks/reset`, { method: 'POST' });
      } catch (err) {
        console.warn('Backend reset fail:', err);
      }

      // 3. Déclencher synchronisation
      await triggerSync();

      const msg = 'Base de données réinitialisée aux 4 tâches de démonstration complètes !';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Succès', msg);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetData = () => {
    const question = 'Voulez-vous restaurer les 4 tâches de démonstration complètes (multi-utilisateurs & permissions) ?';
    if (Platform.OS === 'web') {
      if (window.confirm(question)) {
        performReset();
      }
    } else {
      Alert.alert(
        'Réinitialiser les données',
        question,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réinitialiser', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  const featuresList = [
    { icon: 'camera', color: '#0284C7', title: 'Caméra & Galerie', desc: 'Capture de photo directe et sélection avec expo-image-picker' },
    { icon: 'document-text', color: '#6366F1', title: 'Fichiers locaux & PDF', desc: 'Sélection de documents avec expo-document-picker & prévisualisation' },
    { icon: 'cloud-download', color: '#059669', title: 'Appel API Fichiers', desc: 'Téléchargement de documents distants via expo-file-system' },
    { icon: 'alarm', color: '#D97706', title: 'Rappels Date & Heure', desc: 'Notifications locales programmées avec expo-notifications' },
    { icon: 'location', color: '#DC2626', title: 'Carte OpenStreetMap & GPS', desc: 'Sélection interactive sur Leaflet & calcul de proximité GPS' },
    { icon: 'chatbubbles', color: '#8B5CF6', title: '3 Niveaux de Permissions', desc: 'Créateur (total), Invité (chat/lecture), Visiteur (lecture seule)' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* En-tête profil actif */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 36 }}>{currentUser?.avatar || '👤'}</Text>
          </View>
          <Text style={styles.userName}>{currentUser?.name || 'Utilisateur'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{currentUser?.role || 'Collaborateur'}</Text>
          </View>
          <Text style={styles.userSubText}>
            Connecté pour tester les permissions et fonctionnalités
          </Text>
        </View>

        {/* Changer d'utilisateur de test */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Changer d'utilisateur (Test des Rôles)</Text>
          <Text style={styles.cardSubtitle}>
            Sélectionnez un profil pour voir comment l'application s'adapte selon ses droits :
          </Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {availableUsers.map((user) => {
              const isSelected = currentUser?.name?.toLowerCase() === user.name?.toLowerCase();
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.userOptionItem, isSelected && styles.userOptionItemSelected]}
                  onPress={() => switchUser(user)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 24, marginRight: 10 }}>{user.avatar}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userOptionName, isSelected && styles.userOptionNameSelected]}>
                      {user.name}
                    </Text>
                    <Text style={styles.userOptionDesc}>
                      {user.name === 'Mehdi' && 'Créateur de "Debug obs" • Invité sur Tâche 2 & 3'}
                      {user.name === 'Professeur' && 'Créateur de "Rapport" • Invité sur Tâche 1'}
                      {user.name === 'Sarah' && 'Créateur de "Test Capteurs" • Invité sur Tâche 1 & 4'}
                      {user.name === 'Dr. Ben Ali' && 'Créateur de "Audit Sécurité" • Invité sur Tâche 3'}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#0284C7" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Statistiques */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Résumé global des tâches</Text>
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚙️ 6 Fonctionnalités implémentées</Text>
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
          <Text style={styles.resetButtonText}>Réinitialiser la base de données de test</Text>
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
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  roleBadgeText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  userSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  userOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userOptionItemSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0284C7',
  },
  userOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  userOptionNameSelected: {
    color: '#0284C7',
  },
  userOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
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
    marginTop: 4,
  },
  resetButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ProfileScreen;
