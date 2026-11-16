import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration pour afficher la notification même si l'application est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  // Demander la permission pour les notifications
  async requestPermissions() {
    if (Platform.OS === 'web') return true;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Erreur permissions notifications:', e);
      return false;
    }
  },

  // Programmer un rappel à date et heure précise
  async scheduleTaskReminder({ title, body, date }) {
    if (Platform.OS === 'web') {
      console.log(`[Web Notification Simulée] Rappel prévu pour le ${date.toLocaleString()}`);
      return 'web-reminder-' + Date.now();
    }

    await this.requestPermissions();

    const triggerDate = new Date(date);
    if (triggerDate.getTime() <= Date.now()) {
      throw new Error('La date de rappel doit être dans le futur.');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Rappel : ${title}`,
        body: body || 'Il est l’heure de réaliser votre tâche !',
        sound: true,
        data: { type: 'reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  },

  // Annuler un rappel programmé
  async cancelReminder(notificationId) {
    if (!notificationId || Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('Erreur annulation notification:', e);
    }
  },

  // Notification immédiate pour un nouveau commentaire d'un observateur
  async notifyCommentAdded({ taskTitle, author, commentText }) {
    if (Platform.OS === 'web') {
      window.alert(`🔔 Nouveau commentaire de ${author} sur "${taskTitle}":\n"${commentText}"`);
      return;
    }

    await this.requestPermissions();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 Nouveau commentaire — ${taskTitle}`,
        body: `${author} : ${commentText}`,
        sound: true,
        data: { type: 'comment' },
      },
      trigger: null, // Immédiat
    });
  },

  // Notification immédiate pour la proximité géographique
  async notifyLocationProximity({ taskTitle, distanceMeters }) {
    if (Platform.OS === 'web') {
      window.alert(`📍 Proximité tâche "${taskTitle}": Vous êtes à environ ${Math.round(distanceMeters)}m du lieu prévu !`);
      return;
    }

    await this.requestPermissions();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📍 Vous êtes à proximité !`,
        body: `Tâche "${taskTitle}" : vous êtes à moins de ${Math.round(distanceMeters)}m de la position prévue.`,
        sound: true,
        data: { type: 'location_proximity' },
      },
      trigger: null, // Immédiat
    });
  },
};

export default notificationService;
