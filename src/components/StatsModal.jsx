import React, { useEffect, useState } from 'react';
import { X, Trophy, Database, Activity } from 'lucide-react';
import { getNormalizedWorkoutEntry, getWorkoutHistory, getWorkoutSessions } from '../services/storage';
import { workoutPlan } from '../data/workoutPlan';

export default function StatsModal({ onClose }) {
  const [stats, setStats] = useState({ totalWorkouts: 0, totalExercises: 0, totalVolume: 0 });

  useEffect(() => {
    const history = getWorkoutHistory();
    let exercisesCount = 0;
    let volumeKg = 0;
    let totalWorkouts = 0;

    Object.values(history).forEach((dayEntry) => {
      getWorkoutSessions(dayEntry).forEach((session) => {
        totalWorkouts += 1;

        Object.entries(session.exercises || {}).forEach(([exerciseId, record]) => {
          exercisesCount += 1;

          const plan = workoutPlan.schedule[session.workoutId];
          const exerciseMeta = plan?.exercises?.find((exercise) => exercise.id === exerciseId);
          const normalized = getNormalizedWorkoutEntry(record, exerciseMeta);

          if (normalized?.kind === 'strength') {
            volumeKg += normalized.primary * normalized.secondary;
          }
        });
      });
    });

    setStats({
      totalWorkouts,
      totalExercises: exercisesCount,
      totalVolume: volumeKg,
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-white/90 p-6 backdrop-blur-xl transition-colors duration-300 dark:bg-obsidian/95">
      <div className="mb-10 flex items-center justify-between pt-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-black dark:text-white">Desempenho</h1>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:text-black dark:bg-surface dark:text-white/50 dark:hover:text-white"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="relative flex items-center gap-6 overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl transition-colors duration-300 dark:border-white/5 dark:bg-charcoal">
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-primary-400/10 blur-2xl" />
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary-500/20 bg-gray-50 dark:border-primary-400/20 dark:bg-surface">
            <Trophy className="text-primary-500 dark:text-primary-400" size={32} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40">Sessões concluídas</span>
            <div className="text-4xl font-display font-black text-black dark:text-white">{stats.totalWorkouts}</div>
          </div>
        </div>

        <div className="relative flex items-center gap-6 overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl transition-colors duration-300 dark:border-white/5 dark:bg-charcoal">
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-[#0A3CFF]/10 blur-2xl" />
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#0A3CFF]/20 bg-[#F4F7FF] dark:bg-surface">
            <Database className="text-[#0A3CFF] dark:text-[#AFC5FF]" size={32} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40">Exercícios salvos</span>
            <div className="text-4xl font-display font-black text-black dark:text-white">{stats.totalExercises}</div>
          </div>
        </div>

        <div className="relative flex items-center gap-6 overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl transition-colors duration-300 dark:border-white/5 dark:bg-charcoal">
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-[#0A3CFF]/10 blur-2xl" />
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#0A3CFF]/20 bg-[#F4F7FF] dark:bg-surface">
            <Activity className="text-[#0A3CFF] dark:text-[#AFC5FF]" size={32} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40">Carga total deslocada</span>
            <div className="text-4xl font-display font-black text-black dark:text-white">
              {stats.totalVolume.toLocaleString('pt-BR')} <span className="text-sm font-medium text-gray-400 dark:text-white/30">kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
