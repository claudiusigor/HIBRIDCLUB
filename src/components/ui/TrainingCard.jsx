import React from 'react';
import { Play } from 'lucide-react';

export default function TrainingCard({ workout, onStart }) {
  if (!workout) return null;

  const isCardioDay = workout.type === 'Cardio';

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-black/[0.05] bg-white p-5 shadow-[0_20px_42px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#0A3CFF] opacity-10 blur-3xl dark:opacity-20" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              isCardioDay
                ? 'bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]'
                : 'bg-black/[0.05] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300'
            }`}
          >
            {workout.type}
          </span>
          <h2 className="mt-3 text-[28px] font-bold leading-[1.05] tracking-[-0.04em] text-gray-950 dark:text-white">
            {workout.name}
          </h2>
        </div>

        <button
          onClick={onStart}
          aria-label="Iniciar treino"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A3CFF] text-white shadow-[0_16px_30px_rgba(10,60,255,0.24)] transition-transform active:scale-95"
        >
          <Play size={18} fill="currentColor" stroke="none" className="ml-0.5" />
        </button>
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] bg-[#F6F8FD] px-4 py-3 dark:bg-white/[0.05]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Exercícios</p>
          <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{workout.exercises?.length || 0}</p>
        </div>
        <div className="rounded-[20px] bg-[#F6F8FD] px-4 py-3 dark:bg-white/[0.05]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">{workout.day}</p>
          <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{workout.id}</p>
        </div>
      </div>
    </div>
  );
}
