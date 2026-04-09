import React from 'react';
import { Play } from 'lucide-react';

export default function TrainingCard({ workout, onStart }) {
  if (!workout) return null;

  const isCardioDay = workout.type === 'Cardio';

  return (
    <div className="relative glass-card p-5">
      {/* Decorative */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-50 dark:opacity-20 ${isCardioDay ? 'bg-cyan-500' : 'bg-[#0B5ED7]'}`} />

      <div className="relative z-10 flex justify-between items-start">
        <div className="flex-1">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${isCardioDay ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-blue-500/10 text-blue-600 dark:text-[#6EA8FF]'}`}>
            {workout.type}
          </span>
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mt-2 leading-tight pr-12">
            {workout.name}
          </h2>
        </div>
        <button
          onClick={onStart}
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform ${isCardioDay ? 'bg-cyan-500 text-white' : 'bg-[#0B5ED7] text-white shadow-lg shadow-blue-500/30'}`}
        >
          <Play size={18} fill="currentColor" stroke="none" className="ml-0.5" />
        </button>
      </div>

      <div className="relative z-10 flex gap-6 mt-5 text-gray-800 dark:text-gray-200">
        <div>
          <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">Exercícios</p>
          <p className="text-xl font-bold">{workout.exercises?.length || 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wider">{workout.day}</p>
          <p className="text-xl font-bold">{workout.id}</p>
        </div>
      </div>
    </div>
  );
}
