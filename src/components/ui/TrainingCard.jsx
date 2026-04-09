import React from 'react';
import { Play } from 'lucide-react';

export default function TrainingCard({ workout, onStart }) {
  if (!workout) return null;

  const isCardioDay = workout.type === 'Cardio';

  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden ${isCardioDay ? 'bg-cyan-500' : 'bg-lime-400'}`}>
      {/* Decorative */}
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex justify-between items-start">
        <div className="flex-1">
          <span className="inline-block bg-black/10 text-black px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide">
            {workout.type}
          </span>
          <h2 className="text-[22px] font-bold text-black mt-2 leading-tight pr-12">
            {workout.name}
          </h2>
        </div>
        <button
          onClick={onStart}
          className="w-11 h-11 bg-black rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <Play size={18} fill={isCardioDay ? '#00E5FF' : '#D0FD3E'} stroke="none" className="ml-0.5" />
        </button>
      </div>

      <div className="relative z-10 flex gap-6 mt-5 text-black">
        <div>
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">Exercícios</p>
          <p className="text-xl font-bold">{workout.exercises?.length || 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">{workout.day}</p>
          <p className="text-xl font-bold">{workout.id}</p>
        </div>
      </div>
    </div>
  );
}
