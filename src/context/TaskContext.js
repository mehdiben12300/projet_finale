import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import syncService from '../services/syncService';
import { initialTasks } from '../storage/asyncStorage';
import notificationService from '../services/notificationService';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    const queue = await syncService.getPendingQueue();
    setPendingCount(queue.length);
  };

  // Synchronisation avec l'API
  const triggerSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const result = await syncService.synchronize();
      setTasks(result.tasks);
      setLastSyncTime(result.lastSync);
      setPendingCount(0);
      setSyncStatus('synced');
      return true;
    } catch (err) {
      console.log('Mode hors-ligne ou serveur inaccessible:', err.message);
      setSyncStatus('offline');
      await updatePendingCount();
      return false;
    }
  }, []);

  // Chargement initial (Lecture locale immédiate, puis tentative de sync en arrière-plan)
  useEffect(() => {
    const initialize = async () => {
      try {
        let localTasks = await syncService.getLocalTasks();
        if (!localTasks || localTasks.length === 0) {
          localTasks = initialTasks;
          await syncService.saveLocalTasks(initialTasks);
        }
        setTasks(localTasks);

        const lastSync = await syncService.getLastSyncTime();
        if (lastSync) setLastSyncTime(lastSync);

        await updatePendingCount();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        triggerSync();
      }
    };

    initialize();
  }, [triggerSync]);

  // Ajouter une tâche
  const addTask = async (taskData) => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(
      today.getMonth() + 1
    ).padStart(2, '0')}/${today.getFullYear()}`;

    const newTask = {
      id: Date.now().toString(),
      title: taskData.title ? taskData.title.trim() : 'Nouvelle tâche',
      description: taskData.description ? taskData.description.trim() : '',
      priority: taskData.priority || 'Moyenne',
      status: taskData.status || 'À faire',
      createdAt: formattedDate,
      author: taskData.author || 'Mehdi',
      imageUri: taskData.imageUri || null,
      attachedFile: taskData.attachedFile || null,
      apiFile: taskData.apiFile || null,
      reminderDate: taskData.reminderDate || null,
      notificationId: null,
      locationReminder: taskData.locationReminder || null,
      observers: taskData.observers || [],
      comments: taskData.comments || [],
    };

    if (taskData.reminderDate) {
      try {
        const notifId = await notificationService.scheduleTaskReminder({
          title: newTask.title,
          body: newTask.description || 'Rappel pour votre tâche',
          date: new Date(taskData.reminderDate),
        });
        newTask.notificationId = notifId;
      } catch (e) {
        console.warn('Erreur rappel:', e);
      }
    }

    const updated = [newTask, ...tasks];
    setTasks(updated);
    await syncService.saveLocalTasks(updated);
    await syncService.addPendingAction({ type: 'create', task: newTask });
    await updatePendingCount();

    triggerSync();
    return newTask;
  };

  // Modifier une tâche
  const updateTask = async (id, updatedFields) => {
    const existing = tasks.find((t) => String(t.id) === String(id));
    let notificationId = existing ? existing.notificationId : null;

    if (updatedFields.reminderDate && updatedFields.reminderDate !== (existing && existing.reminderDate)) {
      if (notificationId) await notificationService.cancelReminder(notificationId);
      try {
        notificationId = await notificationService.scheduleTaskReminder({
          title: updatedFields.title || (existing && existing.title),
          body: updatedFields.description || (existing && existing.description),
          date: new Date(updatedFields.reminderDate),
        });
      } catch (e) {
        console.warn('Erreur rappel:', e);
      }
    } else if (updatedFields.reminderDate === null && notificationId) {
      await notificationService.cancelReminder(notificationId);
      notificationId = null;
    }

    const updatedTask = {
      ...existing,
      ...updatedFields,
      notificationId,
    };

    const updated = tasks.map((t) => (String(t.id) === String(id) ? updatedTask : t));
    setTasks(updated);
    await syncService.saveLocalTasks(updated);
    await syncService.addPendingAction({ type: 'update', task: updatedTask });
    await updatePendingCount();

    triggerSync();
    return updatedTask;
  };

  // Supprimer une tâche
  const deleteTask = async (id) => {
    const taskToDelete = tasks.find((t) => String(t.id) === String(id));
    if (taskToDelete && taskToDelete.notificationId) {
      await notificationService.cancelReminder(taskToDelete.notificationId);
    }
    const updated = tasks.filter((t) => String(t.id) !== String(id));
    setTasks(updated);
    await syncService.saveLocalTasks(updated);
    await syncService.addPendingAction({ type: 'delete', id });
    await updatePendingCount();

    triggerSync();
  };

  const getTask = (id) => {
    return tasks.find((t) => String(t.id) === String(id));
  };

  // Ajouter un observateur (suiveur) à la tâche
  const addObserver = async (taskId, { name, role = 'observer' }) => {
    const newObserver = {
      id: 'obs_' + Date.now(),
      name: name.trim(),
      role, // 'observer' | 'assignee' | 'responsible'
      addedAt: new Date().toLocaleDateString('fr-FR'),
    };

    const target = getTask(taskId);
    if (!target) return;

    const currentObservers = target.observers || [];
    const updatedObservers = [...currentObservers, newObserver];

    await updateTask(taskId, { observers: updatedObservers });

    // Notification
    await notificationService.requestPermissions();
  };

  // Supprimer un observateur
  const removeObserver = async (taskId, observerId) => {
    const target = getTask(taskId);
    if (!target) return;

    const updatedObservers = (target.observers || []).filter(
      (o) => String(o.id) !== String(observerId) && o.name !== observerId
    );

    await updateTask(taskId, { observers: updatedObservers });
  };

  // Ajouter un commentaire à la tâche
  const addCommentToTask = async (taskId, comment) => {
    const target = getTask(taskId);
    if (!target) return;

    const currentComments = target.comments || [];
    const updatedComments = [comment, ...currentComments];

    await updateTask(taskId, { comments: updatedComments });
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === 'Terminée' || t.status === 'Terminées'
    ).length;
    const pending = tasks.filter((t) => t.status === 'À faire').length;
    return { total, completed, pending };
  }, [tasks]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        syncStatus,
        lastSyncTime,
        pendingCount,
        stats,
        triggerSync,
        addTask,
        updateTask,
        deleteTask,
        getTask,
        addObserver,
        removeObserver,
        addCommentToTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => useContext(TaskContext);
