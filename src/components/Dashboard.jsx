import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  CircleCheckBig,
  CircleDashed,
  Play,
  Download,
  LogOut,
  User,
  House,
  Footprints,
  Droplets,
  CalendarDays,
  ClipboardList,
  BedDouble,
} from 'lucide-react';
import { workoutPlan } from '../data/workoutPlan';
import { DEFAULT_WEEK_ORDER, getWeekdayKeyFromDate, normalizePlanModel } from '../services/plans';
import { getLastStorageError, getWorkoutHistory, hasWorkoutSessions } from '../services/storage';
import TrainingCard from './ui/TrainingCard';
import WeightLog from './ui/WeightLog';

const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const NutritionPage = lazy(() => import('./pages/NutritionPage'));
const PlanPage = lazy(() => import('./pages/PlanPage'));
const WorkoutExecution = lazy(() => import('./WorkoutExecution'));
const THEME_STORAGE_KEY = 'hyperactive-theme';
const DARK_THEME_COLOR = '#0A0D14';
const LIGHT_THEME_COLOR = '#F5F7FB';

const TABS = { HOME: 'home', STATS: 'stats', NUTRITION: 'nutrition', HISTORY: 'history', PLAN: 'plan' };
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
  A: 'Priorize carga, controle e potencia nas pernas.',
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

