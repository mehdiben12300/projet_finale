import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const apiFileService = {
  // Liste d'exemples de fichiers téléchargeables depuis une API
  sampleApiFiles: [
    {
      id: 'pdf-sample',
      name: 'Cahier_des_charges_Projet.pdf',
      type: 'PDF',
      url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf',
      description: 'Document officiel du projet récupéré depuis l’API.',
    },
    {
      id: 'image-sample',
      name: 'Architecture_Systeme.png',
      type: 'Image',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
      description: 'Diagramme d’architecture téléchargé via l’API.',
    },
    {
      id: 'json-sample',
      name: 'Rapport_Statistiques.json',
      type: 'JSON',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      description: 'Données brutes récupérées depuis l’API REST.',
    },
  ],

  /**
   * Comment appeler une API pour récupérer et enregistrer un fichier :
   * 1. On lance une requête de téléchargement vers l'URL de l'API.
   * 2. Le fichier est enregistré dans le répertoire local sécurisé (FileSystem.documentDirectory).
   * 3. On retourne l'URI local et les métadonnées.
   */
  async downloadFileFromApi(fileUrl, fileName) {
    try {
      // 1. Mode Web : Téléchargement direct par le navigateur
      if (Platform.OS === 'web') {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        return {
          uri: objectUrl,
          name: fileName || 'fichier_telecharge',
          size: blob.size,
          downloadedAt: new Date().toLocaleTimeString(),
          isWeb: true,
        };
      }

      // 2. Mode Mobile (Android / iOS) avec Expo FileSystem
      const cleanFileName = (fileName || `api_file_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const destinationUri = `${FileSystem.documentDirectory}${cleanFileName}`;

      const downloadResult = await FileSystem.downloadAsync(fileUrl, destinationUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Le serveur API a retourné le code : ${downloadResult.status}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);

      return {
        uri: downloadResult.uri,
        name: cleanFileName,
        size: fileInfo.size || 0,
        downloadedAt: new Date().toLocaleTimeString(),
        isWeb: false,
      };
    } catch (error) {
      console.error('Erreur téléchargement API :', error);
      throw error;
    }
  },

  // Ouvrir / Partager un fichier téléchargé
  async openOrShareFile(fileUri) {
    if (Platform.OS === 'web') {
      window.open(fileUri, '_blank');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri);
    } else {
      throw new Error("Le partage de fichier n'est pas disponible sur cet appareil.");
    }
  },
};

export default apiFileService;
