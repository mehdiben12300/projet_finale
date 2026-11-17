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
    toggleAllowedCommenter,
    addCommentToTask,
    syncStatus,
    triggerSync,
  } = useTasks();
  const { currentUser, availableUsers, switchUser } = useAuth();

  const task = getTask(taskId);

  // États pour les observateurs
  const [followerName, setFollowerName] = useState('');
  const [selectedRole, setSelectedRole] = useState('observer'); // 'observer' | 'assignee' | 'responsible'

  // États pour la position GPS
  const [capturingGps, setCapturingGps] = useState(false);
  const [checkingProximity, setCheckingProximity] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // États pour pièces jointes (Photo & Fichiers)
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // États pour rappels date & heure
  const [showReminderModal, setShowReminderModal] = useState(false);

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
  const allowedCommenters = task.allowedCommenters || ['Mehdi', 'Professeur'];
  const isAllowedToComment =
    allowedCommenters.includes(currentUser.name) ||
    (task.author && task.author === currentUser.name);

  // --- RÔLES ET DROITS D'ASSIGNATION ---
  // 1. Est créateur de la tâche :
  const isAuthor =
    task.author && currentUser.name && task.author.toLowerCase() === currentUser.name.toLowerCase();

  // 2. Est assigné ou responsable dans la liste des observateurs :
  const userObserverRecord = observers.find(
    (obs) => obs.name && obs.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const isAssigneeOrResponsible =
    userObserverRecord &&
    (userObserverRecord.role === 'assignee' || userObserverRecord.role === 'responsible');

  // Droit de modifier la tâche et d'ajouter/supprimer des fichiers :
  const canEditTask = isAuthor || isAssigneeOrResponsible;

  // --- 1. PIÈCES JOINTES (Photo & Fichier) ---
  const handleLaunchCamera = async () => {
    setShowPhotoModal(false);
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés (assignee ou responsible) ou le créateur peuvent ajouter des photos.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'web') {
          window.alert("Permission caméra requise.");
        } else {
          Alert.alert('Permission requise', 'Accès caméra nécessaire.');
        }
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        await updateTask(task.id, { imageUri: res.assets[0].uri });
      }
    } catch (e) {
      console.warn('Erreur caméra:', e);
    }
  };

  const handleLaunchGallery = async () => {
    setShowPhotoModal(false);
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés (assignee ou responsible) ou le créateur peuvent ajouter des photos.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        await updateTask(task.id, { imageUri: res.assets[0].uri });
      }
    } catch (e) {
      console.warn('Erreur galerie:', e);
    }
  };

  const handleAddPhoto = () => {
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés à cette tâche ont le droit d'ajouter des photos.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
    setShowPhotoModal(true);
  };

  const handleAddFile = async () => {
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés à cette tâche ont le droit d'ajouter des fichiers.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
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
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés peuvent supprimer des pièces jointes.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
    await updateTask(task.id, { imageUri: null });
  };

  const handleRemoveFile = async () => {
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés peuvent supprimer des pièces jointes.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
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
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés ou le créateur peuvent ajouter des observateurs.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }

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
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés ou le créateur peuvent modifier la position géographique.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }

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

  // --- VÉRIFICATION & SIMULATION DE PROXIMITÉ GPS ---
  const handleCheckProximity = async () => {
    if (!task.locationReminder) return;
    setCheckingProximity(true);
    try {
      const currentPos = await locationService.getCurrentLocation();
      const { isNearby, distanceMeters } = locationService.checkProximity(
        currentPos,
        task.locationReminder,
        500
      );

      if (isNearby) {
        await notificationService.notifyLocationArrival({
          taskTitle: task.title,
          locationName: task.locationReminder.locationName,
        });
      } else {
        const msg = `Vous êtes à ${distanceMeters} mètres du lieu prévu (${task.locationReminder.locationName}). Le rappel automatique se déclenchera à moins de 500m.`;
        if (Platform.OS === 'web') {
          window.alert(`📡 Position GPS :\n${msg}`);
        } else {
          Alert.alert('Vérification GPS', msg);
        }
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Erreur', 'Impossible de vérifier la position GPS.');
    } finally {
      setCheckingProximity(false);
    }
  };

  const handleSimulateArrival = async () => {
    if (!task.locationReminder) return;
    await notificationService.notifyLocationArrival({
      taskTitle: task.title,
      locationName: task.locationReminder.locationName,
    });
  };

  // --- PROGRAMMATION DE RAPPEL DATE & HEURE ---
  const handleSetReminderPreset = async (hoursFromNow) => {
    if (!canEditTask) {
      const msg = "Action refusée : Seuls les membres assignés peuvent reprogrammer le rappel de cette tâche.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Accès refusé', msg);
      return;
    }
    const reminderTime = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    await updateTask(task.id, { reminderDate: reminderTime.toISOString() });
    setShowReminderModal(false);
    if (Platform.OS === 'web') {
      window.alert(`⏰ Rappel programmé pour : ${reminderTime.toLocaleString('fr-FR')}`);
    } else {
      Alert.alert('Rappel programmé', `Rappel fixé au : ${reminderTime.toLocaleString('fr-FR')}`);
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

            {/* Statut d'assignation de l'utilisateur connecté */}
            <View style={styles.userRoleOnTaskRow}>
              <Ionicons
                name={canEditTask ? 'shield-checkmark' : 'lock-closed'}
                size={13}
                color={canEditTask ? '#0284C7' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.userRoleOnTaskText,
                  canEditTask && { color: '#0284C7', fontWeight: '700' },
                ]}
              >
                {isAuthor
                  ? 'Créateur (Assigné - Droits complets)'
                  : isAssigneeOrResponsible
                  ? `Assigné (${userObserverRecord.role} - Droits complets)`
                  : userObserverRecord
                  ? 'Observateur (Lecture seule)'
                  : 'Non assigné (Lecture seule)'}
              </Text>
            </View>
          </View>

          {/* Bouton flottant bleu roue dentée ⚙️ (visible uniquement pour les membres assignés) */}
          {canEditTask && (
            <TouchableOpacity
              style={styles.gearFloatingBtn}
              onPress={() => setShowSettingsModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
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

          {/* SÉLECTION DES UTILISATEURS AUTORISÉS À COMMENTER CETTE TÂCHE */}
          <View style={styles.allowedUsersSection}>
            <View style={styles.subSectionTitleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0284C7" />
              <Text style={styles.subSectionTitle}>
                Autorisés à commenter cette tâche :
              </Text>
            </View>
            <View style={styles.allowedUserChipsRow}>
              {availableUsers.map((user) => {
                const isPermitted = allowedCommenters.includes(user.name);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.allowedUserChip, isPermitted && styles.allowedUserChipActive]}
                    onPress={() => toggleAllowedCommenter(task.id, user.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, marginRight: 4 }}>{user.avatar}</Text>
                    <Text
                      style={[
                        styles.allowedUserChipText,
                        isPermitted && styles.allowedUserChipTextActive,
                      ]}
                    >
                      {isPermitted ? '✓ ' : ''}{user.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ======================================================== */}
        {/* CARTE 4 : POSITIONS (🗺️ Carte & 🎯 Capturer)             */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="location-outline" size={20} color="#0284C7" />
              <Text style={styles.cardSectionTitle}>Positions</Text>
            </View>

            <View style={styles.headerPillButtons}>
              <TouchableOpacity
                style={styles.pillActionBtn}
                onPress={() => setShowMapModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="map" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.pillActionBtnText}>Carte</Text>
              </TouchableOpacity>

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
          </View>

          {!task.locationReminder ? (
            <Text style={styles.cardEmptyItalicText}>
              Aucune position. Capturez la position actuelle (GPS) ou sélectionnez sur la carte.
            </Text>
          ) : (
            <View>
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
                  <Ionicons name="map" size={18} color="#0284C7" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 4, marginLeft: 4 }}
                  onPress={async () => {
                    await updateTask(task.id, { locationReminder: null });
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>

              {/* Boutons de test de détection de proximité */}
              <View style={styles.proximityButtonsRow}>
                <TouchableOpacity
                  style={styles.checkProximityBtn}
                  onPress={handleCheckProximity}
                  disabled={checkingProximity}
                  activeOpacity={0.8}
                >
                  {checkingProximity ? (
                    <ActivityIndicator size="small" color="#0284C7" />
                  ) : (
                    <>
                      <Ionicons name="radio" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.checkProximityBtnText}>Vérifier GPS</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.simulateArrivalBtn}
                  onPress={handleSimulateArrival}
                  activeOpacity={0.8}
                >
                  <Ionicons name="notifications-outline" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={styles.simulateArrivalBtnText}>Simuler arrivée (Alerte)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* CARTE 5 : RAPPEL DATE & HEURE                            */}
        {/* ======================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWithIcon}>
              <Ionicons name="alarm-outline" size={20} color="#D97706" />
              <Text style={styles.cardSectionTitle}>Rappel Date & Heure</Text>
            </View>

            <TouchableOpacity
              style={[styles.pillActionBtn, { backgroundColor: '#D97706' }]}
              onPress={() => setShowReminderModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.pillActionBtnText}>
                {task.reminderDate ? 'Modifier' : '+ Définir'}
              </Text>
            </TouchableOpacity>
          </View>

          {task.reminderDate ? (
            <View style={styles.reminderActiveBox}>
              <Ionicons name="notifications" size={20} color="#D97706" />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.reminderDateText}>
                  ⏰ Prévu le : {new Date(task.reminderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {new Date(task.reminderDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.reminderSubText}>Notification push programmée sur cet appareil</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await updateTask(task.id, { reminderDate: null });
                }}
              >
                <Ionicons name="close-circle" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.cardEmptyItalicText}>
              Aucun rappel programmé. Définissez une date et une heure de notification.
            </Text>
          )}

          {/* Bouton de test direct de la notification */}
          <TouchableOpacity
            style={styles.testNotificationBtn}
            onPress={async () => {
              await notificationService.triggerTestReminder(task.title, 3);
              if (Platform.OS === 'web') {
                // géré dans triggerTestReminder
              } else {
                Alert.alert('Rappel lancé', 'La notification de rappel sonnera dans 3 secondes !');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-active" size={16} color="#D97706" style={{ marginRight: 6 }} />
            <Text style={styles.testNotificationBtnText}>Tester la notification de rappel (3s)</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* CARTE 6 : COMMENTAIRES ET NOTIFICATIONS                  */}
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

          {/* Saisie commentaire soumise à autorisation */}
          {isAllowedToComment ? (
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
          ) : (
            <View style={styles.restrictedCommentBox}>
              <Ionicons name="lock-closed" size={20} color="#DC2626" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.restrictedTitle}>Commentaires restreints</Text>
                <Text style={styles.restrictedText}>
                  Seuls les utilisateurs autorisés ({allowedCommenters.join(', ')}) peuvent commenter cette tâche. Vous êtes connecté en tant que "{currentUser.name}".
                </Text>
              </View>
              {allowedCommenters.length > 0 && (
                <TouchableOpacity
                  style={styles.quickSwitchBtn}
                  onPress={() => {
                    const targetUser = availableUsers.find((u) => allowedCommenters.includes(u.name));
                    if (targetUser) switchUser(targetUser);
                  }}
                >
                  <Text style={styles.quickSwitchBtnText}>Changer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* BOUTON MODIFIER EN BAS (Comme sur la capture)            */}
        {/* ======================================================== */}
        <TouchableOpacity
          style={[
            styles.bottomModifyButton,
            !canEditTask && styles.bottomModifyButtonDisabled,
          ]}
          onPress={() => {
            if (!canEditTask) {
              const msg =
                "Modification refusée : Vous n'êtes pas assigné à cette tâche. Seuls le créateur et les membres assignés (assignee ou responsible) peuvent la modifier.";
              if (Platform.OS === 'web') window.alert(msg);
              else Alert.alert('Modification refusée', msg);
              return;
            }
            navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id });
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={canEditTask ? 'create-outline' : 'lock-closed'}
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.bottomModifyButtonText}>
            {canEditTask ? 'Modifier' : 'Lecture seule (Non assigné)'}
          </Text>
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

      {/* Modal Choix Source Photo (Caméra vs Galerie) */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ajouter une photo 📷</Text>
            <Text style={styles.modalSub}>Choisissez la source de l’image :</Text>

            <TouchableOpacity style={styles.modalAction} onPress={handleLaunchCamera}>
              <Ionicons name="camera" size={22} color="#0284C7" />
              <Text style={styles.modalActionText}>Prendre une photo (Caméra)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalAction} onPress={handleLaunchGallery}>
              <Ionicons name="images" size={22} color="#0284C7" />
              <Text style={styles.modalActionText}>Choisir dans la galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Programmation Rappel Date & Heure */}
      <Modal visible={showReminderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Programmer un rappel ⏰</Text>
            <Text style={styles.modalSub}>Choisissez quand recevoir la notification :</Text>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => handleSetReminderPreset(1)}
            >
              <Ionicons name="time-outline" size={20} color="#D97706" />
              <Text style={styles.modalActionText}>Dans 1 heure</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => handleSetReminderPreset(24)}
            >
              <Ionicons name="sunny-outline" size={20} color="#D97706" />
              <Text style={styles.modalActionText}>Demain (+24h)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAction}
              onPress={() => handleSetReminderPreset(48)}
            >
              <Ionicons name="calendar-outline" size={20} color="#D97706" />
              <Text style={styles.modalActionText}>Dans 2 jours (+48h)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAction, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
              onPress={async () => {
                setShowReminderModal(false);
                await notificationService.triggerTestReminder(task.title, 5);
                if (Platform.OS === 'web') {
                  // Handled
                } else {
                  Alert.alert('Rappel lancé', 'La notification sonnera dans 5 secondes !');
                }
              }}
            >
              <Ionicons name="flash-outline" size={20} color="#B45309" />
              <Text style={[styles.modalActionText, { color: '#B45309', fontWeight: '700' }]}>
                Tester en direct (dans 5 secondes)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowReminderModal(false)}
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
  bottomModifyButtonDisabled: {
    backgroundColor: '#64748B',
    elevation: 0,
    shadowOpacity: 0,
  },
  userRoleOnTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  userRoleOnTaskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
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
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  allowedUsersSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  allowedUserChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allowedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  allowedUserChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  allowedUserChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  allowedUserChipTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  proximityButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  checkProximityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkProximityBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  simulateArrivalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 8,
    borderRadius: 8,
  },
  simulateArrivalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  reminderActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  reminderDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  reminderSubText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  testNotificationBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  restrictedCommentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  restrictedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  restrictedText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  quickSwitchBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  quickSwitchBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
