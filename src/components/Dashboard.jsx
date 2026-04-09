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

/* Running shoe SVG for cardio days */
const ShoeIcon = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.4 11.6l-1.8-1.6c-.2-.2-.4-.3-.7-.3h-2.3l-1.1-1.7c-.3-.4-.7-.7-1.2-.7H8.9c-.7 0-1.3.4-1.6 1L5.1 13H3.5c-.8 0-1.5.7-1.5 1.5v2c0 .8.7 1.5 1.5 1.5h17c.8 0 1.5-.7 1.5-1.5v-3.2c0-.7-.2-1.3-.6-1.7zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16z"/>
  </svg>
);

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
            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Olá, Claudius</p>
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

      {/* ─── BOTTOM TAB BAR (no labels, icons only) ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-light-card/90 dark:bg-dark-card/90 backdrop-blur-xl border-t border-light-separator dark:border-dark-separator">
        <div className="flex justify-around items-center h-12">
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
                  isActive ? 'text-lime-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
              </button>
            );
          })}
        </div>
      </nav>
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
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-lime-400 text-black shadow-[0_2px_12px_rgba(208,253,62,0.3)]'
                  : 'bg-light-card dark:bg-dark-card text-gray-500 dark:text-gray-400 border border-light-separator dark:border-dark-separator'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-black/60' : ''}`}>
                {w.day.substring(0, 3)}
              </span>
              <span className="text-[16px] font-bold leading-none">{w.id}</span>
              {isCardioDay && (
                <ShoeIcon className={`mt-0.5 ${isActive ? 'text-black/50' : 'text-gray-400 dark:text-gray-500'}`} />
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
