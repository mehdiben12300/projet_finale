import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = '@mytasks_auth_user';

export const DEFAULT_USERS = [
  { id: 'u1', name: 'Mehdi', role: 'Chef de projet', avatar: '👨‍💻' },
  { id: 'u2', name: 'Professeur', role: 'Observateur Principal', avatar: '👨‍🏫' },
  { id: 'u3', name: 'Dr. Ben Ali', role: 'Encadrant', avatar: '🎓' },
  { id: 'u4', name: 'Sarah', role: 'Développeuse', avatar: '👩‍💻' },
];

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(DEFAULT_USERS[0]); // Par défaut Mehdi

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Erreur chargement utilisateur:', e);
      }
    };
    loadUser();
  }, []);

  const switchUser = async (user) => {
    setCurrentUser(user);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  };

  const loginWithCustomName = async (name, role = 'Observateur') => {
    const newUser = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      role: role.trim(),
      avatar: '👤',
    };
    setCurrentUser(newUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers: DEFAULT_USERS,
        switchUser,
        loginWithCustomName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
