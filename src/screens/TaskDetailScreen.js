import React, { useState, useEffect } from 'react';
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
  const { currentUser, availableUsers } = useAuth();

  const task = getTask(taskId);

  // États pour les observateurs / assignés
  const [followerName, setFollowerName] = useState('');
  const [selectedRole, setSelectedRole] = useState('assignee'); // Tous les membres sont 'assignee'

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

  // Statut de proximité GPS
  const [proximityStatus, setProximityStatus] = useState(null);

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

  // --- 3 RÔLES STRICTS DU SYSTÈME (Créateur / Assigné / Non-assigné) ---
  // 1. Est le créateur / auteur de la tâche (Possède tous les droits réels) :
  const isCreator = Boolean(
    task.author &&
      currentUser &&
      currentUser.name &&
      task.author.toLowerCase() === currentUser.name.toLowerCase()
  );

  // 2. Est un collaborateur assigné à cette tâche :
  const isAssignee = Boolean(
    currentUser &&
      currentUser.name &&
      observers.some(
        (obs) => obs.name && obs.name.toLowerCase() === currentUser.name.toLowerCase()
      )
  );

  // 3. Simple visiteur non-assigné :
  const isNonAssignee = !isCreator && !isAssignee;

  // L'auteur et les membres assignés ont le droit de participer à la discussion :
  const canComment = isCreator || isAssignee;

  // Helper pour afficher le refus d'autorisation
  const notifyPermissionDenied = (actionName, requiredRole = `le créateur (${task.author})`) => {
    const msg = `Action refusée : Seul ${requiredRole} a le droit de ${actionName}. Vous êtes en mode consultation seule.`;
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Accès refusé', msg);
    }
  };

  // --- DÉTECTION GPS AUTOMATIQUE POUR L'ASSIGNÉ ---
  // Dès que l'assigné ouvre la tâche, l'application vérifie sa position par rapport au lieu fixé par le créateur
  useEffect(() => {
    if (isAssignee && task && task.locationReminder) {
      const detectArrivalOnLoad = async () => {
        try {
          const currentPos = await locationService.getCurrentLocation();
          const { isNearby, distanceMeters } = locationService.checkProximity(
            currentPos,
            task.locationReminder,
            500
          );
          setProximityStatus({ isNearby, distanceMeters });

          // Si l'assigné est dans le rayon de 500m, déclencher l'alerte d'arrivée
          if (isNearby) {
            await notificationService.notifyLocationArrival({
              taskTitle: task.title,
              locationName: task.locationReminder.locationName,
            });
          }
        } catch (e) {
          console.log('Vérification GPS silencieuse:', e.message);
        }
      };
      detectArrivalOnLoad();
    }
  }, [task?.id, isAssignee]);

  // --- 1. PIÈCES JOINTES (Photo & Fichier) ---
  const handleLaunchCamera = async () => {
    setShowPhotoModal(false);
    if (!isCreator) {
      notifyPermissionDenied('prendre des photos');
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'web') {
          window.alert('Permission caméra requise.');
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
    if (!isCreator) {
      notifyPermissionDenied('ajouter des photos');
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
    if (!isCreator) {
      notifyPermissionDenied('ajouter des photos');
      return;
    }
    setShowPhotoModal(true);
  };

  const handleAddFile = async () => {
    if (!isCreator) {
      notifyPermissionDenied('téléverser des fichiers');
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
    if (!isCreator) {
      notifyPermissionDenied('supprimer les photos');
      return;
    }
    await updateTask(task.id, { imageUri: null });
  };

  const handleRemoveFile = async () => {
    if (!isCreator) {
      notifyPermissionDenied('supprimer les fichiers joints');
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

  // --- 2. ASSIGNATION DES COLLABORATEURS ---
  const handleAddObserver = async () => {
    if (!isCreator) {
      notifyPermissionDenied('assigner des collaborateurs');
      return;
    }

    const nameToAdd = followerName.trim();
    if (!nameToAdd) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du collaborateur.');
      return;
    }

    await addObserver(task.id, {
      name: nameToAdd,
      role: 'assignee', // Rôle unifié : Assigné
    });

    setFollowerName('');
  };

  const handleRemoveObserver = async (obsId) => {
    if (!isCreator) {
      notifyPermissionDenied('retirer des collaborateurs assignés');
      return;
    }
    await removeObserver(task.id, obsId);
  };

  // --- 3. POSITIONS GPS (Capturer) ---
  const handleCaptureGps = async () => {
    if (!isCreator) {
      notifyPermissionDenied('définir ou capturer la position GPS');
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

  const handleRemoveLocation = async () => {
    if (!isCreator) {
      notifyPermissionDenied('supprimer la position GPS');
      return;
    }
    await updateTask(task.id, { locationReminder: null });
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

      setProximityStatus({ isNearby, distanceMeters });

      if (isNearby) {
        await notificationService.notifyLocationArrival({
          taskTitle: task.title,
          locationName: task.locationReminder.locationName,
        });
      } else {
        const msg = `Vous êtes à ${distanceMeters} mètres du lieu prévu (${task.locationReminder.locationName}). L'alerte automatique d'arrivée se déclenchera à moins de 500m.`;
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
  const handleOpenReminderModal = () => {
    if (!isCreator) {
      notifyPermissionDenied('programmer ou modifier les rappels de notification');
      return;
    }
    setShowReminderModal(true);
  };

  const handleSetReminderPreset = async (hoursFromNow) => {
    if (!isCreator) {
      notifyPermissionDenied('programmer des rappels');
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

  const handleRemoveReminder = async () => {
    if (!isCreator) {
      notifyPermissionDenied('annuler le rappel');
      return;
    }
    await updateTask(task.id, { reminderDate: null });
  };

  // --- 4. COMMENTAIRES AVEC NOTIFICATIONS ---
  const handlePostComment = async () => {
    if (!commentText.trim()) return;

    if (isNonAssignee) {
      notifyPermissionDenied('publier un commentaire', 'les collaborateurs assignés');
      return;
    }

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

  // Bouton Modifier en bas
  const handleBottomModify = () => {
    if (!isCreator) {
      notifyPermissionDenied('modifier cette tâche');
      return;
    }
    navigation.navigate('TaskForm', { mode: 'edit', taskId: task.id });
  };

  // Bouton roue dentée ⚙️
  const handleGearClick = () => {
    if (!isCreator) {
      notifyPermissionDenied('modifier les réglages de cette tâche');
      return;
    }
    setShowSettingsModal(true);
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
        {/* CARTE 1 : TÂCHE PRINCIPALE AVEC BOUTON ROUE DENTÉE ⚙️     */}
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

            {/* Statut strict de l'utilisateur sur cette tâche */}
            <View style={styles.userRoleOnTaskRow}>
              <Ionicons
                name={isCreator ? 'key' : isAssignee ? 'chatbubbles' : 'eye'}
                size={14}
                color={isCreator ? '#0284C7' : isAssignee ? '#16A34A' : '#64748B'}
              />
              <Text
                style={[
                  styles.userRoleOnTaskText,
                  isCreator && { color: '#0284C7', fontWeight: '700' },
                  isAssignee && { color: '#16A34A', fontWeight: '700' },
                  isNonAssignee && { color: '#64748B', fontWeight: '600' },
                ]}
              >
                {isCreator
                  ? '👑 Vous êtes le créateur (Droits complets : modification activée)'
                  : isAssignee
                  ? `🤝 Vous êtes assigné(e) à cette tâche (Discussion active • Fichiers protégés)`
                  : `👁️ Non-assigné (Consultation seule • Discussion fermée)`}
              </Text>
            </View>
          </View>

          {/* Bouton flottant bleu roue dentée ⚙️ (Toujours visible comme sur la capture !) */}
          <TouchableOpacity
            style={styles.gearFloatingBtn}
            onPress={handleGearClick}
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

            {/* Boutons visibles exactement comme sur la capture ! */}
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

              {/* Fichier API */}
              {task.apiFile && (
                <View style={styles.attachmentItem}>
                  <Ionicons name="cloud-download" size={24} color="#059669" />
                  <TouchableOpacity
                    style={{ flex: 1, marginHorizontal: 8 }}
                    onPress={() => handleOpenFile(task.apiFile.url)}
                  >
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {task.apiFile.name}
                    </Text>
                    <Text style={styles.attachmentSub}>Document API distant • Télécharger</Text>
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
              <Text style={styles.cardSectionTitle}>Observateurs ({observers.length})</Text>
            </View>
          </View>

          {/* Formulaire visible comme sur la capture ! */}
          <View>
            <Text style={styles.cardEmptyItalicText}>
              {observers.length === 0
                ? 'Aucun observateur. Ajoutez un suiveur.'
                : 'Membres assignés à cette tâche :'}
            </Text>

            {/* Ligne saisie observateur + bouton Ajouter */}
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

            {/* Rôles en dessous : observer | assignee | responsible (Conforme au visuel) */}
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

            {/* Invitations rapides par clic pour le créateur */}
            <View style={{ marginTop: 4, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                Assigner rapidement un utilisateur :
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {availableUsers
                  .filter((u) => u.name.toLowerCase() !== currentUser.name.toLowerCase())
                  .map((user) => {
                    const alreadyInvited = observers.some(
                      (o) => o.name.toLowerCase() === user.name.toLowerCase()
                    );
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.allowedUserChip,
                          alreadyInvited && styles.allowedUserChipActive,
                        ]}
                        onPress={async () => {
                          if (!isCreator) {
                            notifyPermissionDenied('modifier les membres assignés');
                            return;
                          }
                          if (alreadyInvited) {
                            await removeObserver(task.id, user.name);
                          } else {
                            await addObserver(task.id, { name: user.name, role: 'assignee' });
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 13, marginRight: 4 }}>{user.avatar}</Text>
                        <Text
                          style={[
                            styles.allowedUserChipText,
                            alreadyInvited && styles.allowedUserChipTextActive,
                          ]}
                        >
                          {alreadyInvited ? '✓ ' : '+ '}{user.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          </View>

          {/* Liste des observateurs déjà ajoutés avec badge Assigné */}
          {observers.length > 0 && (
            <View style={styles.observersChipsList}>
              {observers.map((obs) => (
                <View key={obs.id || obs.name} style={styles.observerBadgeItem}>
                  <Ionicons name="person-circle" size={16} color="#0284C7" />
                  <Text style={styles.observerBadgeName}>{obs.name}</Text>
                  <View style={styles.roleSubBadge}>
                    <Text style={styles.roleSubBadgeText}>Assigné</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveObserver(obs.id || obs.name)}>
                    <Ionicons name="close" size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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

            {/* Boutons Carte & Capturer visibles comme sur la capture ! */}
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
              Aucune position. Capturez la position actuelle (GPS).
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
                  onPress={handleRemoveLocation}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>

              {/* Bandeau d'information GPS pour le membre assigné */}
              {isAssignee && (
                <View style={styles.gpsActiveNoticeBox}>
                  <Ionicons name="navigate" size={16} color="#16A34A" />
                  <Text style={styles.gpsActiveNoticeText}>
                    📍 Détection GPS active : l'application vous alerte automatiquement dès que vous arrivez à destination (moins de 500m).
                  </Text>
                </View>
              )}

              {/* Boutons de test de détection de proximité (Pour Créateur et Assigné) */}
              {!isNonAssignee && (
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
              )}
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
              onPress={handleOpenReminderModal}
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
              <TouchableOpacity onPress={handleRemoveReminder}>
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

          {/* Saisie commentaire : OUVERTE pour créateur et assignés, VERROUILLÉE pour non-assignés */}
          {canComment ? (
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
              <Ionicons name="lock-closed" size={20} color="#64748B" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.restrictedTitle, { color: '#334155' }]}>
                  Discussion réservée aux membres assignés
                </Text>
                <Text style={[styles.restrictedText, { color: '#64748B' }]}>
                  Vous n'êtes pas assigné(e) à cette tâche par {task.author}. La discussion est verrouillée en mode consultation.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* BOUTON MODIFIER EN BAS (Comme sur la capture !)          */}
        {/* ======================================================== */}
        <TouchableOpacity
          style={styles.bottomModifyButton}
          onPress={handleBottomModify}
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
        readOnly={!isCreator}
        onSelectLocation={async (loc) => {
          if (!isCreator) {
            notifyPermissionDenied('modifier la position GPS');
            return;
          }
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
                if (!isCreator) {
                  setShowSettingsModal(false);
                  notifyPermissionDenied('changer le statut');
                  return;
                }
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
                handleBottomModify();
              }}
            >
              <Ionicons name="create-outline" size={20} color="#0284C7" />
              <Text style={styles.modalActionText}>Modifier toutes les informations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAction, { borderTopColor: '#FEE2E2', borderTopWidth: 1 }]}
              onPress={async () => {
                setShowSettingsModal(false);
                if (!isCreator) {
                  notifyPermissionDenied('supprimer cette tâche');
                  return;
                }
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
                  Alert.alert('Rappel lancé', 'Notification de rappel dans 5 secondes.');
                }
              }}
            >
              <Ionicons name="flash-outline" size={20} color="#D97706" />
              <Text style={[styles.modalActionText, { color: '#B45309', fontWeight: '700' }]}>
                Tester en direct (dans 5s)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowReminderModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Annuler</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    paddingBottom: 30,
  },
  mainTaskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    paddingRight: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  userRoleOnTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  userRoleOnTaskText: {
    fontSize: 11,
    color: '#64748B',
  },
  gearFloatingBtn: {
    position: 'absolute',
    right: 14,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerPillButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 12,
    fontWeight: '700',
  },
  cardEmptyItalicText: {
    fontStyle: 'italic',
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attachmentThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachmentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  followerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  followerTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  addFollowerBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addFollowerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  roleChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  roleChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
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
  allowedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allowedUserChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  allowedUserChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  allowedUserChipTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  observersChipsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  observerBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 6,
  },
  observerBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  roleSubBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleSubBadgeText: {
    fontSize: 9,
    color: '#0284C7',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationCapturedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 6,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gpsActiveNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 8,
    gap: 6,
  },
  gpsActiveNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
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
    paddingVertical: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    paddingVertical: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  reminderDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  reminderSubText: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 10,
  },
  testNotificationBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  commentItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  commentTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  commentTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  commentSendBtn: {
    backgroundColor: '#0284C7',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restrictedCommentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },
  restrictedTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  restrictedText: {
    fontSize: 11,
    lineHeight: 15,
  },
  bottomModifyButton: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bottomModifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  backButtonSimple: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonSimpleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 6,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default TaskDetailScreen;
