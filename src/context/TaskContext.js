import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { loadTasksFromStorage, saveTasksToStorage, initialTasks } from '../storage/asyncStorage';
import notificationService from '../services/notificationService';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const stored = await loadTasksFromStorage();
        setTasks(stored);
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };

    fetchTasks();
  }, []);

  const persistTasks = async (newTasks) => {
    setTasks(newTasks);
    await saveTasksToStorage(newTasks);
  };

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
      status: 'À faire',
      createdAt: formattedDate,
      imageUri: taskData.imageUri || null,
      attachedFile: taskData.attachedFile || null,
      apiFile: taskData.apiFile || null,
      reminderDate: taskData.reminderDate || null,
      notificationId: null,
      locationReminder: taskData.locationReminder || null,
      observers: taskData.observers || ['Professeur', 'Chef de projet', 'Mehdi'],
      comments: taskData.comments || [],
    };

    // Programmer la notification de rappel si une date a été choisie
    if (taskData.reminderDate) {
      try {
        const notifId = await notificationService.scheduleTaskReminder({
          title: newTask.title,
          body: newTask.description,
          date: new Date(taskData.reminderDate),
        });
        newTask.notificationId = notifId;
      } catch (e) {
        console.warn('Erreur programmation rappel:', e);
      }
    }

    const updated = [newTask, ...tasks];
    await persistTasks(updated);
    return newTask;
  };

  const updateTask = async (id, updatedFields) => {
    const existing = tasks.find((t) => String(t.id) === String(id));

    // Si la date de rappel change, reprogrammer la notification
    let notificationId = existing ? existing.notificationId : null;
    if (updatedFields.reminderDate && updatedFields.reminderDate !== (existing && existing.reminderDate)) {
      if (notificationId) {
        await notificationService.cancelReminder(notificationId);
      }
      try {
        notificationId = await notificationService.scheduleTaskReminder({
          title: updatedFields.title || (existing && existing.title),
          body: updatedFields.description || (existing && existing.description),
          date: new Date(updatedFields.reminderDate),
        });
      } catch (e) {
        console.warn('Erreur reprogrammation rappel:', e);
      }
    } else if (updatedFields.reminderDate === null && notificationId) {
      await notificationService.cancelReminder(notificationId);
      notificationId = null;
    }

    const updated = tasks.map((t) =>
      String(t.id) === String(id) ? { ...t, ...updatedFields, notificationId } : t
    );
    await persistTasks(updated);
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find((t) => String(t.id) === String(id));
    if (taskToDelete && taskToDelete.notificationId) {
      await notificationService.cancelReminder(taskToDelete.notificationId);
    }
    const updated = tasks.filter((t) => String(t.id) !== String(id));
    await persistTasks(updated);
  };

  const getTask = (id) => {
    return tasks.find((t) => String(t.id) === String(id));
  };

  // Ajouter un commentaire à une tâche
  const addCommentToTask = async (taskId, comment) => {
    const updated = tasks.map((t) => {
      if (String(t.id) === String(taskId)) {
        const comments = t.comments || [];
        return {
          ...t,
          comments: [comment, ...comments],
        };
      }
      return t;
    });
    await persistTasks(updated);
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
        stats,
        addTask,
        updateTask,
        deleteTask,
        getTask,
        addCommentToTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => useContext(TaskContext);
