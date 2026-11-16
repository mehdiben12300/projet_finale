import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import notificationService from '../services/notificationService';

const DEFAULT_OBSERVERS = [
  'Professeur',
  'Chef de projet',
  'Mehdi (Responsable)',
  'Observateur externe',
];

export const CommentSection = ({ task, onAddComment }) => {
  const [selectedObserver, setSelectedObserver] = useState(DEFAULT_OBSERVERS[0]);
  const [customAuthor, setCustomAuthor] = useState('');
  const [commentText, setCommentText] = useState('');

  const comments = task.comments || [];

  const handlePostComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un texte de commentaire.');
      return;
    }

    const author = customAuthor.trim() || selectedObserver;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')} à ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newComment = {
      id: Date.now().toString(),
      author,
      text: commentText.trim(),
      createdAt: formattedDate,
    };

    // 1. Ajouter le commentaire à la tâche
    await onAddComment(newComment);

    // 2. Déclencher la notification locale du commentaire
    await notificationService.notifyCommentAdded({
      taskTitle: task.title,
      author,
      commentText: commentText.trim(),
    });

    setCommentText('');
    setCustomAuthor('');
  };

  const getInitials = (name) => {
    if (!name) return 'OB';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Ionicons name="chatbubbles-outline" size={20} color="#0284C7" />
          <Text style={styles.title}>Observateurs & Commentaires</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{comments.length}</Text>
        </View>
      </View>

      {/* Liste des commentaires existants */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>Aucun commentaire d'observateur pour le moment.</Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((item) => (
            <View key={item.id} style={styles.commentItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.author)}</Text>
              </View>
              <View style={styles.commentContent}>
                <View style={styles.authorRow}>
                  <Text style={styles.authorName}>{item.author}</Text>
                  <Text style={styles.commentDate}>{item.createdAt}</Text>
                </View>
                <Text style={styles.commentBody}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Formulaire d'ajout de commentaire */}
      <View style={styles.formContainer}>
        <Text style={styles.formLabel}>Publier en tant qu'observateur :</Text>

        {/* Badges de sélection rapide d'observateur */}
        <View style={styles.observerPills}>
          {DEFAULT_OBSERVERS.map((obs) => {
            const isSelected = selectedObserver === obs && !customAuthor;
            return (
              <TouchableOpacity
                key={obs}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => {
                  setSelectedObserver(obs);
                  setCustomAuthor('');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {obs}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Champ nom personnalisé optionnel */}
        <TextInput
          style={styles.customAuthorInput}
          placeholder="Ou entrez un autre nom d'observateur..."
          placeholderTextColor="#94A3B8"
          value={customAuthor}
          onChangeText={setCustomAuthor}
        />

        {/* Champ texte du commentaire */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Écrire une observation ou remarque..."
            placeholderTextColor="#94A3B8"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
            onPress={handlePostComment}
            disabled={!commentText.trim()}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeCount: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  commentsList: {
    gap: 12,
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  commentContent: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  commentDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  formContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  observerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillActive: {
    backgroundColor: '#0284C7',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  customAuthorInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#0284C7',
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});

export default CommentSection;
