import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mytasks_final_tasks';

export const initialTasks = [
  {
    id: '1',
    title: 'Debug obs',
    description: '', // Description vide pour afficher 'Aucune description fournie.' comme sur la capture
    priority: 'Moyenne',
    status: 'À faire',
    createdAt: '17/11/2026',
    author: 'Mehdi',
    imageUri: null,
    attachedFile: null,
    apiFile: null,
    reminderDate: null,
    locationReminder: null,
    observers: [], // Vide initialement comme sur la capture
    comments: [],
  },
  {
    id: '2',
    title: 'Préparer la présentation finale',
    description: 'Réaliser les diapositives pour la présentation du projet mobile avec les 6 fonctionnalités.',
    priority: 'Élevée',
    status: 'À faire',
    createdAt: '16/11/2026',
    author: 'Chef de projet',
    imageUri: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
    attachedFile: {
      name: 'Plan_presentation.pdf',
      uri: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      size: 142500,
      mimeType: 'application/pdf',
    },
    apiFile: null,
    reminderDate: '2026-11-20T10:00:00.000Z',
    locationReminder: {
      latitude: 48.8566,
      longitude: 2.3522,
      locationName: 'Campus Universitaire / Salle de soutenance',
      radius: 500,
    },
    observers: [
      { id: 'obs_1', name: 'Professeur', role: 'responsible', addedAt: '16/11/2026' },
      { id: 'obs_2', name: 'Mehdi', role: 'assignee', addedAt: '16/11/2026' },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Professeur',
        text: 'N’oubliez pas d’illustrer la capture d’écran de la caméra et le rappel géographique.',
        createdAt: '16/11/2026 à 14:30',
      },
      {
        id: 'c2',
        author: 'Mehdi',
        text: 'C’est noté ! Les modules Expo Camera et OpenStreetMap sont intégrés et fonctionnels.',
        createdAt: '16/11/2026 à 15:10',
      },
    ],
  },
  {
    id: '3',
    title: 'Télécharger les documents via l’API',
    description: 'Tester l’appel API pour récupérer un fichier PDF ou JSON externe avec FileSystem.',
    priority: 'Faible',
    status: 'Terminée',
    createdAt: '15/11/2026',
    author: 'Sarah',
    imageUri: null,
    attachedFile: null,
    apiFile: {
      name: 'Cahier_des_charges_Projet.pdf',
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      downloadedUri: null,
      downloadedAt: '15/11/2026 à 11:00',
    },
    reminderDate: null,
    locationReminder: null,
    observers: [
      { id: 'obs_3', name: 'Chef de projet', role: 'observer', addedAt: '15/11/2026' },
    ],
    comments: [
      {
        id: 'c3',
        author: 'Chef de projet',
        text: 'L’API répond avec le code HTTP 200 et le téléchargement fonctionne.',
        createdAt: '15/11/2026 à 11:15',
      },
    ],
  },
];

export const loadTasksFromStorage = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialTasks));
    return initialTasks;
  } catch (e) {
    console.error('Erreur chargement tâches :', e);
    return initialTasks;
  }
};

export const saveTasksToStorage = async (tasks) => {
  try {
    const jsonValue = JSON.stringify(tasks);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Erreur sauvegarde tâches :', e);
  }
};
