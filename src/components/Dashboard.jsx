import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sun,
  Moon,
  CircleCheckBig,
  Camera,
  Download,
  LogOut,
  User,
  House,
  Footprints,
  Droplets,
  CalendarDays,
  ClipboardList,
  BedDouble,
  Trophy,
  Flame,
  Sparkles,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { workoutPlan } from '../data/workoutPlan';
import { DEFAULT_WEEK_ORDER, getWeekdayKeyFromDate, normalizePlanModel } from '../services/plans';
import { uploadProfileAvatar } from '../services/profile';
import { getLastStorageError, getWorkoutHistory, getWorkoutSessions, hasWorkoutSessions } from '../services/storage';
import TrainingCard from './ui/TrainingCard';
import WeightLog from './ui/WeightLog';

const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const NutritionPage = lazy(() => import('./pages/NutritionPage'));
const PlanPage = lazy(() => import('./pages/PlanPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));
const THEME_STORAGE_KEY = 'hyperactive-theme';
const DARK_THEME_COLOR = '#0A0D14';
const LIGHT_THEME_COLOR = '#F5F7FB';

const TABS = { HOME: 'home', STATS: 'stats', NUTRITION: 'nutrition', HISTORY: 'history', PLAN: 'plan', RANKING: 'ranking' };
const WEEKDAY_VIEW = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
const WEEKDAY_LABELS = {
  SEG: 'SEG',
  TER: 'TER',
  QUA: 'QUA',
  QUI: 'QUI',
  SEX: 'SEX',
  SAB: 'SAB',
  DOM: 'DOM',
};

const OBJECTIVE_COPY = {
  A: 'Priorize carga, controle e potência nas pernas.',
  B: 'Empurre forte e estabilize o tronco no puxar.',
  C: 'Sustente o ritmo e firme o core a cada bloco.',
  D: 'Ative posteriores e glúteos com execução sólida.',
  E: 'Construa costas fortes e ombros estáveis no volume.',
  F: 'Mantenha constância, respiração e pace confortável.',
};

const DOCK_ITEMS = [
  { id: TABS.HOME, Icon: House, label: 'Início', iconSize: 20 },
  { id: TABS.STATS, Icon: Footprints, label: 'Cardio', iconSize: 20 },
  { id: TABS.NUTRITION, Icon: Droplets, label: 'Água', iconSize: 20 },
  { id: TABS.HISTORY, Icon: CalendarDays, label: 'Histórico', iconSize: 20 },
  { id: TABS.PLAN, Icon: ClipboardList, label: 'Plano', iconSize: 21 },
  { id: TABS.RANKING, Icon: Trophy, label: 'Ranking', iconSize: 20 },
];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentWeekDateKeysByWeekday = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const daysFromMonday = (day + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  return WEEKDAY_VIEW.reduce((accumulator, weekdayKey, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    accumulator[weekdayKey] = toDateKey(date);
    return accumulator;
  }, {});
};

function getInitialTheme() {
  if (typeof window === 'undefined') return true;
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light') return false;
  if (savedTheme === 'dark') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getDisplayName(userProfile, user) {
  return userProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';
}

function getGreeting(name) {
  const hour = new Date().getHours();
  if (hour < 12) return `Bom dia, ${name}`;
  if (hour < 18) return `Boa tarde, ${name}`;
  return `Boa noite, ${name}`;
}

const isValidDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

function getMonthDatePrefix(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function getDateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTrainingProfileStats(history = {}) {
  const monthPrefix = getMonthDatePrefix();
  const trainedDates = Object.keys(history || {})
    .filter((dateKey) => isValidDateKey(dateKey) && hasWorkoutSessions(history[dateKey]))
    .sort();
  const monthDays = trainedDates.filter((dateKey) => dateKey.startsWith(monthPrefix)).length;
  const monthWorkoutIds = new Set();

  trainedDates
    .filter((dateKey) => dateKey.startsWith(monthPrefix))
    .forEach((dateKey) => {
      getWorkoutSessions(history[dateKey]).forEach((session) => {
        if (session?.workoutId) monthWorkoutIds.add(session.workoutId);
      });
    });

  let streak = 0;
  const trainedSet = new Set(trainedDates);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!trainedSet.has(getDateKeyFromDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (trainedSet.has(getDateKeyFromDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    monthDays,
    streak,
    points: monthDays * 100 + streak * 25 + monthWorkoutIds.size * 10,
  };
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Dashboard({ plan = workoutPlan, user, userProfile, onEditProfile, onProfileUpdated, onSignOut }) {
  const [currentPlan, setCurrentPlan] = useState(() => normalizePlanModel(plan));
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [selectedWeekday, setSelectedWeekday] = useState(() => {
    const todayKey = getWeekdayKeyFromDate();
    return todayKey;
  });
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [completedWeekdays, setCompletedWeekdays] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({});
  const [progressVersion, setProgressVersion] = useState(0);
  const [profileStats, setProfileStats] = useState({ monthDays: 0, streak: 0, points: 0 });
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [profilePullProgress, setProfilePullProgress] = useState(0);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [isProfileAvatarUploading, setIsProfileAvatarUploading] = useState(false);
  const [profileAvatarMessage, setProfileAvatarMessage] = useState('');
  const [profileAvatarVersion, setProfileAvatarVersion] = useState(0);
  const [isWorkoutMode, setIsWorkoutMode] = useState(false);
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const profilePhotoInputRef = useRef(null);
  const profilePullStartRef = useRef(null);
  const profilePullValueRef = useRef(0);
  const profilePullPointerIdRef = useRef(null);
  const profilePullMovedRef = useRef(false);
  const profilePullIgnoreClickRef = useRef(false);
  const preserveSelectedWeekdayRef = useRef(false);
  const weekOrder = currentPlan.weekOrder || DEFAULT_WEEK_ORDER;
  const weekDateByWeekday = getCurrentWeekDateKeysByWeekday();

  useEffect(() => {
    setCurrentPlan(normalizePlanModel(plan));
  }, [plan]);

  useEffect(() => {
    setProfilePhotoUrl(userProfile?.avatar_url || user?.user_metadata?.avatar_url || '');
  }, [user?.id, user?.user_metadata?.avatar_url, userProfile?.avatar_url]);

  useEffect(() => {
    const todayKey = getWeekdayKeyFromDate();
    setSelectedWeekday(todayKey);
  }, [currentPlan.weekOrder]);

  useEffect(() => {
    if (activeTab !== TABS.HOME) return;
    if (preserveSelectedWeekdayRef.current) {
      preserveSelectedWeekdayRef.current = false;
      return;
    }
    setSelectedWeekday(getWeekdayKeyFromDate());
  }, [activeTab]);

  useEffect(() => {
    if (!isWorkoutMode || isSessionPaused) return undefined;
    const timer = window.setInterval(() => setSessionSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isSessionPaused, isWorkoutMode]);

  useEffect(() => {
    setIsWorkoutMode(false);
    setIsSessionPaused(false);
    setSessionSeconds(0);
  }, [selectedWeekday]);

  useEffect(() => {
    const syncTodayOnHome = () => {
      if (activeTab !== TABS.HOME) return;
      setSelectedWeekday(getWeekdayKeyFromDate());
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncTodayOnHome();
      }
    };

    window.addEventListener('focus', syncTodayOnHome);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', syncTodayOnHome);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event) => {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        setIsDark(event.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallAvailable(true);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallAvailable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setCompletedWeekdays({});
      setWeeklyProgress({});
      setProfileStats({ monthDays: 0, streak: 0, points: 0 });
      return;
    }

    let mounted = true;
    const weekDateByWeekday = getCurrentWeekDateKeysByWeekday();

    const loadWeeklyCompletion = async () => {
      const history = await getWorkoutHistory();
      if (!mounted) return;
      setProfileStats(getTrainingProfileStats(history));
      const storageError = getLastStorageError();
      if (storageError?.context === 'getWorkoutHistory') {
        return;
      }

      const nextCompleted = WEEKDAY_VIEW.reduce((accumulator, weekdayKey) => {
        const dateKey = weekDateByWeekday[weekdayKey];
        accumulator[weekdayKey] = hasWorkoutSessions(history[dateKey]);
        return accumulator;
      }, {});

      const nextWeeklyProgress = WEEKDAY_VIEW.reduce((accumulator, weekdayKey) => {
        const dateKey = weekDateByWeekday[weekdayKey];
        const workoutId = weekOrder[weekdayKey] || null;
        const dayEntry = history[dateKey];
        const workoutSession = workoutId ? dayEntry?.sessions?.[workoutId] : null;
        accumulator[weekdayKey] = {
          hasAnySession: hasWorkoutSessions(dayEntry),
          loggedExercises: Object.keys(workoutSession?.exercises || {}).length,
        };
        return accumulator;
      }, {});

      setCompletedWeekdays(nextCompleted);
      setWeeklyProgress(nextWeeklyProgress);
    };

    void loadWeeklyCompletion();

    const handleVisibility = () => {
      if (!document.hidden) {
        void loadWeeklyCompletion();
      }
    };

    window.addEventListener('focus', loadWeeklyCompletion);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener('focus', loadWeeklyCompletion);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeTab, user?.id, weekOrder, progressVersion]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallAvailable(false);
  };

  const setProfileRevealProgress = (nextProgress) => {
    const boundedProgress = Math.max(0, Math.min(1, nextProgress));
    profilePullValueRef.current = boundedProgress;
    setProfilePullProgress(boundedProgress);
  };

  const revealProfile = (progress = 1) => {
    const shouldExpand = progress >= 0.38;
    setIsProfileExpanded(shouldExpand);
    setProfileRevealProgress(shouldExpand ? 1 : 0);
  };

  const handleProfilePullStart = (event) => {
    if (!event.isPrimary) return;
    if (event.button != null && event.button !== 0) return;
    profilePullPointerIdRef.current = event.pointerId;
    profilePullMovedRef.current = false;
    profilePullStartRef.current = { y: event.clientY, progress: isProfileExpanded ? 1 : 0 };
    profilePullValueRef.current = isProfileExpanded ? 1 : 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleProfilePullMove = (event) => {
    if (profilePullPointerIdRef.current !== event.pointerId) return;
    const start = profilePullStartRef.current;
    if (!start) return;
    const delta = event.clientY - start.y;
    if (Math.abs(delta) > 6) {
      profilePullMovedRef.current = true;
      event.preventDefault();
    }
    if (delta <= -24) {
      const closingProgress = Math.max(0, start.progress + delta / 118);
      setProfileRevealProgress(closingProgress);
      return;
    }
    if (delta < 4 && start.progress === 0) return;
    const nextProgress = Math.max(0, Math.min(1, start.progress + delta / 112));
    setProfileRevealProgress(nextProgress);
  };

  const handleProfilePullEnd = (event) => {
    if (profilePullPointerIdRef.current !== event.pointerId) return;
    if (!profilePullStartRef.current) return;
    profilePullStartRef.current = null;
    profilePullPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (profilePullMovedRef.current) {
      profilePullIgnoreClickRef.current = true;
      revealProfile(profilePullValueRef.current);
    }
    profilePullMovedRef.current = false;
  };

  const toggleProfileExpansion = (event) => {
    if (profilePullIgnoreClickRef.current) {
      event?.preventDefault();
      profilePullIgnoreClickRef.current = false;
      return;
    }
    const nextExpanded = !isProfileExpanded;
    setIsProfileExpanded(nextExpanded);
    setProfileRevealProgress(nextExpanded ? 1 : 0);
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (!user?.id) {
      setProfileAvatarMessage('Entre na conta para salvar sua foto.');
      event.target.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoUrl(previewUrl);
    setIsProfileAvatarUploading(true);
    setProfileAvatarMessage('Enviando foto...');

    try {
      const updatedProfile = await uploadProfileAvatar(user.id, file);
      const nextAvatarUrl = updatedProfile?.avatar_url || '';
      setProfilePhotoUrl(nextAvatarUrl);
      setProfileAvatarMessage('Foto atualizada no ranking.');
      setProfileAvatarVersion((value) => value + 1);
      onProfileUpdated?.(updatedProfile);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`hibrid-profile-photo:${user.id}`);
      }
    } catch (error) {
      setProfilePhotoUrl(userProfile?.avatar_url || user?.user_metadata?.avatar_url || '');
      setProfileAvatarMessage(error.message || 'Não foi possível salvar a foto.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsProfileAvatarUploading(false);
      event.target.value = '';
    }
  };

  const selectedWorkoutId = weekOrder[selectedWeekday] || null;
  const activeWorkout = selectedWorkoutId ? currentPlan.schedule[selectedWorkoutId] : null;
  const todayWeekdayKey = getWeekdayKeyFromDate();
  const displayName = getDisplayName(userProfile, user);
  const greeting = getGreeting(displayName);
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] || 'Atleta';
  const profileProgress = Math.max(profilePullProgress, isProfileExpanded ? 1 : 0);
  const profilePanelStyle = {
    '--profile-reveal': profileProgress.toFixed(3),
  };

  const daySlots = WEEKDAY_VIEW.map((weekdayKey) => {
    const workoutId = weekOrder[weekdayKey] || null;
    return {
      weekdayKey,
      label: WEEKDAY_LABELS[weekdayKey],
      workoutId,
      workout: workoutId ? currentPlan.schedule[workoutId] : null,
    };
  });

  const currentTabContent = useMemo(() => {
    if (activeTab === TABS.STATS) {
      return (
        <StatsPage
          plan={currentPlan}
          onOpenWorkout={(weekdayKey) => {
            preserveSelectedWeekdayRef.current = true;
            setSelectedWeekday(weekdayKey);
            setActiveTab(TABS.HOME);
          }}
        />
      );
    }
    if (activeTab === TABS.NUTRITION) return <NutritionPage plan={currentPlan} />;
    if (activeTab === TABS.HISTORY) return <HistoryPage plan={currentPlan} />;
    if (activeTab === TABS.PLAN) {
      return <PlanPage plan={currentPlan} userId={user?.id} onPlanUpdated={(nextPlan) => setCurrentPlan(normalizePlanModel(nextPlan))} />;
    }
    if (activeTab === TABS.RANKING) return <RankingPage userId={user?.id} viewerAvatarUrl={profilePhotoUrl} avatarRefreshKey={profileAvatarVersion} />;
    return null;
  }, [activeTab, currentPlan, profileAvatarVersion, profilePhotoUrl, user?.id]);

  return (
    <div className="hc-app-shell min-h-[100dvh] bg-[#F5F7FB] pb-28 text-gray-900 transition-colors duration-200 dark:bg-[#0A0D14] dark:text-white">
      <header
        className={`hc-topbar sticky top-0 z-40 pb-4 pt-4 ${activeTab === TABS.HOME && !isWorkoutMode ? '' : 'hc-topbar--condensed'} ${isWorkoutMode ? 'hc-topbar--workout' : ''} ${isProfileExpanded ? 'hc-topbar--profile-open' : ''}`}
        style={profilePanelStyle}
      >
        <div className="mx-auto w-full max-w-[430px] px-5">
        <div className="hc-logo-row mb-3 grid grid-cols-[44px_1fr_44px] items-center">
          <div>
            {user && onSignOut ? (
              <button
                onClick={onSignOut}
                aria-label="Sair"
                className="hc-icon-button flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_6px_8px_rgba(15,23,42,0.05)] transition-colors hover:text-[#0A3CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
              >
                <LogOut size={17} />
              </button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex justify-center">
            <img
              src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
              alt="Hybrid Club"
              loading="eager"
              decoding="async"
              width="320"
              height="214"
              className="hc-topbar-logo h-auto max-h-[74px] w-auto object-contain sm:max-h-[84px]"
            />
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="hc-icon-button flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_6px_8px_rgba(15,23,42,0.05)] transition-colors hover:text-[#0A3CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        <div className="hc-profile-reveal" aria-hidden={!isProfileExpanded && profileProgress < 0.08}>
          <div className="hc-profile-reveal-inner">
            <section className="hc-profile-card" aria-label="Perfil do atleta">
              <div className="hc-profile-orbit" aria-hidden="true" />
              <div className="relative flex flex-col items-center">
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleProfilePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  onPointerDown={(event) => event.stopPropagation()}
                  disabled={isProfileAvatarUploading}
                  className="hc-profile-avatar group disabled:cursor-wait"
                  aria-label="Escolher foto de perfil"
                >
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Foto de perfil" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span>{getInitials(displayName)}</span>
                  )}
                  <span className="hc-profile-camera">
                    <Camera size={13} strokeWidth={2.2} />
                  </span>
                </button>
                <p className="mt-2 text-[12px] font-medium leading-none text-[#64748B] dark:text-white/46">Atleta Hybrid</p>
                <h2 className="mt-1 max-w-[260px] truncate text-center text-[20px] font-semibold leading-tight tracking-[-0.02em] text-[#111827] dark:text-white">
                  {displayName}
                </h2>
                <p className="mt-1 text-center text-[11px] font-medium text-[#0A3CFF] dark:text-[#FE0972]">
                  {firstName}, mantenha o ritmo sem perder controle.
                </p>
                {profileAvatarMessage && (
                  <p className="mt-1 text-center text-[10px] font-medium text-[#64748B] dark:text-white/42">
                    {profileAvatarMessage}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="hc-profile-stat">
                  <Flame size={14} className="text-[#0A3CFF] dark:text-[#FE0972]" />
                  <strong>{profileStats.streak}</strong>
                  <span>dias seguidos</span>
                </div>
                <div className="hc-profile-stat">
                  <CircleCheckBig size={14} className="text-[#0A3CFF] dark:text-[#FE0972]" />
                  <strong>{profileStats.monthDays}</strong>
                  <span>dias no mês</span>
                </div>
                <div className="hc-profile-stat">
                  <Sparkles size={14} className="text-[#0A3CFF] dark:text-[#FE0972]" />
                  <strong>{profileStats.points}</strong>
                  <span>pontos mensais</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <button
          type="button"
          className="hc-profile-pull-handle"
          onClick={toggleProfileExpansion}
          onPointerDown={handleProfilePullStart}
          onPointerMove={handleProfilePullMove}
          onPointerUp={handleProfilePullEnd}
          onPointerCancel={handleProfilePullEnd}
          aria-expanded={isProfileExpanded}
          aria-label={isProfileExpanded ? "Recolher perfil" : "Puxar perfil"}
        >
          <span />
        </button>

        <div className="hc-topbar-collapsible" aria-hidden={activeTab !== TABS.HOME || isWorkoutMode}>
          <div className="hc-topbar-collapsible-inner">
          <div className="hc-topbar-collapsible-content">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[0.8125rem] font-medium leading-5 text-gray-500 dark:text-gray-400">{greeting}</p>
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  aria-label="Editar perfil"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-[#0A3CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-[#AFC5FF]"
                >
                  <User size={16} />
                </button>
              )}
            </div>
            <div className="hc-week-rail rounded-[26px] bg-black/[0.04] p-1.5 dark:bg-white/[0.06]">
              <div className="grid grid-cols-7 gap-1.5">
                {daySlots.map((slot) => {
                  const isActive = selectedWeekday === slot.weekdayKey;
                  const isCardioDay = slot.workout?.type === 'Cardio';
                  const isTodayCard = todayWeekdayKey === slot.weekdayKey;
                  const isRestDay = !slot.workout;
                  const isCompletedThisWeek = Boolean(completedWeekdays[slot.weekdayKey]);

                  return (
                    <button
                      key={slot.weekdayKey}
                      onClick={() => setSelectedWeekday(slot.weekdayKey)}
                      aria-pressed={isActive}
                      className={`hc-week-day flex min-h-[72px] flex-col items-center justify-center rounded-[20px] px-1.5 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] ${
                        isActive
                          ? 'hc-day-active bg-white text-[#0A3CFF] shadow-[0_6px_8px_rgba(10,60,255,0.12)] dark:bg-[#0A3CFF] dark:text-white'
                          : isTodayCard
                            ? 'text-gray-600 dark:text-gray-300'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span
                        className={`hc-label ${
                          isActive ? 'opacity-80' : isTodayCard ? 'text-[#0A3CFF] dark:text-[#AFC5FF]' : 'opacity-70'
                        }`}
                      >
                        {slot.label}
                      </span>
                      <span className={`hc-numeric mt-1 text-[1rem] font-bold leading-none ${isTodayCard && !isActive ? 'text-gray-950 dark:text-white' : ''}`}>
                        {slot.workoutId || '-'}
                      </span>
                      <span className="mt-1 flex h-5 items-center justify-center">
                        {isRestDay ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-white/20" />
                        ) : isCompletedThisWeek ? (
                          <span
                            className={`hc-complete-dot h-2 w-2 rounded-full ${
                              isActive
                                ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] dark:bg-[#FE0972] dark:shadow-[0_0_0_4px_rgba(254,9,114,0.22)]'
                                : 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] dark:bg-[#FE0972] dark:shadow-[0_0_0_3px_rgba(254,9,114,0.18)]'
                            }`}
                          />
                        ) : isCardioDay ? (
                          <img
                            src={`${import.meta.env.BASE_URL}icontenis3.png?v=4`}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            width="80"
                            height="80"
                            className={`h-10 w-10 object-contain ${
                              isActive ? (isDark ? 'brightness-0 invert' : 'opacity-100') : 'opacity-70 dark:opacity-85'
                            } hc-cardio-mark`}
                          />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive
                                ? 'bg-[#0A3CFF]/45 dark:bg-white/60'
                                : isTodayCard
                                  ? 'bg-[#0A3CFF] dark:bg-[#AFC5FF]'
                                  : 'bg-gray-300 dark:bg-white/20'
                            }`}
                          />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[430px] px-5 pt-5">
        {activeTab === TABS.HOME && (
          <HomeContent
            activeWorkout={activeWorkout}
            onInstall={handleInstall}
            isInstallAvailable={isInstallAvailable}
            selectedWorkoutId={selectedWorkoutId}
            selectedWeekday={selectedWeekday}
            selectedDateKey={weekDateByWeekday[selectedWeekday]}
            todayWeekdayKey={todayWeekdayKey}
            selectedWeekdayProgress={weeklyProgress[selectedWeekday] || { hasAnySession: false, loggedExercises: 0 }}
            onProgressChange={() => setProgressVersion((v) => v + 1)}
            isWorkoutMode={isWorkoutMode}
            isSessionPaused={isSessionPaused}
            sessionSeconds={sessionSeconds}
            onStartWorkout={() => {
              setIsWorkoutMode(true);
              setIsSessionPaused(false);
              setSessionSeconds(0);
              setIsProfileExpanded(false);
            }}
            onToggleSessionPause={() => setIsSessionPaused((paused) => !paused)}
            onEndWorkout={() => {
              setIsWorkoutMode(false);
              setIsSessionPaused(false);
            }}
          />
        )}

        {activeTab !== TABS.HOME && <Suspense fallback={<PageFallback label="Carregando tela" />}>{currentTabContent}</Suspense>}
      </main>

      {!isWorkoutMode && <div className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,420px)] -translate-x-1/2 px-1">
        <nav className="hc-dock rounded-[24px] border border-black/[0.04] px-3 py-2 dark:border-white/[0.08]">
          <div className="grid grid-cols-6 gap-1">
            {DOCK_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-[18px] px-1 py-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] ${
                    isActive ? 'bg-[#0A3CFF] text-white shadow-[0_6px_8px_rgba(10,60,255,0.2)]' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <item.Icon size={item.iconSize} strokeWidth={1.9} className={`${isActive ? 'text-white' : 'text-[#546173] dark:text-[#9AA7BC]'}`} />
                  <span className={`mt-1 whitespace-nowrap text-[0.6875rem] font-semibold leading-4 ${isActive ? 'text-white/92' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>}
    </div>
  );
}

function PageFallback({ label }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-black/[0.05] bg-white text-[0.875rem] font-semibold text-gray-500 shadow-[0_6px_8px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-gray-400 dark:shadow-none">
      {label}
    </div>
  );
}

const formatSessionTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = `${seconds % 60}`.padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const formatPlanDate = (dateKey, isToday) => {
  const formatted = new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  return `${isToday ? 'Hoje · ' : ''}${formatted}`;
};

function HomeContent({
  activeWorkout,
  onInstall,
  isInstallAvailable,
  selectedWorkoutId,
  selectedWeekday,
  selectedDateKey,
  todayWeekdayKey,
  selectedWeekdayProgress,
  onProgressChange,
  isWorkoutMode,
  isSessionPaused,
  sessionSeconds,
  onStartWorkout,
  onToggleSessionPause,
  onEndWorkout,
}) {
  const isTodaySelected = selectedWeekday === todayWeekdayKey;
  const targetExercises = activeWorkout?.exercises?.length || 0;
  const loggedExercises = selectedWeekdayProgress?.loggedExercises || 0;
  const progressPercent = targetExercises > 0
    ? Math.min(100, Math.round((loggedExercises / targetExercises) * 100))
    : 0;

  return (
    <div className={`space-y-4 ${isWorkoutMode ? 'hc-home-session' : ''}`}>
      {isWorkoutMode && activeWorkout ? (
        <section className="hc-session-header hc-glass" aria-label="Sessão em andamento">
          <div className="hc-session-header__topline">
            <span className="hc-session-header__id">Treino {activeWorkout.id}</span>
            <strong className="hc-numeric">{formatSessionTime(sessionSeconds)}</strong>
            <button
              type="button"
              onClick={onToggleSessionPause}
              aria-label={isSessionPaused ? 'Continuar cronômetro' : 'Pausar cronômetro'}
            >
              {isSessionPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
          </div>
          <div className="hc-session-header__body">
            <div>
              <p>{formatPlanDate(selectedDateKey, isTodaySelected)}</p>
              <h2>{activeWorkout.name}</h2>
            </div>
            <span className="hc-numeric">{loggedExercises}/{targetExercises}</span>
          </div>
          <div className="hc-session-header__progress" aria-label={`${progressPercent}% do treino concluído`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <button type="button" className="hc-session-header__exit" onClick={onEndWorkout}>
            <X size={15} aria-hidden="true" /> Encerrar sessão
          </button>
        </section>
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
            <p className="hc-label text-[#0A3CFF] dark:text-[#8FB1FF]">{formatPlanDate(selectedDateKey, isTodaySelected)}</p>
            <span className="hc-numeric text-[0.6875rem] font-semibold text-gray-500 dark:text-gray-400">
              {loggedExercises}/{targetExercises}
            </span>
          </div>
        {activeWorkout ? (
          <TrainingCard
            workout={activeWorkout}
            objectiveText={OBJECTIVE_COPY[selectedWorkoutId] || 'Mantenha consistência e boa execução em cada série.'}
            loggedExercises={loggedExercises}
            targetExercises={targetExercises}
            onStartWorkout={onStartWorkout}
          />
        ) : (
          <div className="hc-surface rounded-[22px] border border-black/[0.05] bg-white px-5 py-6 text-center dark:border-white/[0.08] dark:bg-white/[0.05]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
              <BedDouble size={20} />
            </div>
            <p className="hc-heading mt-3 text-[1.25rem] leading-tight tracking-[-0.02em] text-gray-950 dark:text-white">Dia de descanso</p>
            <p className="mt-2 text-[0.875rem] leading-6 text-gray-500 dark:text-gray-400">
              Aproveite para recuperar, hidratar e preparar o próximo bloco.
            </p>
          </div>
        )}
        </section>
      )}

      <section>
        <div className={`${isWorkoutMode ? 'mb-2' : 'mb-3'} flex items-end justify-between`}>
          <div>
            <h3 className="hc-heading text-[1.125rem] leading-tight tracking-[-0.02em] text-gray-950 dark:text-white">
              {isWorkoutMode ? 'Exercício atual' : 'Checklist do treino'}
            </h3>
          </div>
        </div>
        {activeWorkout ? (
          <WeightLog
            exercises={activeWorkout.exercises || []}
            workoutId={selectedWorkoutId || 'REST'}
            targetDateKey={selectedDateKey}
            onProgressChange={onProgressChange}
            focusMode={isWorkoutMode}
          />
        ) : (
          <div className="hc-surface rounded-[20px] border border-black/[0.05] bg-white px-4 py-5 text-center text-[0.875rem] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-gray-400">
            Sem treino atribuído para este dia.
          </div>
        )}
      </section>

      {isInstallAvailable && (
        <section>
          <button
            onClick={onInstall}
            className="hc-surface flex w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border border-[#0A3CFF]/10 bg-white px-4 py-4 text-left transition hover:border-[#0A3CFF]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] active:scale-[0.99] dark:border-white/[0.08] dark:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}iconpwa.png`}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                width="96"
                height="96"
                className="h-12 w-12 rounded-[14px] object-cover shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
              />
              <div>
                <p className="hc-label text-[#0A3CFF] dark:text-[#AFC5FF]">Instalar app</p>
                <p className="mt-1 text-[0.9375rem] font-semibold leading-5 text-gray-950 dark:text-white">Adicionar o Hibrid Club a tela inicial</p>
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-white">
              <Download size={18} />
            </span>
          </button>
        </section>
      )}
    </div>
  );
}
