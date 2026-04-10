export const STORAGE_KEY = '@hyperactive_logs';

let memoryLogs = null;
let pendingWriteTimeout = null;
let flushListenersInstalled = false;

const getLocalDateKey = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split('T')[0];
};

const normalizeWorkoutEntry = (entry, exerciseMeta = {}) => {
  if (!entry) return null;

  if (entry.kind) {
    return entry;
  }

  const isCardio =
    exerciseMeta.type === 'cardio' ||
    (typeof entry.kg === 'string' && entry.kg.includes('min')) ||
    (typeof entry.reps === 'string' && entry.reps.includes('km'));

  if (isCardio) {
    return {
      kind: 'cardio',
      primary: parseFloat(String(entry.kg).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
      secondary: parseFloat(String(entry.reps).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
      primaryUnit: 'min',
      secondaryUnit: 'km',
      timestamp: entry.timestamp || Date.now(),
    };
  }

  return {
    kind: 'strength',
    primary: Number(entry.kg) || 0,
    secondary: Number(entry.reps) || 0,
    primaryUnit: 'kg',
    secondaryUnit: 'reps',
    timestamp: entry.timestamp || Date.now(),
  };
};

const normalizeSession = (session, fallbackWorkoutId) => {
  if (!session) return null;

  const workoutId = session.workoutId || fallbackWorkoutId;
  const exercises = session.exercises && typeof session.exercises === 'object' ? session.exercises : {};

  if (!workoutId || Object.keys(exercises).length === 0) {
    return null;
  }

  return {
    workoutId,
    exercises,
    updatedAt: session.updatedAt || Date.now(),
  };
};

const normalizeDayEntry = (entry, dateKey) => {
  const normalized = {
    date: entry?.date || dateKey,
    sessions: {},
    nutrition: {
      water: Number(entry?.nutrition?.water) || 0,
      calories: Number(entry?.nutrition?.calories) || 0,
    },
  };

  if (entry?.sessions && typeof entry.sessions === 'object') {
    Object.entries(entry.sessions).forEach(([sessionKey, sessionValue]) => {
      const session = normalizeSession(sessionValue, sessionKey);
      if (session) {
        normalized.sessions[session.workoutId] = session;
      }
    });
  }

  if (Object.keys(normalized.sessions).length === 0 && entry?.workoutId && entry?.exercises) {
    const legacySession = normalizeSession(
      {
        workoutId: entry.workoutId,
        exercises: entry.exercises,
        updatedAt: entry.updatedAt,
      },
      entry.workoutId
    );

    if (legacySession) {
      normalized.sessions[legacySession.workoutId] = legacySession;
    }
  }

  return normalized;
};

const parseLogsFromStorage = () => {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY);
    const parsed = existingStr ? JSON.parse(existingStr) : {};

    return Object.entries(parsed).reduce((accumulator, [dateKey, entry]) => {
      accumulator[dateKey] = normalizeDayEntry(entry, dateKey);
      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const flushLogsToStorage = () => {
  if (pendingWriteTimeout) {
    clearTimeout(pendingWriteTimeout);
    pendingWriteTimeout = null;
  }

  if (!memoryLogs) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryLogs));
  } catch (error) {
    console.error('Failed to flush logs', error);
  }
};

const installFlushListeners = () => {
  if (flushListenersInstalled || typeof window === 'undefined') {
    return;
  }

  const flushOnHide = () => flushLogsToStorage();
  window.addEventListener('pagehide', flushOnHide);
  window.addEventListener('beforeunload', flushOnHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushLogsToStorage();
    }
  });
  flushListenersInstalled = true;
};

const scheduleWrite = () => {
  if (pendingWriteTimeout) {
    clearTimeout(pendingWriteTimeout);
  }

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    pendingWriteTimeout = window.setTimeout(() => {
      window.requestIdleCallback(() => {
        flushLogsToStorage();
      });
    }, 180);
    return;
  }

  pendingWriteTimeout = window.setTimeout(() => {
    flushLogsToStorage();
  }, 180);
};

const readLogs = () => {
  if (memoryLogs) {
    return memoryLogs;
  }

  memoryLogs = parseLogsFromStorage();
  installFlushListeners();
  return memoryLogs;
};

const writeLogs = (logs) => {
  memoryLogs = logs;
  scheduleWrite();
};

export const getWorkoutSessions = (entry) => {
  if (!entry?.sessions) return [];

  return Object.values(entry.sessions)
    .filter((session) => session?.workoutId && Object.keys(session.exercises || {}).length > 0)
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
};

export const hasWorkoutSessions = (entry) => getWorkoutSessions(entry).length > 0;

export const saveWorkoutLog = (workoutId, exerciseId, payload) => {
  try {
    const today = getLocalDateKey();
    const logs = readLogs();

    if (!logs[today]) {
      logs[today] = normalizeDayEntry(null, today);
    }

    if (!logs[today].sessions[workoutId]) {
      logs[today].sessions[workoutId] = {
        workoutId,
        exercises: {},
        updatedAt: Date.now(),
      };
    }

    logs[today].sessions[workoutId].exercises[exerciseId] = {
      ...payload,
      timestamp: Date.now(),
    };
    logs[today].sessions[workoutId].updatedAt = Date.now();

    writeLogs(logs);
    return true;
  } catch (error) {
    console.error('Failed to save log', error);
    return false;
  }
};

export const getWorkoutHistory = () => {
  return readLogs();
};

export const saveNutritionLog = (waterMl, calories) => {
  try {
    const today = getLocalDateKey();
    const logs = readLogs();

    if (!logs[today]) {
      logs[today] = normalizeDayEntry(null, today);
    }

    logs[today].nutrition.water += parseInt(waterMl, 10) || 0;
    logs[today].nutrition.calories += parseInt(calories, 10) || 0;

    writeLogs(logs);
    return logs[today].nutrition;
  } catch {
    return null;
  }
};

export const getNutritionLog = () => {
  try {
    const today = getLocalDateKey();
    const logs = readLogs();
    if (logs[today]?.nutrition) return logs[today].nutrition;
    return { water: 0, calories: 0 };
  } catch {
    return { water: 0, calories: 0 };
  }
};

export const getNormalizedWorkoutEntry = (entry, exerciseMeta) => normalizeWorkoutEntry(entry, exerciseMeta);
