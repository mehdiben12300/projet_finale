import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import CommentSection from '../components/CommentSection';
import MapLocationPicker from '../components/MapLocationPicker';
import locationService from '../services/locationService';
import notificationService from '../services/notificationService';
import apiFileService from '../services/apiFileService';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Élevée':
      return { bg: '#FEE2E2', text: '#DC2626' };
    case 'Moyenne':
      return { bg: '#FEF3C7', text: '#D97706' };
    case 'Faible':
    default:
      return { bg: '#DCFCE7', text: '#16A34A' };
  }
};

const getStatusColor = (status) => {
  if (status === 'Terminée' || status === 'Terminées') {
    return { bg: '#DCFCE7', text: '#16A34A' };
  }
  return { bg: '#E0F2FE', text: '#0284C7' };
};

export const TaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { getTask, deleteTask, addCommentToTask } = useTasks();

  const [checkingGps, setCheckingGps] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const task = getTask(taskId);

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Tâche introuvable.</Text>
          <TouchableOpacity
            style={styles.backButtonSimple}
            onPress={() => navigation.navigate('MainTabs', { screen: 'TasksTab' })}
          >
            <Text style={styles.backButtonSimpleText}>Retour à la liste</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = getPriorityColor(task.priority);
  const statusColor = getStatusColor(task.status);

  // Vérifier la proximité géographique GPS actuelle
  const handleCheckProximity = async () => {
    if (!task.locationReminder) return;

    setCheckingGps(true);
    try {
      const currentPos = await locationService.getCurrentLocation();
      const result = locationService.checkProximity(
        currentPos,
        task.locationReminder,
        task.locationReminder.radius || 500
      );

      const msg = `Vous êtes actuellement à environ ${result.distanceMeters} mètres du lieu prévu (${task.locationReminder.locationName}).\n\n${
        result.isNearby
          ? '🎉 Vous êtes arrivé dans la zone de rappel (moins de 500m) !'
          : 'Vous êtes encore éloigné de la zone.'
      }`;

      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Vérification Proximité GPS', msg);
      }

      if (result.isNearby) {
        await notificationService.notifyLocationProximity({
          taskTitle: task.title,
          distanceMeters: result.distanceMeters,
        });
      }
    } catch (e) {
      Alert.alert('Erreur GPS', 'Impossible de récupérer la position actuelle.');
    } finally {
      setCheckingGps(false);
    }
  };

  const handleOpenFile = async (fileUri) => {
    try {
      await apiFileService.openOrShareFile(fileUri);
    } catch (e) {
      Alert.alert('Fichier', e.message);
    }
  };

  const performDelete = async () => {
    await deleteTask(task.id);
    navigation.navigate('MainTabs', { screen: 'TasksTab' });
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la tâche',
        'Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Barre supérieure */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
          <Text style={styles.topBarTitle}>Détails de la tâche</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id })}
        >
          <Ionicons name="create-outline" size={22} color="#0284C7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Carte principale */}
        <View style={styles.detailCard}>
          <Text style={styles.taskTitle}>{task.title}</Text>

          {/* Badges Priorité et Statut */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: priorityColor.bg }]}>
              <Text style={[styles.badgeText, { color: priorityColor.text }]}>
                {task.priority}
              </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.badgeText, { color: statusColor.text }]}>
                {task.status}
              </Text>
            </View>
          </View>

          {/* Description */}
          {task.description ? (
            <Text style={styles.taskDescription}>{task.description}</Text>
          ) : null}

          {/* Photo attachée (Caméra) */}
          {task.imageUri && (
            <View style={styles.attachmentBlock}>
              <Text style={styles.attachmentLabel}>📷 Photo attachée :</Text>
              <Image source={{ uri: task.imageUri }} style={styles.fullImage} />
            </View>
          )}

          {/* Fichier joint local */}
          {task.attachedFile && (
            <View style={styles.attachmentBlock}>
              <Text style={styles.attachmentLabel}>📁 Fichier joint :</Text>
              <TouchableOpacity
                style={styles.fileRow}
                onPress={() => handleOpenFile(task.attachedFile.uri)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={24} color="#6366F1" />
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.fileName}>{task.attachedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {(task.attachedFile.size / 1024).toFixed(1)} Ko
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>
          )}

          {/* Fichier récupéré via API */}
          {task.apiFile && (
            <View style={styles.attachmentBlock}>
              <Text style={styles.attachmentLabel}>🌐 Document récupéré depuis l'API :</Text>
              <TouchableOpacity
                style={[styles.fileRow, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}
                onPress={() => handleOpenFile(task.apiFile.downloadedUri || task.apiFile.url)}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-done" size={24} color="#059669" />
                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.fileName}>{task.apiFile.name}</Text>
                  <Text style={styles.fileSize}>Téléchargé le {task.apiFile.downloadedAt}</Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#059669" />
              </TouchableOpacity>
            </View>
          )}

          {/* Rappel Date & Heure */}
          {task.reminderDate && (
            <View style={styles.attachmentBlock}>
              <Text style={styles.attachmentLabel}>⏰ Rappel programmé :</Text>
              <View style={styles.reminderCard}>
                <Ionicons name="alarm" size={22} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.reminderTimeText}>
                    {new Date(task.reminderDate).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.reminderSubText}>Notification locale automatique</Text>
                </View>
              </View>
            </View>
          )}

          {/* Rappel par Position Géographique (OpenStreetMap) */}
          {task.locationReminder && (
            <View style={styles.attachmentBlock}>
              <Text style={styles.attachmentLabel}>📍 Rappel géographique (OpenStreetMap) :</Text>
              <View style={styles.locationCard}>
                <Ionicons name="location" size={22} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.locationTitleText}>
                    {task.locationReminder.locationName}
                  </Text>
                  <Text style={styles.locationCoordsText}>
                    Lat: {task.locationReminder.latitude.toFixed(4)}, Lon: {task.locationReminder.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>

              <View style={styles.gpsButtonsRow}>
                <TouchableOpacity
                  style={styles.gpsActionBtn}
                  onPress={() => setShowMapModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color="#0284C7" />
                  <Text style={styles.gpsActionBtnText}>Voir la carte</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gpsActionBtn, { borderColor: '#DC2626' }]}
                  onPress={handleCheckProximity}
                  disabled={checkingGps}
                  activeOpacity={0.8}
                >
                  {checkingGps ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <Ionicons name="navigate-outline" size={16} color="#DC2626" />
                      <Text style={[styles.gpsActionBtnText, { color: '#DC2626' }]}>
                        Tester ma proximité GPS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Date de création */}
          <View style={styles.dateBlock}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.dateText}>Date de création : {task.createdAt}</Text>
          </View>
        </View>

        {/* Section 6 : Observateurs & Commentaires */}
        <CommentSection
          task={task}
          onAddComment={(newComment) => addCommentToTask(task.id, newComment)}
        />

        {/* Boutons d'action */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.editBtnText}>Modifier la tâche</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.deleteBtnText}>Supprimer la tâche</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal carte OpenStreetMap en consultation */}
      {task.locationReminder && (
        <MapLocationPicker
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          initialLocation={task.locationReminder}
          onSelectLocation={() => setShowMapModal(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 14,
  },
  attachmentBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fullImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  fileSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reminderTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  reminderSubText: {
    fontSize: 11,
    color: '#92400E',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  locationTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  gpsButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  gpsActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 8,
  },
  gpsActionBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionsContainer: {
    marginTop: 18,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editBtn: {
    backgroundColor: '#0284C7',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 8,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  backButtonSimple: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonSimpleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TaskDetailScreen;
