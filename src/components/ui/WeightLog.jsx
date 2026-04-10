import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { saveWorkoutLog } from '../../services/storage';

function LogItem({ ex, workoutId }) {
  const isCardio = ex.type === 'cardio';
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!val1 || !val2) return;

    saveWorkoutLog(workoutId, ex.id, {
      kind: isCardio ? 'cardio' : 'strength',
      primary: Number(val1),
      secondary: Number(val2),
      primaryUnit: isCardio ? 'min' : 'kg',
      secondaryUnit: isCardio ? 'km' : 'reps',
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="relative border-b border-light-separator py-3 last:border-0 dark:border-dark-separator">
      {saved && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#0A3CFF] animate-fade-out">
          <span className="text-sm font-bold text-white">Salvo</span>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="min-w-0 flex-1 truncate pr-2 text-[14px] font-semibold text-gray-800 dark:text-gray-100">{ex.name}</span>
        <span className="ml-2 shrink-0 rounded-md bg-light-bg px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-dark-surface dark:text-gray-400">
          {isCardio ? ex.target : ex.sets}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          placeholder={isCardio ? 'Min' : 'Kg'}
          value={val1}
          onChange={(e) => setVal1(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#0A3CFF]/10 bg-light-bg px-2.5 text-[14px] font-semibold text-gray-900 outline-none transition-shadow placeholder:text-gray-500 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
        />
        <input
          type="number"
          inputMode="decimal"
          placeholder={isCardio ? 'Km' : 'Reps'}
          value={val2}
          onChange={(e) => setVal2(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#0A3CFF]/10 bg-light-bg px-2.5 text-[14px] font-semibold text-gray-900 outline-none transition-shadow placeholder:text-gray-500 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
        />
        <button
          onClick={handleSave}
          aria-label="Salvar exercício"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A3CFF] text-white transition-transform active:scale-95"
        >
          <Check size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

export default function WeightLog({ exercises = [], workoutId }) {
  const [expanded, setExpanded] = useState(false);
  if (!exercises.length) return null;

  const visible = expanded ? exercises : exercises.slice(0, 3);

  return (
    <div className="glass-card border border-[#0A3CFF]/8 px-3.5 pb-2 pt-1 dark:border-white/10">
      {visible.map((ex) => (
        <LogItem key={ex.id} ex={ex} workoutId={workoutId} />
      ))}

      {exercises.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 w-full py-2.5 text-center text-[13px] font-bold text-[#0A3CFF] active:opacity-70 dark:text-[#8FB1FF]"
        >
          {expanded ? 'Ver menos' : `Ver todos (${exercises.length})`}
        </button>
      )}
    </div>
  );
}
