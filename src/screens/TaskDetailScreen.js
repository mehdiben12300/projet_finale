import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import MapLocationPicker from '../components/MapLocationPicker';
import locationService from '../services/locationService';
import notificationService from '../services/notificationService';
import apiFileService from '../services/apiFileService';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Élevée':
      return { border: '#EF4444', bg: '#FEE2E2', text: '#DC2626' };
    case 'Moyenne':
      return { border: '#F59E0B', bg: '#FEF3C7', text: '#D97706' };
    case 'Faible':
    default:
      return { border: '#10B981', bg: '#DCFCE7', text: '#16A34A' };
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
  const {
    getTask,
    updateTask,
    deleteTask,
    addObserver,
    removeObserver,
    addCommentToTask,
    syncStatus,
    triggerSync,
  } = useTasks();
  const { currentUser } = useAuth();

  const task = getTask(taskId);

  // États pour les observateurs
  const [followerName, setFollowerName] = useState('');
  const [selectedRole, setSelectedRole] = useState('observer'); // 'observer' | 'assignee' | 'responsible'

  // États pour la position GPS
  const [capturingGps, setCapturingGps] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // État commentaire
  const [commentText, setCommentText] = useState('');

  // Modal rapide réglages (bouton roue dentée ⚙️)
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
  const observers = task.observers || [];
  const comments = task.comments || [];

  // --- 1. PIÈCES JOINTES (Photo & Fichier) ---
  const handleAddPhoto = async () => {
    try {
      Alert.alert(
        'Ajouter une photo',
        'Choisissez la source de l’image :',
        [
          {
            text: 'Prendre une photo (Caméra)',
            onPress: async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert('Permission requise', 'Accès caméra nécessaire.');
                return;
              }
              const res = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                await updateTask(task.id, { imageUri: res.assets[0].uri });
              }
            },
          },
          {
            text: 'Choisir dans la galerie',
            onPress: async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                await updateTask(task.id, { imageUri: res.assets[0].uri });
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAddFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        await updateTask(task.id, {
          attachedFile: {
            name: file.name,
            size: file.size || 0,
            uri: file.uri,
            mimeType: file.mimeType || 'application/octet-stream',
          },
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRemovePhoto = async () => {
    await updateTask(task.id, { imageUri: null });
  };

  const handleRemoveFile = async () => {
    await updateTask(task.id, { attachedFile: null });
  };

  const handleOpenFile = async (fileUri) => {
    try {
      await apiFileService.openOrShareFile(fileUri);
    } catch (e) {
      Alert.alert('Fichier', e.message);
    }
  };

  // --- 2. OBSERVATEURS (Suiveurs) ---
  const handleAddObserver = async () => {
    const nameToAdd = followerName.trim() || currentUser.name;
    if (!nameToAdd) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du suiveur.');
      return;
    }

    await addObserver(task.id, {
      name: nameToAdd,
      role: selectedRole,
    });

    setFollowerName('');
  };

  // --- 3. POSITIONS GPS (Capturer) ---
  const handleCaptureGps = async () => {
    setCapturingGps(true);
    try {
      const pos = await locationService.getCurrentLocation();
      const name = await locationService.reverseGeocode(pos.latitude, pos.longitude);

      await updateTask(task.id, {
        locationReminder: {
          latitude: pos.latitude,
          longitude: pos.longitude,
          locationName: name,
          radius: 500,
        },
      });

      if (Platform.OS === 'web') {
        window.alert(`📍 Position GPS capturée :\n${name}`);
      } else {
        Alert.alert('GPS Capturé', `Position enregistrée :\n${name}`);
      }
    } catch (e) {
      Alert.alert('Erreur GPS', 'Impossible de capturer la position actuelle.');
    } finally {
      setCapturingGps(false);
    }
  };

  // --- 4. COMMENTAIRES AVEC NOTIFICATIONS ---
  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')} à ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newComment = {
      id: Date.now().toString(),
      author: currentUser.name,
      text: commentText.trim(),
      createdAt: formattedDate,
    };

    await addCommentToTask(task.id, newComment);

    // Déclencher notification locale
    await notificationService.notifyCommentAdded({
      taskTitle: task.title,
      author: currentUser.name,
      commentText: commentText.trim(),
    });

    setCommentText('');
  };

  // Indicateur de statut de synchronisation en haut à droite
  const renderSyncCircle = () => {
    let color = '#10B981'; // Synced
    if (syncStatus === 'offline') color = '#F59E0B';
    if (syncStatus === 'syncing') color = '#0284C7';

    return (
      <TouchableOpacity onPress={triggerSync} style={styles.syncCircleBtn}>
        <View style={[styles.syncCircleDot, { backgroundColor: color }]} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Barre supérieure : retour < | Titre | statut sync ⚪ */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Détails d'une tâche</Text>
        {renderSyncCircle()}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ======================================================== */}
        {/* CARTE 1 : TÂCHE PRINCIPALE AVEC BOUTON ROUE DENTÉE ⚙️    */}
        {/* ======================================================== */}
        <View style={styles.mainTaskCard}>
          <View style={[styles.accentLeftBar, { backgroundColor: priorityColor.border }]} />

          <View style={styles.taskCardBody}>
            {/* Titre */}
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
            <Text
              style={[
                styles.descriptionText,
                !task.description && styles.emptyItalicText,
              ]}
            >
              {task.description || 'Aucune description fournie.'}
            </Text>

            {/* Date de création */}
            <View style={styles.creationDateRow}>
              <Ionicons name="calendar-outline" size={15} color="#94A3B8" />
              <Text style={styles.creationDateText}>
                Date de création: {task.createdAt}
              </Text>
            </View>
          </View>

          {/* Bouton flottant bleu roue dentée ⚙️ sur le coin inférieur droit */}
          <TouchableOpacity
            style={styles.gearFloatingBtn}
            onPress={() => setShowSettingsModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* CARTE 2 : PIÈCES JOINTES (+ Fichier / 📷 Photo)          */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="attach" size={20} color="#0284C7" style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={styles.cardSectionTitle}>Pièces jointes</Text>
            </View>

            <View style={styles.headerPillButtons}>
              <TouchableOpacity
                style={styles.pillActionBtn}
                onPress={handleAddFile}
                activeOpacity={0.8}
              >
                <Text style={styles.pillActionBtnText}>+ Fichier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pillActionBtn}
                onPress={handleAddPhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.pillActionBtnText}>Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenu des pièces jointes */}
          {!task.imageUri && !task.attachedFile && !task.apiFile ? (
            <Text style={styles.cardEmptyItalicText}>
              Aucun fichier. Ajoutez un document ou une photo (10 Mo max).
            </Text>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {/* Photo */}
              {task.imageUri && (
                <View style={styles.attachmentItem}>
                  <Image source={{ uri: task.imageUri }} style={styles.attachmentThumb} />
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={styles.attachmentName}>Photo attachée</Text>
                    <Text style={styles.attachmentSub}>Capture caméra / galerie</Text>
                  </View>
                  <TouchableOpacity onPress={handleRemovePhoto}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Fichier joint */}
              {task.attachedFile && (
                <View style={styles.attachmentItem}>
                  <Ionicons name="document-text" size={24} color="#0284C7" />
                  <TouchableOpacity
                    style={{ flex: 1, marginHorizontal: 8 }}
                    onPress={() => handleOpenFile(task.attachedFile.uri)}
                  >
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {task.attachedFile.name}
                    </Text>
                    <Text style={styles.attachmentSub}>
                      {(task.attachedFile.size / 1024).toFixed(1)} Ko • Ouvrir
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRemoveFile}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* CARTE 3 : OBSERVATEURS (+ Ajouter / observer / assignee) */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="people-outline" size={20} color="#0284C7" />
              <Text style={styles.cardSectionTitle}>Observateurs</Text>
            </View>
          </View>

          {observers.length === 0 && (
            <Text style={styles.cardEmptyItalicText}>
              Aucun observateur. Ajoutez un suiveur.
            </Text>
          )}

          {/* Ligne saisie : Nom du suiveur + Bouton Ajouter */}
          <View style={styles.followerInputRow}>
            <TextInput
              style={styles.followerTextInput}
              placeholder="Nom du suiveur"
              placeholderTextColor="#94A3B8"
              value={followerName}
              onChangeText={setFollowerName}
            />
            <TouchableOpacity
              style={styles.addFollowerBtn}
              onPress={handleAddObserver}
              activeOpacity={0.8}
            >
              <Text style={styles.addFollowerBtnText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {/* Rôles en dessous : observer | assignee | responsible */}
          <View style={styles.roleChipsRow}>
            {[
              { id: 'observer', label: 'observer' },
              { id: 'assignee', label: 'assignee' },
              { id: 'responsible', label: 'responsible' },
            ].map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                  onPress={() => setSelectedRole(role.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Liste des observateurs déjà ajoutés */}
          {observers.length > 0 && (
            <View style={styles.observersChipsList}>
              {observers.map((obs) => (
                <View key={obs.id || obs.name} style={styles.observerBadgeItem}>
                  <Ionicons name="person-circle" size={16} color="#0284C7" />
                  <Text style={styles.observerBadgeName}>{obs.name}</Text>
                  <View style={styles.roleSubBadge}>
                    <Text style={styles.roleSubBadgeText}>{obs.role || 'observer'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeObserver(task.id, obs.id || obs.name)}>
                    <Ionicons name="close" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* CARTE 4 : POSITIONS (🎯 Capturer)                        */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="location-outline" size={20} color="#0284C7" />
              <Text style={styles.cardSectionTitle}>Positions</Text>
            </View>

            <TouchableOpacity
              style={styles.pillActionBtn}
              onPress={handleCaptureGps}
              disabled={capturingGps}
              activeOpacity={0.8}
            >
              {capturingGps ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="locate" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.pillActionBtnText}>Capturer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {!task.locationReminder ? (
            <Text style={styles.cardEmptyItalicText}>
              Aucune position. Capturez la position actuelle (GPS).
            </Text>
          ) : (
            <View style={styles.locationCapturedBlock}>
              <Ionicons name="pin" size={20} color="#DC2626" />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.locationNameText}>
                  {task.locationReminder.locationName || 'Position GPS'}
                </Text>
                <Text style={styles.locationCoordsText}>
                  Lat: {task.locationReminder.latitude.toFixed(4)} | Lon: {task.locationReminder.longitude.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => setShowMapModal(true)}
              >
                <Ionicons name="map" size={16} color="#0284C7" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* CARTE 5 : COMMENTAIRES ET NOTIFICATIONS                  */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="chatbubbles-outline" size={20} color="#0284C7" />
              <Text style={styles.cardSectionTitle}>Discussions ({comments.length})</Text>
            </View>
          </View>

          {comments.map((c) => (
            <View key={c.id} style={styles.commentItemBox}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.author}</Text>
                <Text style={styles.commentTime}>{c.createdAt}</Text>
              </View>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}

          {/* Saisie commentaire */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentTextInput}
              placeholder={`Commenter en tant que ${currentUser.name}...`}
              placeholderTextColor="#94A3B8"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity
              style={styles.commentSendBtn}
              onPress={handlePostComment}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ======================================================== */}
        {/* BOUTON MODIFIER EN BAS (Comme sur la capture)            */}
        {/* ======================================================== */}
        <TouchableOpacity
          style={styles.bottomModifyButton}
          onPress={() => navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.bottomModifyButtonText}>Modifier</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Carte OpenStreetMap */}
      <MapLocationPicker
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLocation={task.locationReminder}
        onSelectLocation={async (loc) => {
          await updateTask(task.id, { locationReminder: loc });
          setShowMapModal(false);
        }}
      />

      {/* Modal Réglages Rapides (Roue dentée ⚙️) */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Options de la tâche</Text>
            <TouchableOpacity
              style={styles.modalAction}
              onPress={async () => {
                const newStatus = task.status === 'Terminée' ? 'À faire' : 'Terminée';
                await updateTask(task.id, { status: newStatus });
                setShowSettingsModal(false);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#0284C7" />
              <Text style={styles.modalActionText}>
                Marquer comme {task.status === 'Terminée' ? 'À faire' : 'Terminée'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => {
                setShowSettingsModal(false);
                navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id });
              }}
            >
              <Ionicons name="create-outline" size={20} color="#0284C7" />
              <Text style={styles.modalActionText}>Modifier toutes les informations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAction, { borderTopColor: '#FEE2E2', borderTopWidth: 1 }]}
              onPress={async () => {
                setShowSettingsModal(false);
                await deleteTask(task.id);
                navigation.navigate('MainTabs', { screen: 'TasksTab' });
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.modalActionText, { color: '#DC2626' }]}>
                Supprimer la tâche
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 2,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  syncCircleBtn: {
    padding: 6,
  },
  syncCircleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },

  // 1. CARTE TÂCHE PRINCIPALE
  mainTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: 'row',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  accentLeftBar: {
    width: 6,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  taskCardBody: {
    flex: 1,
    padding: 16,
    paddingRight: 50, // Laisse de l'espace pour le bouton roue dentée flottant
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyItalicText: {
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  creationDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creationDateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  gearFloatingBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },

  // 2. CARTES DE SECTIONS
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerPillButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  pillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  cardEmptyItalicText: {
    fontStyle: 'italic',
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },

  // Pièces jointes éléments
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentSub: {
    fontSize: 11,
    color: '#64748B',
  },

  // Observateurs
  followerInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  followerTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  addFollowerBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFollowerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  roleChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  roleChipSelected: {
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  roleChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  roleChipTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  observersChipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  observerBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  observerBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleSubBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleSubBadgeText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '700',
  },

  // Positions
  locationCapturedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  locationNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  locationCoordsText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  openMapBtn: {
    padding: 6,
  },

  // Commentaires
  commentItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  commentTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  commentSendBtn: {
    backgroundColor: '#0284C7',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 6. BOUTON MODIFIER EN BAS
  bottomModifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomModifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal réglages
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
