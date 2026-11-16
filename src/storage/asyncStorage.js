import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mytasks_final_tasks';

export const initialTasks = [
  {
    id: '1',
    title: 'Préparer la présentation finale',
    description: 'Réaliser les diapositives pour la présentation du projet mobile avec les 6 fonctionnalités.',
    priority: 'Élevée',
    status: 'À faire',
    createdAt: '16/11/2026',
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
    observers: ['Professeur', 'Chef de projet', 'Mehdi'],
    comments: [
      {
        id: 'c1',
        author: 'Professeur',
        text: 'N’oubliez pas d’illustrer la capture d’écran de la caméra et le rappel géographique.',
        createdAt: '16/11/2026 à 14:30',
      },
      {
        id: 'c2',
        author: 'Mehdi (Responsable)',
        text: 'C’est noté ! Les modules Expo Camera et OpenStreetMap sont intégrés et fonctionnels.',
        createdAt: '16/11/2026 à 15:10',
      },
    ],
  },
  {
    id: '2',
    title: 'Télécharger les documents via l’API',
    description: 'Tester l’appel API pour récupérer un fichier PDF ou JSON externe avec FileSystem.',
    priority: 'Moyenne',
    status: 'À faire',
    createdAt: '16/11/2026',
    imageUri: null,
    attachedFile: null,
    apiFile: {
      name: 'Cahier_des_charges_Projet.pdf',
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      downloadedUri: null,
      downloadedAt: '16/11/2026 à 11:00',
    },
    reminderDate: null,
    locationReminder: null,
    observers: ['Chef de projet'],
    comments: [
      {
        id: 'c3',
        author: 'Chef de projet',
        text: 'L’API répond avec le code HTTP 200 et le téléchargement fonctionne.',
        createdAt: '16/11/2026 à 11:15',
      },
    ],
  },
  {
    id: '3',
    title: 'Audit de sécurité et permissions',
    description: 'Vérifier les permissions pour la caméra, le stockage de fichiers et la géolocalisation.',
    priority: 'Faible',
    status: 'Terminée',
    createdAt: '15/11/2026',
    imageUri: null,
    attachedFile: {
      name: 'Rapport_Permissions.docx',
      uri: 'file://mock_report.docx',
      size: 45000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    apiFile: null,
    reminderDate: null,
    locationReminder: null,
    observers: ['Professeur'],
    comments: [],
  },
  {
    id: '4',
    title: 'Valider la carte OpenStreetMap',
    description: 'Tester la sélection interactive du repère et le calcul de distance GPS Haversine.',
    priority: 'Élevée',
    status: 'À faire',
    createdAt: '14/11/2026',
    imageUri: null,
    attachedFile: null,
    apiFile: null,
    reminderDate: '2026-11-22T14:00:00.000Z',
    locationReminder: {
      latitude: 48.8584,
      longitude: 2.2945,
      locationName: 'Tour Eiffel, Champ de Mars, Paris',
      radius: 500,
    },
    observers: ['Observateur externe'],
    comments: [],
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
