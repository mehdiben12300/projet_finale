# 📱 MyTasks Pro — Projet Final

Application mobile de gestion de tâches avancée réalisée avec **React Native (Expo)**, intégrant les 6 fonctionnalités multimédias, matérielles et géographiques demandées :

1. 📷 **Communication avec la Caméra & Galerie** (`expo-image-picker`)
2. 📁 **Ajout de fichiers locaux** (`expo-document-picker` & `expo-sharing`)
3. 🌐 **Appel API pour récupérer / télécharger des fichiers** (`expo-file-system`)
4. ⏰ **Rappels programmés à date et heure** (`expo-notifications` & DateTimePicker)
5. 📍 **Rappels par position géographique sur carte OpenStreetMap** (`react-native-webview` / Leaflet & `expo-location`)
6. 👥 **Observateurs & Commentaires de tâches avec notifications locales** (`expo-notifications`)

---

## 🛠️ Détail des 6 Fonctionnalités Implémentées

### 1. 📷 Caméra & Galerie
- Prise de photo directe via la caméra du smartphone (`launchCameraAsync`).
- Sélection d'images depuis la galerie (`launchImageLibraryAsync`).
- Prévisualisation et suppression facile dans le formulaire et l'écran de détails.

### 2. 📁 Ajout de fichier local
- Sélecteur de fichiers (`getDocumentAsync`) compatible PDF, Word, texte, etc.
- Affichage du nom, de la taille (en Ko) et de l'icône du document.
- Possibilité d'ouvrir et de partager le document avec d'autres applications via `expo-sharing`.

### 3. 🌐 Appel API pour récupérer un fichier
- Service dédié `apiFileService.js` illustrant le téléchargement de documents distants (PDF, images, JSON) via `FileSystem.downloadAsync`.
- Enregistrement du fichier téléchargé dans le répertoire sécurisé de l'application (`FileSystem.documentDirectory`).
- Démonstrations prêtes à l'emploi avec des documents d'exemple accessibles en un clic.

### 4. ⏰ Rappel à date et heure
- Sélection intuitive de la date et de l'heure.
- Planification d'une notification locale automatique (`Notifications.scheduleNotificationAsync`).
- Badge d'alarme ⏰ sur les cartes de tâches.

### 5. 📍 Rappel par position géographique (Carte OpenStreetMap)
- Intégration d'une carte interactive **OpenStreetMap** (Leaflet.js) : **100% gratuit, sans clé d'API Google Maps payante**.
- Possibilité de cliquer sur la carte pour choisir un point de repère ou d'utiliser le bouton **"Ma position GPS actuelle"** (`expo-location`).
- Reverse geocoding automatique via **Nominatim OpenStreetMap** pour obtenir l'adresse humaine du lieu.
- Bouton **"Tester ma proximité GPS"** avec calcul de distance en mètres (formule Haversine) et alerte de proximité si l'utilisateur est à moins de 500m !

### 6. 👥 Observateurs & Commentaires avec notifications
- Système collaboratif d'observateurs (ex: *Professeur*, *Chef de projet*, *Mehdi*, etc.).
- Historique de discussion daté avec bulles de messages et initiales d'avatar.
- **Déclenchement automatique d'une notification locale** dès qu'un observateur publie un commentaire !

---

## 🚀 Lancement de l'Application

Dans un terminal PowerShell :

```powershell
cd "C:\Users\mehdi\OneDrive\Desktop\projet react native\prjtfinale"
npx.cmd expo start --port 8084
```

- **Sur votre smartphone (Recommandé pour tester caméra & GPS)** : Scannez le QR Code avec l'application **Expo Go**.
- **Sur votre navigateur (PC)** : Appuyez sur la touche **`w`** (ouvre l'application sur `http://localhost:8084`).
