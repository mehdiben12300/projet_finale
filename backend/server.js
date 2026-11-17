const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');

app.use(cors());
app.use(express.json());

// Données initiales
const initialTasks = [
  {
    id: '1',
    title: 'Debug obs',
    description: '',
    priority: 'Moyenne',
    status: 'À faire',
    createdAt: '17/11/2026',
    author: 'Mehdi',
    imageUri: null,
    attachedFile: null,
    apiFile: null,
    reminderDate: null,
    locationReminder: null,
    observers: [],
    comments: [],
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  },
];

// Lecture des données
function getTasks() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialTasks, null, 2), 'utf-8');
    return initialTasks;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erreur lecture tasks.json, réinitialisation :', err);
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialTasks, null, 2), 'utf-8');
    return initialTasks;
  }
}

// Écriture des données
function saveTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

// 1. Lister toutes les tâches
app.get('/api/tasks', (req, res) => {
  const tasks = getTasks();
  res.json(tasks);
});

// 2. Obtenir une tâche par son ID
app.get('/api/tasks/:id', (req, res) => {
  const tasks = getTasks();
  const task = tasks.find((t) => String(t.id) === String(req.params.id));
  if (!task) {
    return res.status(404).json({ message: 'Tâche non trouvée' });
  }
  res.json(task);
});

// Endpoint pour télécharger un fichier d'exemple depuis l'API backend
app.get('/api/files/sample', (req, res) => {
  const sampleContent = `========================================================
CAHIER DES CHARGES - APPLICATION MYTASKS PRO
========================================================
Projet universitaire React Native
Fonctionnalités validées :
1. Stockage hybride (AsyncStorage hors-ligne + Synchronisation API REST en ligne)
2. Capteurs : Caméra (Expo ImagePicker) & Géolocalisation GPS (Expo Location)
3. Cartographie OpenStreetMap interactive
4. Gestion des observateurs (assignee, responsible, observer)
5. Commentaires d'équipe & Notifications instantanées
6. Rappel temporel et téléchargement de documents API
========================================================
Fichier généré automatiquement par le serveur Backend.`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Cahier_des_charges_API.txt"');
  res.send(sampleContent);
});

// 3. Créer une nouvelle tâche
app.post('/api/tasks', (req, res) => {
  const {
    title,
    description,
    priority,
    status,
    author,
    imageUri,
    attachedFile,
    apiFile,
    reminderDate,
    locationReminder,
    observers,
    allowedCommenters,
    comments,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Le titre est obligatoire' });
  }

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1
  ).padStart(2, '0')}/${today.getFullYear()}`;

  const tasks = getTasks();
  const newTask = {
    id: Date.now().toString(),
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: priority || 'Moyenne',
    status: status || 'À faire',
    createdAt: formattedDate,
    author: author || 'Mehdi',
    imageUri: imageUri || null,
    attachedFile: attachedFile || null,
    apiFile: apiFile || null,
    reminderDate: reminderDate || null,
    locationReminder: locationReminder || null,
    observers: Array.isArray(observers) ? observers : [],
    allowedCommenters: Array.isArray(allowedCommenters)
      ? allowedCommenters
      : [author || 'Mehdi', 'Professeur'],
    comments: Array.isArray(comments) ? comments : [],
    updatedAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  saveTasks(tasks);

  res.status(201).json(newTask);
});

// 4. Modifier une tâche existante
app.put('/api/tasks/:id', (req, res) => {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => String(t.id) === String(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: 'Tâche non trouvée' });
  }

  const existing = tasks[index];
  const updatedTask = {
    ...existing,
    ...req.body,
    id: existing.id, // Ne pas écraser l'ID
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updatedTask;
  saveTasks(tasks);

  res.json(updatedTask);
});

// 5. Supprimer une tâche
app.delete('/api/tasks/:id', (req, res) => {
  let tasks = getTasks();
  const exists = tasks.some((t) => String(t.id) === String(req.params.id));

  if (!exists) {
    return res.status(404).json({ message: 'Tâche non trouvée' });
  }

  tasks = tasks.filter((t) => String(t.id) !== String(req.params.id));
  saveTasks(tasks);

  res.json({ message: 'Tâche supprimée avec succès', id: req.params.id });
});

// 6. Synchronisation par lot (utilisé par le projet local+enligne)
app.post('/api/tasks/sync', (req, res) => {
  const { changes = [] } = req.body;
  let tasks = getTasks();

  changes.forEach((action) => {
    if (action.type === 'create') {
      const exists = tasks.some((t) => t.id === action.task.id);
      if (!exists) {
        tasks.unshift({
          ...action.task,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (action.type === 'update') {
      const idx = tasks.findIndex((t) => String(t.id) === String(action.task.id));
      if (idx !== -1) {
        tasks[idx] = {
          ...tasks[idx],
          ...action.task,
          updatedAt: new Date().toISOString(),
        };
      }
    } else if (action.type === 'delete') {
      tasks = tasks.filter((t) => String(t.id) !== String(action.id));
    }
  });

  saveTasks(tasks);
  res.json({ success: true, tasks });
});

// 7. Réinitialiser les données aux tâches par défaut
app.post('/api/tasks/reset', (req, res) => {
  saveTasks(initialTasks);
  res.json({ message: 'Données réinitialisées avec succès', tasks: initialTasks });
});

// Trouver l'adresse IP locale Wi-Fi de la machine
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !name.toLowerCase().includes('vmware') && !name.toLowerCase().includes('vethernet')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log(`🚀 Serveur API REST MyTasks démarré avec succès !`);
  console.log(`📡 URL Locale (PC)   : http://localhost:${PORT}/api/tasks`);
  console.log(`📱 URL Réseau (Mobile): http://${localIp}:${PORT}/api/tasks`);
  console.log('========================================================');
});
