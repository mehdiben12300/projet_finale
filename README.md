# 📱 MyTasks Pro — Projet Final (Complet & Hybride)

Application mobile et web complète de gestion collaborative de tâches réalisée avec **React Native (Expo)** et un serveur **Node.js / Express REST API**.
Le projet combine le stockage local hors-ligne (**AsyncStorage**), la synchronisation en ligne (**REST API**), les capteurs du smartphone, la cartographie interactive, la détection GPS d'arrivée et un contrôle d'accès strict à 3 niveaux.

---

## 🌟 Points Forts & Fonctionnalités Clés

### 1. 🔄 Mode Hybride : Hors-Ligne (Offline-First) + En Ligne (API REST)
- Fonctionne **100% sans connexion internet** grâce à `@react-native-async-storage/async-storage`.
- Dès que le serveur API est joignable, les modifications locales en attente sont synchronisées par lot (`POST /api/tasks/sync`).
- Indicateur visuel d'état de synchronisation en temps réel (cercle vert / orange / bleu dans l'en-tête).

### 2. 🔐 Modèle de Permissions à 3 Niveaux (Créateur, Assigné, Non-assigné)
- **👑 Créateur (Auteur)** :
  - Contrôle total : ajout/suppression de fichiers et photos, capture GPS, modification de l'épingle sur carte Leaflet, programmation de rappel date/heure, ajout de collaborateurs, modification des détails et discussion.
- **🤝 Collaborateur Assigné** :
  - Consultation des informations de la tâche.
  - Boutons de modification sous protection (cliquer affiche une alerte de permission requise).
  - **Discussion ouverte** : peut lire l'historique et participer activement au chat de la tâche.
  - **Détection GPS d'arrivée** : alerte automatique dès qu'il arrive sur le lieu défini par le créateur (< 500m).
- **👁️ Non-assigné** :
  - Consultation des informations générales en lecture seule.
  - **Discussion complètement verrouillée et masquée** : aucun message visible + boîte confidentielle avec cadenas.
  - Boutons de proximité masqués.

### 3. 📷 Capteurs Matériels : Caméra & Galerie (`expo-image-picker`)
- Capture photo directe via la caméra du smartphone.
- Importation d'images depuis la galerie avec recadrage et compression.
- Visualisation instantanée de la miniature sur la fiche de tâche.

### 4. 📎 Gestion des Pièces Jointes & Fichiers (`expo-document-picker` & `expo-sharing`)
- Ajout de documents (PDF, Word, TXT, images) jusqu'à 10 Mo.
- Ouverture et partage avec les applications natives du téléphone.

### 5. 🌐 Téléchargement de Fichiers via API Distante (`expo-file-system`)
- Service dédié `apiFileService.js` permettant d'appeler l'API REST pour récupérer un fichier distant.
- Enregistrement du fichier téléchargé dans l'espace sécurisé de l'application (`FileSystem.documentDirectory`).
- Endpoint dédié sur le backend : `GET /api/files/sample` générant un document officiel à la volée.

### 6. ⏰ Rappel Programmable à Date et Heure (`expo-notifications`)
- Planification précise de rappels temporels avec sélecteur de date/heure.
- Déclenchement automatique de notifications push locales sur l'appareil.

### 7. 📍 Position GPS & Carte OpenStreetMap (`expo-location` & Leaflet.js)
- Bouton **"🎯 Capturer"** pour enregistrer automatiquement les coordonnées GPS actuelles.
- Géocodage inverse automatique via **Nominatim OpenStreetMap** pour afficher l'adresse textuelle.
- Visualisation interactive sur carte **OpenStreetMap** (100% gratuit, sans clé Google Maps).
- Calcul de distance de proximité (formule de Haversine) avec notification automatique à l'arrivée.

### 8. 👥 Multi-Utilisateurs & Changement Rapide de Profil
- Sélecteur rapide d'utilisateurs en haut de l'écran :
  `[👨‍💻 Mehdi]  [👨‍🏫 Professeur]  [🎓 Dr. Ben Ali]  [👩‍💻 Sarah]`
- Permet de tester instantanément les 3 rôles (Créateur, Assigné, Non-assigné) en quelques secondes pendant l'évaluation.

### 9. 🎨 Design Conforme à la Maquette Universitaire
- Écran de détails fidèle au pixel près :
  - Carte 1 : Tâche avec barre d'accentuation couleur, badges, description en italique, date de création et roue dentée ⚙️.
  - Carte 2 : **Pièces jointes** avec boutons pilules `+ Fichier` et `📷 Photo`.
  - Carte 3 : **Suiveurs / Assignés** avec champ `Nom du suiveur`, bouton `+ Ajouter`, et sélecteur de rôles.
  - Carte 4 : **Positions** avec bouton pilule `🎯 Capturer` et adresse GPS.
  - Carte 5 : **Discussions** avec commentaires d'équipe.
  - Bas d'écran : Bouton large `✏️ Modifier` et barre d'onglets inférieure.

---

## 🚀 Guide de Démarrage Rapide

### 1. Démarrer le Serveur Backend (API REST)
Dans un terminal PowerShell :
```powershell
cd "backend"
npm start
```
Le serveur écoute sur le port **3000** :
- PC : `http://localhost:3000/api/tasks`
- Mobile (Wi-Fi) : `http://192.168.1.2:3000/api/tasks`

### 2. Démarrer l'Application Mobile (Expo)
Dans un deuxième terminal PowerShell :
```powershell
npm start
# ou
npx expo start --port 8084
```

- **Sur PC (Navigateur)** : Appuyez sur la touche **`w`** dans le terminal, l'application s'ouvrira sur `http://localhost:8084`.
- **Sur Smartphone (Expo Go)** : Scannez le QR Code affiché dans le terminal avec l'application **Expo Go** (Android / iOS).
