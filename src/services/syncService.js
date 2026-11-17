import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/api';

const LOCAL_TASKS_KEY = '@mytasks_final_tasks';
const PENDING_QUEUE_KEY = '@mytasks_final_pending_queue';
const LAST_SYNC_KEY = '@mytasks_final_last_sync';

export const syncService = {
  // 1. Charger les tâches locales
  async getLocalTasks() {
    try {
      const data = await AsyncStorage.getItem(LOCAL_TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erreur lecture local tasks:', e);
      return [];
    }
  },

  // 2. Sauvegarder les tâches locales
  async saveLocalTasks(tasks) {
    try {
      await AsyncStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Erreur écriture local tasks:', e);
    }
  },

  // 3. File d'attente hors-ligne (Queue)
  async getPendingQueue() {
    try {
      const data = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async addPendingAction(action) {
    try {
      const queue = await this.getPendingQueue();
      queue.push({ ...action, timestamp: Date.now() });
      await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Erreur ajout file attente:', e);
    }
  },

  async clearPendingQueue() {
    await AsyncStorage.removeItem(PENDING_QUEUE_KEY);
  },

  // 4. Horodatage de synchronisation
  async getLastSyncTime() {
    return await AsyncStorage.getItem(LAST_SYNC_KEY);
  },

  async setLastSyncTime(dateStr) {
    await AsyncStorage.setItem(LAST_SYNC_KEY, dateStr);
  },

  // 5. Synchronisation complète avec le serveur API
  async synchronize() {
    const queue = await this.getPendingQueue();
    const url = `${getApiUrl()}/tasks/sync`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: queue }),
    });

    if (!res.ok) {
      throw new Error(`Erreur sync HTTP: ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.tasks) {
      await this.saveLocalTasks(data.tasks);
      await this.clearPendingQueue();
      const now = new Date().toLocaleTimeString();
      await this.setLastSyncTime(now);
      return { success: true, tasks: data.tasks, lastSync: now };
    }

    throw new Error('Réponse de synchronisation inattendue');
  },
};

export default syncService;
