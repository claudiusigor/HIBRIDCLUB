import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  Download,
  House,
  Footprints,
  Droplets,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';
import { workoutPlan } from '../data/workoutPlan';
import TrainingCard from './ui/TrainingCard';
import WeightLog from './ui/WeightLog';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import NutritionPage from './pages/NutritionPage';
import PlanPage from './pages/PlanPage';
import WorkoutExecution from './WorkoutExecution';

const TABS = { HOME: 'home', STATS: 'stats', NUTRITION: 'nutrition', HISTORY: 'history', PLAN: 'plan' };

const OBJECTIVE_COPY = {
  A: 'Priorize carga, controle e potência nas pernas.',
  B: 'Empurre forte e estabilize o tronco no puxar.',
  C: 'Sustente o ritmo e firme o core a cada bloco.',
  D: 'Ative posteriores e glúteos com execução sólida.',
  E: 'Construa costas fortes e ombros estáveis no volume.',
  F: 'Mantenha constância, respiração e pace confortável.',
};

const TODAY_WORKOUT_BY_WEEKDAY = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
  5: 'E',
  6: 'F',
};

const DOCK_ITEMS = [
  { id: TABS.HOME, Icon: House, label: 'Início', iconSize: 20 },
  { id: TABS.STATS, Icon: Footprints, label: 'Cardio', iconSize: 20 },
  { id: TABS.NUTRITION, Icon: Droplets, label: 'Água', iconSize: 20 },
  { id: TABS.HISTORY, Icon: CalendarDays, label: 'Histórico', iconSize: 20 },
  { id: TABS.PLAN, Icon: ClipboardList, label: 'Plano', iconSize: 21 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [selectedDay, setSelectedDay] = useState('A');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

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

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallAvailable(false);
  };

  const activeWorkout = workoutPlan.schedule[selectedDay];
  const days = Object.values(workoutPlan.schedule);
  const todayWorkoutId = TODAY_WORKOUT_BY_WEEKDAY[new Date().getDay()] || null;

  if (isExecuting) {
    return <WorkoutExecution workout={activeWorkout} onClose={() => setIsExecuting(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-24 text-gray-900 transition-colors duration-200 dark:bg-[#0A0D14] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-black/[0.04] bg-[#F5F7FB]/85 px-5 pb-4 pt-3.5 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#0A0D14]/80">
        <div className="mb-4.5 grid grid-cols-[44px_1fr_44px] items-center">
          <div />
          <div className="flex justify-center">
            <img
              src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
              alt="Hybrid Club"
              className="h-auto max-h-[72px] w-auto object-contain sm:max-h-[84px]"
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
          <div className="rounded-[26px] bg-black/[0.04] p-1.5 dark:bg-white/[0.06]">
            <div className="grid grid-cols-6 gap-1.5">
              {days.map((w) => {
                const isActive = selectedDay === w.id;
                const isCardioDay = w.type === 'Cardio';
                const isTodayCard = todayWorkoutId === w.id;

                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedDay(w.id)}
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
                      {w.day.substring(0, 3)}
                    </span>
                    <span className={`mt-1 text-[18px] font-bold leading-none ${isTodayCard && !isActive ? 'text-gray-950 dark:text-white' : ''}`}>
                      {w.id}
                    </span>
                    <span className="mt-1 flex h-5 items-center justify-center">
                      {isCardioDay ? (
                        <img
                          src={`${import.meta.env.BASE_URL}icontenis3.png?v=4`}
                          alt=""
                          aria-hidden="true"
                          className={`h-10 w-10 object-contain ${
                            isActive
                              ? isDark
                                ? 'brightness-0 invert'
                                : 'opacity-100'
                              : 'opacity-70 dark:opacity-85'
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
        )}
      </header>

      <div className="px-5 pt-5">
        {activeTab === TABS.HOME && (
          <HomeContent
            activeWorkout={activeWorkout}
            onStartWorkout={() => setIsExecuting(true)}
            selectedDay={selectedDay}
            isInstallAvailable={isInstallAvailable}
            onInstall={handleInstall}
          />
        )}
        {activeTab === TABS.STATS && <StatsPage />}
        {activeTab === TABS.NUTRITION && <NutritionPage />}
        {activeTab === TABS.HISTORY && <HistoryPage />}
        {activeTab === TABS.PLAN && <PlanPage />}
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
                  <item.Icon
                    size={item.iconSize}
                    strokeWidth={1.9}
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-[#546173] dark:text-[#9AA7BC]'
                    }`}
                  />
                  <span className={`mt-1 text-[11px] font-semibold tracking-[-0.01em] ${isActive ? 'text-white/92' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function HomeContent({ activeWorkout, onStartWorkout, selectedDay, isInstallAvailable, onInstall }) {
  return (
    <>
      {isInstallAvailable && (
        <section className="mb-4">
          <button
            onClick={onInstall}
            className="flex w-full items-center justify-between gap-3 overflow-hidden rounded-[26px] border border-[#0A3CFF]/10 bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-transform active:scale-[0.99] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none"
          >
            <div className="flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}iconpwa.png`} alt="" aria-hidden="true" className="h-12 w-12 rounded-[14px] object-cover shadow-[0_8px_18px_rgba(15,23,42,0.14)]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0A3CFF] dark:text-[#AFC5FF]">Instalar app</p>
                <p className="mt-1 text-[15px] font-semibold text-gray-950 dark:text-white">Adicionar o Hyperactive à tela inicial</p>
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-white shadow-[0_12px_24px_rgba(10,60,255,0.24)]">
              <Download size={18} />
            </span>
          </button>
        </section>
      )}

      <section className="mb-4">
        <div className="mb-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#8FB1FF]">Plano do dia</p>
          </div>
        </div>
        <TrainingCard workout={activeWorkout} onStart={onStartWorkout} />
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
                {activeWorkout?.type}
              </p>
            </div>
          </div>
          <div className="border-t border-black/[0.05] px-5 py-3 dark:border-white/[0.06]">
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
              {OBJECTIVE_COPY[selectedDay] || 'Mantenha consistência e boa execução em cada série.'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Registro rápido</p>
            <h3 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">Treino diário</h3>
          </div>
        </div>
        <WeightLog exercises={activeWorkout.exercises} workoutId={selectedDay} />
      </section>
    </>
  );
}
