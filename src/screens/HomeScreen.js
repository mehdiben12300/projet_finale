import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import StatsOverview from '../components/StatsOverview';

export const HomeScreen = ({ navigation }) => {
  const { stats, tasks } = useTasks();
  const { currentUser, availableUsers, switchUser, loginWithCustomName } = useAuth();

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  const handleCreateUser = async () => {
    if (!newUserName.trim()) return;
    await loginWithCustomName(newUserName.trim());
    setNewUserName('');
    setShowUserModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Barre supérieure : Utilisateur connecté + Bouton changer */}
      <View style={styles.topBar}>
        <View style={styles.userBadge}>
          <Text style={styles.userAvatarText}>{currentUser.avatar || '👤'}</Text>
          <View>
            <Text style={styles.userNameText}>{currentUser.name}</Text>
            <Text style={styles.userRoleText}>{currentUser.role}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.switchUserBtn}
          onPress={() => setShowUserModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-horizontal" size={16} color="#0284C7" />
          <Text style={styles.switchUserBtnText}>Changer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Titre et Slogan */}
        <View style={styles.header}>
          <Text style={styles.appName}>MyTasks Pro</Text>
          <Text style={styles.tagline}>
            Organisez vos tâches, collaborez avec les observateurs !
          </Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsWrapper}>
          <StatsOverview stats={stats} />
        </View>

        {/* Boutons d'action rapide */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('TasksTab')}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Consulter les tâches</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('TaskForm', { mode: 'add' })}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Ajouter une tâche</Text>
          </TouchableOpacity>
        </View>

        {/* Tâches récentes en accès direct */}
        <View style={styles.recentSection}>
          <Text style={styles.recentSectionTitle}>Tâches récentes</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {tasks.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentTaskCard}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTaskTitle}>{item.title}</Text>
                  <Text style={styles.recentTaskSub}>
                    {item.priority} • {item.status} • Créée par {item.author || 'Mehdi'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Changement d'utilisateur (Authentification légère) */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choisir un utilisateur</Text>
            <Text style={styles.modalSub}>
              Connectez-vous avec un autre compte pour observer et commenter :
            </Text>

            <View style={{ gap: 8, marginVertical: 12 }}>
              {availableUsers.map((u) => {
                const isCurrent = currentUser.id === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userOptionItem, isCurrent && styles.userOptionItemActive]}
                    onPress={async () => {
                      await switchUser(u);
                      setShowUserModal(false);
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{u.avatar}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.userOptionName, isCurrent && { color: '#0284C7' }]}>
                        {u.name}
                      </Text>
                      <Text style={styles.userOptionRole}>{u.role}</Text>
                    </View>
                    {isCurrent && <Ionicons name="checkmark-circle" size={20} color="#0284C7" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Saisie compte personnalisé */}
            <View style={styles.customUserRow}>
              <TextInput
                style={styles.customUserInput}
                placeholder="Ou entrer un autre nom..."
                placeholderTextColor="#94A3B8"
                value={newUserName}
                onChangeText={setNewUserName}
              />
              <TouchableOpacity style={styles.customUserBtn} onPress={handleCreateUser}>
                <Text style={styles.customUserBtnText}>Connexion</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowUserModal(false)}
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
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatarText: {
    fontSize: 26,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRoleText: {
    fontSize: 11,
    color: '#64748B',
  },
  switchUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchUserBtnText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  statsWrapper: {
    marginVertical: 10,
  },
  actionButtons: {
    gap: 12,
    marginVertical: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#0284C7',
  },
  secondaryButton: {
    backgroundColor: '#10B981',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  recentSection: {
    marginTop: 16,
  },
  recentSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  recentTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentTaskSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Modal styles
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
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
  userOptionItemActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  userOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userOptionRole: {
    fontSize: 11,
    color: '#64748B',
  },
  customUserRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  customUserInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  customUserBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customUserBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalCloseBtn: {
    marginTop: 12,
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
});

export default HomeScreen;
