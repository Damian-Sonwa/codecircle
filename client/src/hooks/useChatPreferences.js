import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'chat-preferences';
const defaultPrefs = {
  sound: true,
  vibration: false,
};

const readStoredPreferences = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw);
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : defaultPrefs.sound,
      vibration:
        typeof parsed.vibration === 'boolean' ? parsed.vibration : defaultPrefs.vibration,
    };
  } catch (error) {
    console.warn('Failed to parse chat preferences from storage', error);
    return defaultPrefs;
  }
};

export const useChatPreferences = () => {
  const [preferences, setPreferences] = useState(defaultPrefs);

  useEffect(() => {
    setPreferences(readStoredPreferences());
  }, []);

  const updatePreferences = useCallback((updater) => {
    setPreferences((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    updatePreferences((prev) => ({ ...prev, sound: !prev.sound }));
  }, [updatePreferences]);

  const toggleVibration = useCallback(() => {
    updatePreferences((prev) => ({ ...prev, vibration: !prev.vibration }));
  }, [updatePreferences]);

  return {
    preferences,
    toggleSound,
    toggleVibration,
  };
};



