import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Élevée':
      return { border: '#EF4444', bg: '#FEE2E2', text: '#DC2626' };
    case 'Moyenne':
      return { border: '#F59E0B', bg: '#FEF3C7', text: '#D97706' };
    case 'Faible':
    default:
      return { border: '#10B981', bg: '#DCFCE7', text: '#16A34A' };
  }
};

const getStatusColor = (status) => {
  if (status === 'Terminée' || status === 'Terminées') {
    return { bg: '#DCFCE7', text: '#16A34A' };
  }
  return { bg: '#E0F2FE', text: '#0284C7' };
};

export const TaskCard = ({ task, onPress }) => {
  const priorityColor = getPriorityColor(task.priority);
  const statusColor = getStatusColor(task.status);

  const commentsCount = (task.comments && task.comments.length) || 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Barre d'accentuation couleur priorité sur la gauche */}
      <View style={[styles.accentBar, { backgroundColor: priorityColor.border }]} />

      <View style={styles.content}>
        {/* Ligne Titre + Petite miniature si photo présente */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          {task.imageUri && (
            <Image source={{ uri: task.imageUri }} style={styles.thumbnail} />
          )}
        </View>

        {/* Badges Priorité et Statut */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: priorityColor.bg }]}>
            <Text style={[styles.badgeText, { color: priorityColor.text }]}>
              {task.priority}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>
              {task.status}
            </Text>
          </View>
        </View>

        {/* Badges indicateurs des fonctionnalités avancées */}
        <View style={styles.featuresRow}>
          {task.author && (
            <View style={[styles.featurePill, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="person" size={12} color="#0284C7" />
              <Text style={[styles.featurePillText, { color: '#0369A1' }]}>{task.author}</Text>
            </View>
          )}

          {task.observers && task.observers.length > 0 && (
            <View style={[styles.featurePill, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="people" size={12} color="#7C3AED" />
              <Text style={[styles.featurePillText, { color: '#6D28D9' }]}>
                {task.observers.length} obs.
              </Text>
            </View>
          )}

          {task.imageUri && (
            <View style={styles.featurePill}>
              <Ionicons name="camera" size={12} color="#0284C7" />
              <Text style={styles.featurePillText}>Photo</Text>
            </View>
          )}

          {(task.attachedFile || task.apiFile) && (
            <View style={styles.featurePill}>
              <Ionicons name="document-attach" size={12} color="#6366F1" />
              <Text style={styles.featurePillText}>
                {task.apiFile ? 'Fichier API' : 'Fichier'}
              </Text>
            </View>
          )}

          {task.reminderDate && (
            <View style={[styles.featurePill, styles.reminderPill]}>
              <Ionicons name="alarm" size={12} color="#D97706" />
              <Text style={[styles.featurePillText, { color: '#B45309' }]}>
                Rappel {new Date(task.reminderDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </Text>
            </View>
          )}

          {task.locationReminder && (
            <View style={[styles.featurePill, styles.locationPill]}>
              <Ionicons name="location" size={12} color="#DC2626" />
              <Text style={[styles.featurePillText, { color: '#DC2626' }]} numberOfLines={1}>
                {task.locationReminder.locationName ? task.locationReminder.locationName.split(',')[0] : 'GPS'}
              </Text>
            </View>
          )}

          {commentsCount > 0 && (
            <View style={styles.featurePill}>
              <Ionicons name="chatbubble" size={12} color="#64748B" />
              <Text style={styles.featurePillText}>{commentsCount}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {task.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        {/* Ligne inférieure : Date de création et chevron */}
        <View style={styles.footerRow}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text style={styles.dateText}>Créée le {task.createdAt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reminderPill: {
    backgroundColor: '#FEF3C7',
  },
  locationPill: {
    backgroundColor: '#FEE2E2',
    maxWidth: 160,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

export default TaskCard;
