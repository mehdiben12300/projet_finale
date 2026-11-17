import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import MapLocationPicker from '../components/MapLocationPicker';
import apiFileService from '../services/apiFileService';

export const TaskFormScreen = ({ route, navigation }) => {
  const { mode = 'add', taskId } = route.params || {};
  const isEditing = mode === 'edit';

  const { addTask, updateTask, deleteTask, getTask } = useTasks();
  const { currentUser, availableUsers } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Moyenne');
  const [status, setStatus] = useState('À faire');
  const [invitedNames, setInvitedNames] = useState(['Professeur']);

  // 1. Photo Caméra / Galerie
  const [imageUri, setImageUri] = useState(null);

  // 2. Fichier joint local
  const [attachedFile, setAttachedFile] = useState(null);

  // 3. Fichier téléchargé depuis API
  const [apiFile, setApiFile] = useState(null);
  const [downloadingApi, setDownloadingApi] = useState(false);

  // 4. Rappel Date & Heure
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date(Date.now() + 3600 * 1000 * 24)); // demain
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');

  // 5. Rappel par Position (OpenStreetMap)
  const [locationReminder, setLocationReminder] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    if (isEditing && taskId) {
      const existing = getTask(taskId);
      if (existing) {
        // Seul le créateur de la tâche a le droit de la modifier
        const isAuthor =
          existing.author &&
          currentUser.name &&
          existing.author.toLowerCase() === currentUser.name.toLowerCase();

        if (!isAuthor) {
          const msg = `Accès refusé : Seul le créateur de cette tâche (${existing.author}) a le droit de la modifier.`;
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Accès refusé', msg);
          navigation.goBack();
          return;
        }

        setTitle(existing.title);
        setDescription(existing.description || '');
        setPriority(existing.priority || 'Moyenne');
        setStatus(
          existing.status === 'Terminée' || existing.status === 'Terminées'
            ? 'Terminée'
            : 'À faire'
        );
        setImageUri(existing.imageUri || null);
        setAttachedFile(existing.attachedFile || null);
        setApiFile(existing.apiFile || null);
        if (existing.reminderDate) {
          setEnableReminder(true);
          setReminderDate(new Date(existing.reminderDate));
        }
        setLocationReminder(existing.locationReminder || null);
        if (existing.observers) {
          setInvitedNames(existing.observers.map((o) => o.name));
        }
      }
    }
  }, [isEditing, taskId]);

  // --- 1. FONCTIONS CAMÉRA & GALERIE ---
  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', "L'accès à la caméra est nécessaire pour prendre une photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Erreur caméra:', e);
      Alert.alert('Erreur', 'Impossible d’accéder à la caméra.');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Erreur galerie:', e);
    }
  };

  // --- 2. FONCTION AJOUT DE FICHIER ---
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setAttachedFile({
          name: file.name,
          size: file.size || 0,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (e) {
      console.warn('Erreur sélection document:', e);
    }
  };

  // --- 3. FONCTION RÉCUPÉRATION DE FICHIER VIA API ---
  const handleDownloadApiFile = async (sample) => {
    setDownloadingApi(true);
    try {
      const result = await apiFileService.downloadFileFromApi(sample.url, sample.name);
      setApiFile({
        name: sample.name,
        url: sample.url,
        downloadedUri: result.uri,
        downloadedAt: result.downloadedAt,
        size: result.size,
      });
      if (Platform.OS === 'web') {
        window.alert(`✅ Fichier "${sample.name}" téléchargé avec succès depuis l'API !`);
      } else {
        Alert.alert('Succès', `Fichier "${sample.name}" téléchargé avec succès depuis l'API !`);
      }
    } catch (err) {
      Alert.alert('Erreur API', 'Impossible de récupérer le fichier : ' + err.message);
    } finally {
      setDownloadingApi(false);
    }
  };

  // --- 4. GESTION DU RAPPEL DATE & HEURE ---
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        if (pickerMode === 'date') {
          setReminderDate(selectedDate);
          setPickerMode('time');
          setShowDatePicker(true);
        } else {
          setReminderDate(selectedDate);
          setPickerMode('date');
        }
      }
    } else {
      if (selectedDate) setReminderDate(selectedDate);
    }
  };

  // --- ENREGISTREMENT ---
  const handleSave = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Le titre de la tâche est obligatoire.');
      } else {
        Alert.alert('Erreur', 'Le titre de la tâche est obligatoire.');
      }
      return;
    }

    const observersPayload = isEditing
      ? undefined
      : invitedNames.map((name) => ({
          id: 'obs_' + Date.now() + '_' + name,
          name,
          role: 'observer',
          addedAt: new Date().toLocaleDateString('fr-FR'),
        }));

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      imageUri,
      attachedFile,
      apiFile,
      reminderDate: enableReminder ? reminderDate.toISOString() : null,
      locationReminder,
      ...(isEditing
        ? {}
        : {
            observers: observersPayload,
            author: currentUser ? currentUser.name : 'Mehdi',
          }),
    };

    if (isEditing) {
      await updateTask(taskId, taskPayload);
    } else {
      await addTask(taskPayload);
    }

    navigation.navigate('MainTabs', { screen: 'TasksTab' });
  };

  const performDelete = async () => {
    await deleteTask(taskId);
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
        'Êtes-vous sûr de vouloir supprimer cette tâche ?',
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
          <Text style={styles.topBarTitle}>
            {isEditing ? 'Modifier la tâche' : 'Ajouter une tâche'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Titre */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Préparer la présentation"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Détails de la tâche..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Priorité */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Priorité</Text>
          <View style={styles.priorityRow}>
            {[
              { label: 'Faible', activeBg: '#DCFCE7', activeText: '#16A34A', border: '#10B981' },
              { label: 'Moyenne', activeBg: '#FEF3C7', activeText: '#D97706', border: '#F59E0B' },
              { label: 'Élevée', activeBg: '#FEE2E2', activeText: '#DC2626', border: '#EF4444' },
            ].map((p) => {
              const isSelected = priority === p.label;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[
                    styles.priorityBtn,
                    isSelected && {
                      backgroundColor: p.activeBg,
                      borderColor: p.border,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setPriority(p.label)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.priorityBtnText,
                      isSelected && { color: p.activeText, fontWeight: '700' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Statut (mode modification) */}
        {isEditing && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Statut</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[
                  styles.statusBtn,
                  status === 'À faire' && styles.statusBtnPendingActive,
                ]}
                onPress={() => setStatus('À faire')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    status === 'À faire' && styles.statusBtnPendingTextActive,
                  ]}
                >
                  À faire
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusBtn,
                  (status === 'Terminée' || status === 'Terminées') && styles.statusBtnDoneActive,
                ]}
                onPress={() => setStatus('Terminée')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    (status === 'Terminée' || status === 'Terminées') && styles.statusBtnDoneTextActive,
                  ]}
                >
                  Terminée
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- SECTION 1 : CAMÉRA & PHOTO --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="camera-outline" size={18} color="#0284C7" />
            <Text style={styles.sectionTitle}>1. Photo / Caméra</Text>
          </View>

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#0284C7" />
                <Text style={styles.actionButtonText}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={16} color="#64748B" />
                <Text style={styles.actionButtonText}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* --- SECTION 2 : FICHIER JOINT --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="attach-outline" size={18} color="#6366F1" />
            <Text style={styles.sectionTitle}>2. Ajouter un fichier</Text>
          </View>

          {attachedFile ? (
            <View style={styles.fileCard}>
              <Ionicons name="document-text" size={24} color="#6366F1" />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.fileName} numberOfLines={1}>{attachedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {(attachedFile.size / 1024).toFixed(1)} Ko
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedFile(null)}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePickDocument}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={16} color="#6366F1" />
              <Text style={styles.actionButtonText}>Sélectionner un document (PDF, Word...)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- SECTION 3 : RÉCUPÉRER UN FICHIER VIA API --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cloud-download-outline" size={18} color="#059669" />
            <Text style={styles.sectionTitle}>3. Récupérer un fichier via API</Text>
          </View>

          {apiFile ? (
            <View style={[styles.fileCard, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="cloud-done" size={24} color="#059669" />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.fileName} numberOfLines={1}>{apiFile.name}</Text>
                <Text style={styles.fileSize}>
                  Téléchargé depuis l'API le {apiFile.downloadedAt}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setApiFile(null)}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.subHint}>
                Tester l'appel d'API pour télécharger un document externe :
              </Text>
              {downloadingApi ? (
                <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 8 }} />
              ) : (
                <View style={{ gap: 6 }}>
                  {apiFileService.sampleApiFiles.map((sample) => (
                    <TouchableOpacity
                      key={sample.id}
                      style={[styles.actionButton, { borderColor: '#A7F3D0' }]}
                      onPress={() => handleDownloadApiFile(sample)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="download-outline" size={15} color="#059669" />
                      <Text style={[styles.actionButtonText, { color: '#059669' }]}>
                        Télécharger {sample.name} ({sample.type})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* --- SECTION 4 : RAPPEL DATE & HEURE --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="alarm-outline" size={18} color="#D97706" />
            <Text style={styles.sectionTitle}>4. Rappel à date et heure</Text>
          </View>

          <TouchableOpacity
            style={[styles.toggleRow, enableReminder && styles.toggleRowActive]}
            onPress={() => setEnableReminder(!enableReminder)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={enableReminder ? 'checkbox' : 'square-outline'}
              size={20}
              color={enableReminder ? '#D97706' : '#94A3B8'}
            />
            <Text style={styles.toggleText}>
              {enableReminder ? 'Rappel programmé' : 'Activer un rappel'}
            </Text>
          </TouchableOpacity>

          {enableReminder && (
            <View style={{ marginTop: 8 }}>
              {Platform.OS === 'web' ? (
                <input
                  type="datetime-local"
                  value={reminderDate.toISOString().slice(0, 16)}
                  onChange={(e) => setReminderDate(new Date(e.target.value))}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => {
                      setPickerMode('date');
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons name="calendar" size={16} color="#D97706" />
                    <Text style={styles.datePickerBtnText}>
                      {reminderDate.toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={reminderDate}
                      mode={pickerMode}
                      is24Hour={true}
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* --- SECTION 5 : RAPPEL PAR POSITION (OPENSTREETMAP) --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="location-outline" size={18} color="#DC2626" />
            <Text style={styles.sectionTitle}>5. Rappel par position (OpenStreetMap)</Text>
          </View>

          {locationReminder ? (
            <View style={[styles.fileCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="location" size={24} color="#DC2626" />
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {locationReminder.locationName || 'Position sélectionnée'}
                </Text>
                <Text style={styles.fileSize}>
                  Lat: {locationReminder.latitude.toFixed(4)}, Lon: {locationReminder.longitude.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLocationReminder(null)}>
                <Ionicons name="close-circle" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: '#FECACA' }]}
              onPress={() => setShowMapModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={16} color="#DC2626" />
              <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>
                Sélectionner sur la carte OpenStreetMap
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* --- SECTION 6 : INVITER DES COLLABORATEURS --- */}
        <View style={styles.featureSection}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="people-outline" size={18} color="#0284C7" />
            <Text style={styles.sectionTitle}>6. Inviter des collaborateurs</Text>
          </View>
          <Text style={styles.subHint}>
            Les collaborateurs invités pourront consulter la tâche et échanger dans les discussions (les non-invités seront en lecture seule sans discussion) :
          </Text>
          <View style={styles.userChipsRow}>
            {availableUsers
              .filter((u) => u.name.toLowerCase() !== (currentUser ? currentUser.name.toLowerCase() : ''))
              .map((u) => {
                const isSelected = invitedNames.includes(u.name);
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userChip, isSelected && styles.userChipSelected]}
                    onPress={() => {
                      if (isSelected) {
                        setInvitedNames(invitedNames.filter((name) => name !== u.name));
                      } else {
                        setInvitedNames([...invitedNames, u.name]);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, marginRight: 4 }}>{u.avatar}</Text>
                    <Text style={[styles.userChipText, isSelected && styles.userChipTextSelected]}>
                      {isSelected ? '✓ ' : '+ '}{u.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>

        {/* Boutons Enregistrer & Supprimer */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Enregistrer la tâche</Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal Carte OpenStreetMap */}
      <MapLocationPicker
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLocation={locationReminder}
        onSelectLocation={(loc) => setLocationReminder(loc)}
      />
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
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 80,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  statusBtnPendingActive: {
    backgroundColor: '#0284C7',
  },
  statusBtnPendingTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBtnDoneActive: {
    backgroundColor: '#10B981',
  },
  statusBtnDoneTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  featureSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  subHint: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    height: 160,
    backgroundColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    borderRadius: 16,
    padding: 6,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  toggleRowActive: {},
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  userChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  userChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  userChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  userChipTextSelected: {
    color: '#0284C7',
    fontWeight: '700',
  },
  actionsContainer: {
    marginTop: 10,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default TaskFormScreen;