export default function Dashboard({ plan = workoutPlan, user, userProfile, onEditProfile, onSignOut }) {
  const [currentPlan, setCurrentPlan] = useState(() => normalizePlanModel(plan));
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [selectedWeekday, setSelectedWeekday] = useState(() => {
    const todayKey = getWeekdayKeyFromDate();
    return todayKey;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDark, setIsDark] = useState(getInitialTheme);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [completedWeekdays, setCompletedWeekdays] = useState({});
  const [weeklyProgress, setWeeklyProgress] = useState({});
  const weekOrder = currentPlan.weekOrder || DEFAULT_WEEK_ORDER;
  const weekDateByWeekday = getCurrentWeekDateKeysByWeekday();

  useEffect(() => {
    setCurrentPlan(normalizePlanModel(plan));
  }, [plan]);

  useEffect(() => {
    const todayKey = getWeekdayKeyFromDate();
    setSelectedWeekday(todayKey);
  }, [currentPlan.weekOrder]);

  useEffect(() => {
    if (activeTab !== TABS.HOME) return;
    setSelectedWeekday(getWeekdayKeyFromDate());
  }, [activeTab]);

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
      return;
    }

    let mounted = true;
    const weekDateByWeekday = getCurrentWeekDateKeysByWeekday();

    const loadWeeklyCompletion = async () => {
      const history = await getWorkoutHistory();
      if (!mounted) return;
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
  }, [activeTab, isExecuting, user?.id, weekOrder]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallAvailable(false);
  };

  const selectedWorkoutId = weekOrder[selectedWeekday] || null;
  const activeWorkout = selectedWorkoutId ? currentPlan.schedule[selectedWorkoutId] : null;
  const todayWeekdayKey = getWeekdayKeyFromDate();
  const greeting = getGreeting(getDisplayName(userProfile, user));

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
    if (activeTab === TABS.STATS) return <StatsPage plan={currentPlan} />;
    if (activeTab === TABS.NUTRITION) return <NutritionPage plan={currentPlan} />;
    if (activeTab === TABS.HISTORY) return <HistoryPage plan={currentPlan} />;
    if (activeTab === TABS.PLAN) {
      return <PlanPage plan={currentPlan} userId={user?.id} onPlanUpdated={(nextPlan) => setCurrentPlan(normalizePlanModel(nextPlan))} />;
    }
    return null;
  }, [activeTab, currentPlan, user?.id]);

  if (isExecuting) {
    return (
      <Suspense fallback={<PageFallback label="Carregando treino" />}>
        <WorkoutExecution workout={activeWorkout} onClose={() => setIsExecuting(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FB] pb-28 text-gray-900 transition-colors duration-200 dark:bg-[#0A0D14] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-black/[0.04] bg-[#F5F7FB]/94 px-5 pb-4 pt-4 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#0A0D14]/92">
        <div className="mb-3 grid grid-cols-[44px_1fr_44px] items-center">
          <div>
            {user && onSignOut ? (
              <button
                onClick={onSignOut}
                aria-label="Sair"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
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
              className="h-auto max-h-[74px] w-auto object-contain sm:max-h-[84px]"
            />
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        {activeTab === TABS.HOME && (
          <>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[12px] font-medium tracking-[-0.01em] text-gray-500 dark:text-gray-400">{greeting}</p>
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  aria-label="Editar perfil"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-[#0A3CFF] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-[#AFC5FF]"
                >
                  <User size={16} />
                </button>
              )}
            </div>
            <div className="rounded-[26px] bg-black/[0.04] p-1.5 dark:bg-white/[0.06]">
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
                      className={`flex min-h-[72px] flex-col items-center justify-center rounded-[22px] px-1.5 py-2 transition-all duration-300 ${
                        isActive
                          ? 'bg-white text-[#0A3CFF] shadow-[0_10px_22px_rgba(10,60,255,0.14)] dark:bg-[#0A3CFF] dark:text-white'
                          : isTodayCard
                            ? 'text-gray-600 dark:text-gray-300'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isActive ? 'opacity-80' : isTodayCard ? 'text-[#0A3CFF] dark:text-[#AFC5FF]' : 'opacity-70'
                        }`}
                      >
                        {slot.label}
                      </span>
                      <span className={`mt-1 text-[18px] font-bold leading-none ${isTodayCard && !isActive ? 'text-gray-950 dark:text-white' : ''}`}>
                        {slot.workoutId || '-'}
                      </span>
                      <span className="mt-1 flex h-5 items-center justify-center">
                        {isRestDay ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-white/20" />
                        ) : isCompletedThisWeek ? (
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isActive
                                ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]'
                                : 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
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
                            }`}
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
          </>
        )}
      </header>

      <div className="px-5 pt-5">
        {activeTab === TABS.HOME && (
          <HomeContent
            activeWorkout={activeWorkout}
            onInstall={handleInstall}
            onStartWorkout={() => setIsExecuting(true)}
            isInstallAvailable={isInstallAvailable}
            selectedWorkoutId={selectedWorkoutId}
            selectedWeekday={selectedWeekday}
            selectedDateKey={weekDateByWeekday[selectedWeekday]}
            todayWeekdayKey={todayWeekdayKey}
            selectedWeekdayCompleted={Boolean(completedWeekdays[selectedWeekday])}
            selectedWeekdayProgress={weeklyProgress[selectedWeekday] || { hasAnySession: false, loggedExercises: 0 }}
          />
        )}

        {activeTab !== TABS.HOME && <Suspense fallback={<PageFallback label="Carregando tela" />}>{currentTabContent}</Suspense>}
      </div>

      <div className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,420px)] -translate-x-1/2">
        <nav className="rounded-[28px] border border-black/[0.04] bg-white/92 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#10141E]/88 dark:shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-5 gap-1">
            {DOCK_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-label={item.label}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-[20px] px-1 py-2 transition-all duration-300 ${
                    isActive ? 'bg-[#0A3CFF] text-white shadow-[0_12px_28px_rgba(10,60,255,0.28)]' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <item.Icon size={item.iconSize} strokeWidth={1.9} className={`${isActive ? 'text-white' : 'text-[#546173] dark:text-[#9AA7BC]'}`} />
                  <span className={`mt-1 text-[11px] font-semibold tracking-[-0.01em] ${isActive ? 'text-white/92' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function PageFallback({ label }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-black/[0.05] bg-white text-[14px] font-semibold text-gray-500 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-gray-400 dark:shadow-none">
      {label}
    </div>
  );
}

function getDayStatus({
  activeWorkout,
  isTodaySelected,
  selectedWeekdayCompleted,
  loggedExercises,
  targetExercises,
}) {
  if (!activeWorkout) {
    return {
      title: 'Dia de descanso',
      description: 'Recupere, hidrate e prepare o proximo bloco da semana.',
      icon: BedDouble,
      tone: 'rest',
    };
  }

  if (isTodaySelected) {
    if (selectedWeekdayCompleted || (targetExercises > 0 && loggedExercises >= targetExercises)) {
      return {
        title: 'Treino concluido',
        description: 'Sessao finalizada hoje. Otimo trabalho.',
        icon: CircleCheckBig,
        tone: 'done',
      };
    }

    if (loggedExercises > 0) {
      return {
        title: 'Em andamento',
        description: `${loggedExercises} item${loggedExercises === 1 ? '' : 's'} registrado${loggedExercises === 1 ? '' : 's'} hoje.`,
        icon: Play,
        tone: 'progress',
      };
    }

    return {
      title: 'Ainda nao iniciado',
      description: 'Comece o treino para registrar sua evolucao.',
      icon: CircleDashed,
      tone: 'idle',
    };
  }

  if (selectedWeekdayCompleted) {
    return {
      title: 'Treino concluido',
      description: 'Voce ja registrou essa sessao no historico semanal.',
      icon: CircleCheckBig,
      tone: 'done',
    };
  }

  return {
    title: 'Treino planejado',
    description: 'Esse dia esta pronto para quando voce quiser executar.',
    icon: CircleDashed,
    tone: 'idle',
  };
}

function HomeContent({
  activeWorkout,
  onInstall,
  onStartWorkout,
  isInstallAvailable,
  selectedWorkoutId,
  selectedWeekday,
  selectedDateKey,
  todayWeekdayKey,
  selectedWeekdayCompleted,
  selectedWeekdayProgress,
}) {
  const isTodaySelected = selectedWeekday === todayWeekdayKey;
  const targetExercises = activeWorkout?.exercises?.length || 0;
  const loggedExercises = selectedWeekdayProgress?.loggedExercises || 0;
  const isWorkoutConcluded =
    Boolean(activeWorkout) &&
    (selectedWeekdayCompleted || (targetExercises > 0 && loggedExercises >= targetExercises));
  const dayStatus = getDayStatus({
    activeWorkout,
    isTodaySelected,
    selectedWeekdayCompleted,
    loggedExercises,
    targetExercises,
  });
  const DayStatusIcon = dayStatus.icon;
  const dayStatusToneClass =
    dayStatus.tone === 'done'
      ? 'bg-emerald-500/14 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300'
      : dayStatus.tone === 'progress'
        ? 'bg-[#0A3CFF]/12 text-[#0A3CFF] dark:bg-[#0A3CFF]/22 dark:text-[#AFC5FF]'
        : 'bg-gray-500/14 text-gray-600 dark:bg-white/[0.1] dark:text-gray-300';

  return (
    <>
      <section className="mb-4">
        <div className="mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#8FB1FF]">Plano do dia</p>
        </div>
        {activeWorkout ? (
          <TrainingCard workout={activeWorkout} onStart={onStartWorkout} />
        ) : (
          <div className="rounded-[28px] border border-black/[0.05] bg-white px-5 py-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
              <BedDouble size={20} />
            </div>
            <p className="mt-3 text-[20px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">Dia de descanso</p>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              Aproveite para recuperar, hidratar e preparar o proximo bloco.
            </p>
          </div>
        )}
      </section>

      {!isWorkoutConcluded && (
        <section className="mb-4 rounded-[24px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${dayStatusToneClass}`}>
              <DayStatusIcon size={18} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Status do dia</p>
              <p className="mt-0.5 text-[18px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{dayStatus.title}</p>
            </div>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">{dayStatus.description}</p>
        </section>
      )}

      <section className="mb-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Registro rapido</p>
            <h3 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">Treino diario</h3>
          </div>
        </div>
        {activeWorkout ? (
          <WeightLog
            exercises={activeWorkout.exercises || []}
            workoutId={selectedWorkoutId || 'REST'}
            targetDateKey={selectedDateKey}
          />
        ) : (
          <div className="rounded-[20px] border border-black/[0.05] bg-white px-4 py-5 text-center text-[13px] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-gray-400">
            Sem treino atribuido para este dia.
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="overflow-hidden rounded-[26px] border border-black/[0.05] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <div className="flex items-start gap-3 px-5 pb-3 pt-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Objetivo principal</p>
              <p className="mt-2 text-[30px] font-bold leading-[1.02] tracking-[-0.05em] text-gray-950 dark:text-white">
                {activeWorkout?.type || 'Recuperacao'}
              </p>
            </div>
          </div>
          <div className="border-t border-black/[0.05] px-5 py-3 dark:border-white/[0.06]">
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
              {OBJECTIVE_COPY[selectedWorkoutId] ||
                (activeWorkout
                  ? 'Mantenha consistencia e boa execucao em cada serie.'
                  : 'Dia leve para recuperar e manter consistencia.')}
            </p>
          </div>
        </div>
      </section>

      {isInstallAvailable && (
        <section className="mb-4">
          <button
            onClick={onInstall}
            className="flex w-full items-center justify-between gap-3 overflow-hidden rounded-[26px] border border-[#0A3CFF]/10 bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-transform active:scale-[0.99] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none"
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0A3CFF] dark:text-[#AFC5FF]">Instalar app</p>
                <p className="mt-1 text-[15px] font-semibold text-gray-950 dark:text-white">Adicionar o Hibrid Club a tela inicial</p>
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-white shadow-[0_12px_24px_rgba(10,60,255,0.24)]">
              <Download size={18} />
            </span>
          </button>
        </section>
      )}
    </>
  );
}
