import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

let activeStorageScope = 'guest';
let memoryLogs = null;
let lastStorageError = null;

const EMPTY_NUTRITION = { water: 0, calories: 0 };

export const setStorageScope = (scope) => {
  const nextScope = scope || 'guest';
  if (activeStorageScope === nextScope) {
    return;
  }

  activeStorageScope = nextScope;
  memoryLogs = null;
  lastStorageError = null;
};

const setStorageError = (error, context) => {
  lastStorageError = {
    context,
    message: error?.message || 'Falha ao acessar registros.',
    timestamp: Date.now(),
  };
};

const clearStorageError = () => {
  lastStorageError = null;
};

export const getLastStorageError = () => lastStorageError;

const getActiveUserId = () => (activeStorageScope === 'guest' ? null : activeStorageScope);

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
      water: Number(entry?.nutrition?.water ?? entry?.water) || 0,
      calories: Number(entry?.nutrition?.calories ?? entry?.calories) || 0,
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

const buildHistoryFromRows = (rows = []) => {
  return rows.reduce((accumulator, row) => {
    accumulator[row.date] = normalizeDayEntry(
      {
        date: row.date,
        sessions: row.sessions || {},
        water: row.water,
        calories: row.calories,
      },
      row.date
    );
    return accumulator;
  }, {});
};

const ensureSupabaseReady = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado para armazenar os registros do usuário.');
  }
};

const ensureActiveUserId = () => {
  const userId = getActiveUserId();
  if (!userId) {
    throw new Error('Nenhum usuário autenticado para salvar ou ler registros.');
  }
  return userId;
};

const getEmptyDayEntry = (dateKey) =>
  normalizeDayEntry(
    {
      date: dateKey,
      sessions: {},
      nutrition: EMPTY_NUTRITION,
    },
    dateKey
  );

const getCachedHistory = () => memoryLogs || {};

const setCachedHistory = (nextHistory) => {
  memoryLogs = nextHistory;
};

const getCachedDayEntry = (dateKey) => getCachedHistory()[dateKey] || null;

const setCachedDayEntry = (dateKey, dayEntry) => {
  const nextHistory = {
    ...getCachedHistory(),
    [dateKey]: dayEntry,
  };

  setCachedHistory(nextHistory);
};

const fetchDayRow = async (userId, dateKey) => {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, sessions, water, calories')
    .eq('user_id', userId)
    .eq('date', dateKey)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const upsertDayRow = async (userId, dateKey, dayEntry) => {
  const payload = {
    user_id: userId,
    date: dateKey,
    sessions: dayEntry.sessions || {},
    water: Number(dayEntry.nutrition?.water) || 0,
    calories: Number(dayEntry.nutrition?.calories) || 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select('date, sessions, water, calories')
    .single();

  if (error) throw error;
  return normalizeDayEntry(data, dateKey);
};

const getRemoteDayEntry = async (dateKey) => {
  ensureSupabaseReady();
  const userId = ensureActiveUserId();

  const cached = getCachedDayEntry(dateKey);
  if (cached) {
    return cached;
  }

  const row = await fetchDayRow(userId, dateKey);
  const normalized = row ? normalizeDayEntry(row, dateKey) : getEmptyDayEntry(dateKey);
  setCachedDayEntry(dateKey, normalized);
  return normalized;
};

export const getWorkoutSessions = (entry) => {
  if (!entry?.sessions) return [];

  return Object.values(entry.sessions)
    .filter((session) => session?.workoutId && Object.keys(session.exercises || {}).length > 0)
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
};

export const hasWorkoutSessions = (entry) => getWorkoutSessions(entry).length > 0;

export const saveWorkoutLog = async (workoutId, exerciseId, payload) => {
  try {
    ensureSupabaseReady();
    const userId = ensureActiveUserId();
    const today = getLocalDateKey();
    const dayEntry = await getRemoteDayEntry(today);

    if (!dayEntry.sessions[workoutId]) {
      dayEntry.sessions[workoutId] = {
        workoutId,
        exercises: {},
        updatedAt: Date.now(),
      };
    }

    dayEntry.sessions[workoutId].exercises[exerciseId] = {
      ...payload,
      timestamp: Date.now(),
    };
    dayEntry.sessions[workoutId].updatedAt = Date.now();

    const persisted = await upsertDayRow(userId, today, dayEntry);
    setCachedDayEntry(today, persisted);
    clearStorageError();
    return true;
  } catch (error) {
    console.error('Failed to save workout log', error);
    setStorageError(error, 'saveWorkoutLog');
    return false;
  }
};

export const getWorkoutHistory = async () => {
  try {
    ensureSupabaseReady();
    const userId = ensureActiveUserId();

    if (memoryLogs) {
      return memoryLogs;
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .select('date, sessions, water, calories')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;

    const history = buildHistoryFromRows(data || []);
    setCachedHistory(history);
    clearStorageError();
    return history;
  } catch (error) {
    console.error('Failed to load workout history', error);
    setStorageError(error, 'getWorkoutHistory');
    return memoryLogs || {};
  }
};

export const saveNutritionLog = async (waterMl, calories) => {
  try {
    ensureSupabaseReady();
    const userId = ensureActiveUserId();
    const today = getLocalDateKey();
    const dayEntry = await getRemoteDayEntry(today);

    dayEntry.nutrition.water += parseInt(waterMl, 10) || 0;
    dayEntry.nutrition.calories += parseInt(calories, 10) || 0;

    const persisted = await upsertDayRow(userId, today, dayEntry);
    setCachedDayEntry(today, persisted);
    clearStorageError();
    return persisted.nutrition;
  } catch (error) {
    console.error('Failed to save nutrition log', error);
    setStorageError(error, 'saveNutritionLog');
    return null;
  }
};

export const getNutritionLog = async () => {
  try {
    const today = getLocalDateKey();
    const dayEntry = await getRemoteDayEntry(today);
    clearStorageError();
    return dayEntry.nutrition || EMPTY_NUTRITION;
  } catch (error) {
    console.error('Failed to load nutrition log', error);
    setStorageError(error, 'getNutritionLog');
    return EMPTY_NUTRITION;
  }
};

export const getNormalizedWorkoutEntry = (entry, exerciseMeta) => normalizeWorkoutEntry(entry, exerciseMeta);
