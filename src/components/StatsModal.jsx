import React, { useEffect, useState } from 'react';
import { X, Trophy, Database, Activity } from 'lucide-react';
import { getWorkoutHistory } from '../services/storage';

export default function StatsModal({ onClose }) {
  const [stats, setStats] = useState({ totalWorkouts: 0, totalExercises: 0, totalVolume: 0 });

  useEffect(() => {
    const history = getWorkoutHistory();
    const keys = Object.keys(history);
    
    let exercisesCount = 0;
    let volumeKg = 0;

    keys.forEach(date => {
        const exs = history[date].exercises || {};
        exercisesCount += Object.keys(exs).length;
        Object.values(exs).forEach(record => {
            const kg = parseFloat(record.kg);
            const reps = parseFloat(record.reps);
            if (!isNaN(kg) && !isNaN(reps)) {
                volumeKg += (kg * reps);
            }
        });
    });

    setStats({
        totalWorkouts: keys.length,
        totalExercises: exercisesCount,
        totalVolume: volumeKg
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-obsidian/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10 pt-4">
         <h1 className="text-3xl font-display font-bold tracking-tight text-black dark:text-white">Desempenho</h1>
         <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-surface rounded-full flex items-center justify-center text-gray-500 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors">
            <X size={20} strokeWidth={2.5} />
         </button>
      </div>

      <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-charcoal rounded-3xl p-6 border border-gray-100 dark:border-white/5 flex items-center gap-6 shadow-xl relative overflow-hidden transition-colors duration-300">
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-primary-400/10 rounded-full blur-2xl"></div>
             <div className="w-16 h-16 bg-gray-50 dark:bg-surface rounded-2xl flex items-center justify-center shrink-0 border border-primary-500/20 dark:border-primary-400/20">
                <Trophy className="text-primary-500 dark:text-primary-400" size={32} />
             </div>
             <div>
                 <span className="text-xs uppercase font-bold text-gray-400 dark:text-white/40 tracking-widest">Sessões Concluídas</span>
                 <div className="text-4xl font-display font-black text-black dark:text-white">{stats.totalWorkouts}</div>
             </div>
          </div>

          <div className="bg-white dark:bg-charcoal rounded-3xl p-6 border border-gray-100 dark:border-white/5 flex items-center gap-6 shadow-xl relative overflow-hidden transition-colors duration-300">
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-[#00E5FF]/10 rounded-full blur-2xl"></div>
             <div className="w-16 h-16 bg-cyan-50 dark:bg-surface rounded-2xl flex items-center justify-center shrink-0 border border-[#00E5FF]/20">
                <Database className="text-cyan-500 dark:text-[#00E5FF]" size={32} />
             </div>
             <div>
                 <span className="text-xs uppercase font-bold text-gray-400 dark:text-white/40 tracking-widest">Exercícios Salvos</span>
                 <div className="text-4xl font-display font-black text-black dark:text-white">{stats.totalExercises}</div>
             </div>
          </div>

          <div className="bg-white dark:bg-charcoal rounded-3xl p-6 border border-gray-100 dark:border-white/5 flex items-center gap-6 shadow-xl relative overflow-hidden transition-colors duration-300">
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
             <div className="w-16 h-16 bg-purple-50 dark:bg-surface rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/20">
                <Activity className="text-purple-500 dark:text-purple-400" size={32} />
             </div>
             <div>
                 <span className="text-xs uppercase font-bold text-gray-400 dark:text-white/40 tracking-widest">Carga Total Deslocada</span>
                 <div className="text-4xl font-display font-black text-black dark:text-white">{stats.totalVolume} <span className="text-sm font-medium text-gray-400 dark:text-white/30">KG</span></div>
             </div>
          </div>
      </div>

    </div>
  );
}
