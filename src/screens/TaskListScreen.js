import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import StatsOverview from '../components/StatsOverview';

export const TaskListScreen = ({ navigation }) => {
  const { tasks, loading, stats, syncStatus, triggerSync } = useTasks();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Toutes'); // 'Toutes' | 'À faire' | 'Terminées'
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'mine'

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filtre appartenance (Toutes vs Mes tâches)
      if (scopeFilter === 'mine' && currentUser) {
        const isAuthor = task.author && task.author.toLowerCase() === currentUser.name.toLowerCase();
        const isObserver =
          task.observers &&
          task.observers.some(
            (o) => o.name && o.name.toLowerCase() === currentUser.name.toLowerCase()
          );
        if (!isAuthor && !isObserver) {
          return false;
        }
      }

      // Filtre statut : gère 'Toutes', 'À faire', et 'Terminées' (avec ou sans 's')
      let matchesFilter = true;
      if (activeFilter === 'À faire') {
        matchesFilter = task.status === 'À faire';
      } else if (activeFilter === 'Terminées') {
        matchesFilter = task.status === 'Terminée' || task.status === 'Terminées';
      }

      // Filtre recherche
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesFilter && matchesSearch;
    });
  }, [tasks, activeFilter, scopeFilter, searchQuery, currentUser]);

  // Indicateur statut de synchronisation
  const renderSyncBadge = () => {
    let dotColor = '#10B981'; // synchronisé
    let statusLabel = 'API en ligne';

    if (syncStatus === 'offline') {
      dotColor = '#F59E0B';
      statusLabel = 'Hors-ligne (Local)';
    } else if (syncStatus === 'syncing') {
      dotColor = '#0284C7';
      statusLabel = 'Synchro en cours...';
    }

    return (
      <TouchableOpacity
        style={styles.syncIndicator}
        onPress={triggerSync}
        activeOpacity={0.7}
      >
        <View style={[styles.syncDot, { backgroundColor: dotColor }]} />
        <Text style={styles.syncText}>{statusLabel}</Text>
      </TouchableOpacity>
    );
  };

  // Écran de chargement
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Chargement de vos tâches...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* En-tête : Titre + Statut Sync + Bouton Ajouter (+) */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mes tâches</Text>
            {renderSyncBadge()}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('TaskForm', { mode: 'add' })}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Statistiques */}
        <StatsOverview stats={stats} />

        {/* Bascule Portée : Toutes les tâches vs Mes tâches (Observateur/Auteur) */}
        <View style={styles.scopeTabsContainer}>
          <TouchableOpacity
            style={[styles.scopeTab, scopeFilter === 'all' && styles.scopeTabActive]}
            onPress={() => setScopeFilter('all')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="globe-outline"
              size={14}
              color={scopeFilter === 'all' ? '#0284C7' : '#64748B'}
            />
            <Text
              style={[
                styles.scopeTabText,
                scopeFilter === 'all' && styles.scopeTabTextActive,
              ]}
            >
              Toutes les tâches
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeTab, scopeFilter === 'mine' && styles.scopeTabActive]}
            onPress={() => setScopeFilter('mine')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={scopeFilter === 'mine' ? '#0284C7' : '#64748B'}
            />
            <Text
              style={[
                styles.scopeTabText,
                scopeFilter === 'mine' && styles.scopeTabTextActive,
              ]}
            >
              Mes tâches ({currentUser ? currentUser.name : ''})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une tâche..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres par onglets statut */}
        <View style={styles.filterTabs}>
          {['Toutes', 'À faire', 'Terminées'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Liste des tâches avec FlatList */}
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Aucune tâche trouvée</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  scopeTabActive: {
    backgroundColor: '#E0F2FE',
  },
  scopeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#0284C7',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#0284C7',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default TaskListScreen;
