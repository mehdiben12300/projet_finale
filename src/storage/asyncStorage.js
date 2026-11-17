import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mytasks_final_tasks';

export const initialTasks = [
  {
    id: '1',
    title: 'Debug obs',
    description: '', // Description vide pour afficher 'Aucune description fournie.' exactement comme sur la capture
    priority: 'Moyenne',
    status: 'À faire',
    createdAt: '17/11/2026',
    author: 'Mehdi',
    imageUri: null,
    attachedFile: null,
    apiFile: null,
    reminderDate: null,
    locationReminder: null,
    observers: [
      { id: 'obs_1', name: 'Professeur', role: 'observer', addedAt: '17/11/2026' },
      { id: 'obs_2', name: 'Sarah', role: 'assignee', addedAt: '17/11/2026' },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Professeur',
        text: "Veuillez vérifier que l'invitation des observateurs et la restriction des modifications fonctionnent bien.",
        createdAt: '17/11/2026 à 10:15',
      },
      {
        id: 'c2',
        author: 'Mehdi',
        text: "C'est fait ! Vous êtes invité en tant qu'observateur : vous pouvez commenter mais les boutons de fichiers et GPS sont protégés.",
        createdAt: '17/11/2026 à 10:30',
      },
    ],
  },
  {
    id: '2',
    title: 'Validation du rapport de soutenance',
    description: 'Revue complète du document PDF de soutenance et validation des annexes techniques.',
    priority: 'Élevée',
    status: 'À faire',
    createdAt: '16/11/2026',
    author: 'Professeur',
    imageUri: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
    attachedFile: {
      name: 'Rapport_Soutenance_V2.pdf',
      uri: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      size: 245000,
      mimeType: 'application/pdf',
    },
    apiFile: null,
    reminderDate: '2026-11-20T09:00:00.000Z',
    locationReminder: {
      latitude: 36.8065,
      longitude: 10.1815,
      locationName: 'Campus Universitaire / Bureau du Professeur',
      radius: 300,
    },
    observers: [
      { id: 'obs_3', name: 'Mehdi', role: 'assignee', addedAt: '16/11/2026' },
    ],
    comments: [
      {
        id: 'c3',
        author: 'Professeur',
        text: "J'ai téléversé la version 2 du rapport en pièce jointe. Mehdi, vérifie les diagrammes de classe.",
        createdAt: '16/11/2026 à 14:00',
      },
      {
        id: 'c4',
        author: 'Mehdi',
        text: "Bien reçu Professeur, je consulte le PDF et j'ajoute les captures des capteurs GPS.",
        createdAt: '16/11/2026 à 14:40',
      },
    ],
  },
  {
    id: '3',
    title: 'Test des capteurs Caméra et GPS sur terrain',
    description: 'Vérification de la détection de proximité géographique Leaflet et prise de photos haute résolution.',
    priority: 'Élevée',
    status: 'Terminée',
    createdAt: '15/11/2026',
    author: 'Sarah',
    imageUri: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80',
    attachedFile: null,
    apiFile: {
      name: 'Releve_Terrain_Capteurs.json',
      url: 'http://localhost:3000/api/files/sample',
      downloadedUri: null,
      downloadedAt: '15/11/2026 à 16:30',
    },
    reminderDate: null,
    locationReminder: {
      latitude: 36.8188,
      longitude: 10.1660,
      locationName: 'Parc Technologique / Laboratoire Mobile',
      radius: 400,
    },
    observers: [
      { id: 'obs_4', name: 'Dr. Ben Ali', role: 'responsible', addedAt: '15/11/2026' },
      { id: 'obs_5', name: 'Mehdi', role: 'observer', addedAt: '15/11/2026' },
    ],
    comments: [
      {
        id: 'c5',
        author: 'Sarah',
        text: 'Les tests terrain sont terminés avec succès, photo et position GPS enregistrées.',
        createdAt: '15/11/2026 à 17:00',
      },
      {
        id: 'c6',
        author: 'Dr. Ben Ali',
        text: "Très bien, la précision GPS à 400m déclenche l'alerte correctement.",
        createdAt: '15/11/2026 à 17:20',
      },
    ],
  },
  {
    id: '4',
    title: 'Audit de sécurité et révision du code source',
    description: 'Contrôle des règles de permissions (créateur, invité, visiteur) et validation des endpoints REST.',
    priority: 'Faible',
    status: 'À faire',
    createdAt: '14/11/2026',
    author: 'Dr. Ben Ali',
    imageUri: null,
    attachedFile: {
      name: 'Checklist_Securite_RBAC.pdf',
      uri: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      size: 115000,
      mimeType: 'application/pdf',
    },
    apiFile: null,
    reminderDate: '2026-11-22T14:30:00.000Z',
    locationReminder: {
      latitude: 36.8333,
      longitude: 10.2333,
      locationName: 'Laboratoire de Recherche Informatique',
      radius: 250,
    },
    observers: [
      { id: 'obs_6', name: 'Sarah', role: 'assignee', addedAt: '14/11/2026' },
    ],
    comments: [
      {
        id: 'c7',
        author: 'Dr. Ben Ali',
        text: 'Seule Sarah est invitée sur cette tâche. Mehdi et le Professeur doivent la voir en consultation seule.',
        createdAt: '14/11/2026 à 11:20',
      },
      {
        id: 'c8',
        author: 'Sarah',
        text: "Confirmé : pour les non-invités, la boîte de discussion est verrouillée et aucun fichier n'est modifiable.",
        createdAt: '14/11/2026 à 11:55',
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
