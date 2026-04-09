import React, { useState, useEffect } from 'react';
import { Sun, Moon, Home, Activity, Droplets, CalendarDays } from 'lucide-react';
import { workoutPlan } from '../data/workoutPlan';
import TrainingCard from './ui/TrainingCard';
import WeightLog from './ui/WeightLog';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import NutritionPage from './pages/NutritionPage';
import WorkoutExecution from './WorkoutExecution';

const TABS = { HOME: 'home', STATS: 'stats', NUTRITION: 'nutrition', HISTORY: 'history' };

/* ShoeIcon removed, using /icontenis.png directly */

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(TABS.HOME);
  const [selectedDay, setSelectedDay] = useState('A');
  const [isExecuting, setIsExecuting] = useState(false);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const activeWorkout = workoutPlan.schedule[selectedDay];
  const days = Object.values(workoutPlan.schedule);

  if (isExecuting) {
    return <WorkoutExecution workout={activeWorkout} onClose={() => setIsExecuting(false)} />;
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-white transition-colors duration-200 pb-20">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-lg px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">Olá, Claudius</p>
            <h1 className="text-[22px] font-bold tracking-tight leading-tight text-gray-900 dark:text-white">Mantenha-se Ativo!</h1>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-light-card dark:bg-dark-card border border-light-separator dark:border-dark-separator text-gray-600 dark:text-gray-300 transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ─── TAB CONTENT ─── */}
      <div className="px-5">
        {activeTab === TABS.HOME && (
          <HomeContent
            days={days}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            activeWorkout={activeWorkout}
            onStartWorkout={() => setIsExecuting(true)}
          />
        )}
        {activeTab === TABS.STATS && <StatsPage />}
        {activeTab === TABS.NUTRITION && <NutritionPage />}
        {activeTab === TABS.HISTORY && <HistoryPage />}
      </div>

      {/* ─── BOTTOM FLOATING DOCK (no labels, icons only) ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
        <nav className="glass-card !border-white/30 dark:!border-white/10 !rounded-full px-6 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
          <div className="flex justify-between items-center h-10 w-[240px] max-w-[90vw]">
          {[
            { id: TABS.HOME, Icon: Home },
            { id: TABS.STATS, Icon: Activity },
            { id: TABS.NUTRITION, Icon: Droplets },
            { id: TABS.HISTORY, Icon: CalendarDays },
          ].map(({ id, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center justify-center w-12 h-12 transition-colors ${
                  isActive ? 'text-[#0B5ED7]' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
              </button>
            );
          })}
        </div>
        </nav>
      </div>
    </div>
  );
}

/* ─── HOME TAB CONTENT ─── */
function HomeContent({ days, selectedDay, setSelectedDay, activeWorkout, onStartWorkout }) {
  return (
    <>
      {/* Day Selector — Pill rectangles like the reference */}
      <div className="flex gap-2 mb-6 justify-between">
        {days.map((w) => {
          const isActive = selectedDay === w.id;
          const isCardioDay = w.type === 'Cardio';
          return (
            <button
              key={w.id}
              onClick={() => setSelectedDay(w.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-[20px] transition-all duration-300 ${
                isActive
                  ? 'bg-[#0B5ED7] text-white shadow-[0_8px_16px_rgba(11,94,215,0.3)]'
                  : 'bg-[#F2F7FD] dark:bg-white/5 text-[#0B5ED7] dark:text-[#6EA8FF] border border-transparent'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/80' : 'opacity-80'}`}>
                {w.day.substring(0, 3)}
              </span>
              <span className="text-[18px] font-bold leading-none mt-0.5">{w.id}</span>
              {isCardioDay && (
                <img src="/icontenis.png" alt="Cardio" className="-mb-2 mt-0.5 w-12 h-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Training Card */}
      <TrainingCard workout={activeWorkout} onStart={onStartWorkout} />

      {/* Exercise Log */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold mb-3 text-gray-900 dark:text-white">Treino Diário</h3>
        <WeightLog exercises={activeWorkout.exercises} workoutId={selectedDay} />
      </div>
    </>
  );
}
