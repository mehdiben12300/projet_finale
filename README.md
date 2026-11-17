# 📱 MyTasks Pro — Projet Final (Complet & Hybride)

Application mobile et web complète de gestion collaborative de tâches réalisée avec **React Native (Expo)** et un serveur **Node.js / Express REST API**.
Le projet combine le stockage local hors-ligne (**AsyncStorage**), la synchronisation en ligne (**REST API**), les capteurs du smartphone, la cartographie interactive et la gestion collaborative par observateurs.

---

## 🌟 Points Forts & Fonctionnalités Clés

### 1. 🔄 Mode Hybride : Hors-Ligne (Offline-First) + En Ligne (API REST)
- Fonctionne **100% sans connexion internet** grâce à `@react-native-async-storage/async-storage`.
- Dès que le serveur API est joignable, les modifications locales en attente sont synchronisées par lot (`POST /api/tasks/sync`).
- Indicateur visuel d'état de synchronisation en temps réel (cercle vert / orange / bleu dans l'en-tête).

### 2. 📷 Capteurs Matériels : Caméra & Galerie (`expo-image-picker`)
- Capture photo directe en direct via la caméra du smartphone.
- Importation d'images depuis la galerie avec recadrage et compression.
- Visualisation instantanée de la miniature sur la fiche de tâche.

### 3. 📁 Gestion des Pièces Jointes & Fichiers (`expo-document-picker` & `expo-sharing`)
- Ajout de documents (PDF, Word, TXT, images) jusqu'à 10 Mo.
- Ouverture et partage avec les applications natives du téléphone.

### 4. 🌐 Téléchargement de Fichiers via API Distante (`expo-file-system`)
- Service dédié `apiFileService.js` permettant d'appeler une API REST pour récupérer un fichier distant.
- Enregistrement du fichier téléchargé dans l'espace de stockage sécurisé de l'application (`FileSystem.documentDirectory`).
- Endpoint dédié sur le backend : `GET /api/files/sample` générant un document officiel à la volée.

### 5. ⏰ Rappel Programmable à Date et Heure (`expo-notifications`)
- Planification précise de rappels temporels avec sélecteur de date/heure.
- Déclenchement automatique de notifications push locales sur l'appareil.

### 6. 📍 Position GPS & Carte OpenStreetMap (`expo-location` & Leaflet.js)
- Bouton **"🎯 Capturer"** pour enregistrer automatiquement les coordonnées GPS actuelles.
- Géocodage inverse automatique via **Nominatim OpenStreetMap** pour afficher l'adresse textuelle.
- Visualisation interactive sur carte **OpenStreetMap** (100% gratuit, sans clé payante Google Maps).
- Calcul de distance de proximité (formule de Haversine) et alerte si l'utilisateur approche du lieu.

### 7. 👥 Multi-Utilisateurs, Observateurs & Discussions d'Équipe
- Sélecteur rapide d'utilisateurs sur l'écran d'accueil (*Mehdi*, *Professeur*, *Dr. Ben Ali*, *Sarah*, ou compte personnalisé).
- Gestion des observateurs sur chaque tâche avec 3 rôles officiels :
  - `observer` : Simple observateur / suiveur de l'avancement.
  - `assignee` : Personne assignée à la réalisation.
  - `responsible` : Responsable ou encadrant de la tâche.
- Espace de discussion / commentaires daté avec **notification push locale instantanée** envoyée à chaque nouveau commentaire.
- Filtres dans la liste des tâches : **"Toutes les tâches"** vs **"Mes tâches"** (pour voir les tâches créées par vous ou où vous êtes observateur).

### 8. 🎨 Design 100% Fidèle à la Maquette
- Écran de détails conforme au pixel près à la maquette demandée :
  - Carte 1 : Tâche avec barre d'accentuation couleur, badges, description en italique, date de création et **bouton flottant roue dentée ⚙️**.
  - Carte 2 : **Pièces jointes** avec boutons pilules `+ Fichier` et `📷 Photo`.
  - Carte 3 : **Observateurs** avec champ `Nom du suiveur`, bouton `+ Ajouter`, et sélecteur de rôles `observer | assignee | responsible`.
  - Carte 4 : **Positions** avec bouton pilule `🎯 Capturer` et adresse GPS.
  - Carte 5 : **Discussions** avec commentaires d'équipe.
  - Bas d'écran : Bouton large `✏️ Modifier` et barre d'onglets inférieure toujours visible.

---

## 🚀 Guide de Démarrage Rapide

### 1. Démarrer le Serveur Backend (API)
Ouvrez un premier terminal PowerShell :
```powershell
cd "C:\Users\mehdi\OneDrive\Desktop\projet react native\backend"
npm.cmd start
```
Le serveur écoute sur le port **3000** :
- PC : `http://localhost:3000/api/tasks`
- Mobile (Wi-Fi) : `http://192.168.1.2:3000/api/tasks`

### 2. Démarrer l'Application React Native (Expo)
Ouvrez un deuxième terminal PowerShell :
```powershell
cd "C:\Users\mehdi\OneDrive\Desktop\projet react native\prjtfinale"
npx.cmd expo start --port 8084
```

- **Pour tester sur PC (Navigateur Opera GX / Chrome)** : Appuyez sur la touche **`w`** dans le terminal, l'application s'ouvrira sur `http://localhost:8084`.
- **Pour tester sur Smartphone (Caméra & GPS réels)** : Scannez le QR Code affiché dans le terminal avec l'application **Expo Go** (Android / iOS).
