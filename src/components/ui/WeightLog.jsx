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
    if (isCardio) {
      saveWorkoutLog(workoutId, ex.id, `${val1} min`, `${val2} km`);
    } else {
      saveWorkoutLog(workoutId, ex.id, val1, val2);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="relative py-3 border-b border-light-separator dark:border-dark-separator last:border-0">
      {saved && (
        <div className="absolute inset-0 bg-lime-400 z-10 flex items-center justify-center rounded-xl animate-fade-out">
          <span className="font-bold text-black text-sm">✓ Salvo</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 truncate pr-2 flex-1 min-w-0">{ex.name}</span>
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-light-bg dark:bg-dark-surface px-2 py-0.5 rounded-md shrink-0 ml-2">
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
          className="flex-1 min-w-0 h-9 bg-light-bg dark:bg-dark-surface rounded-lg px-2.5 text-[14px] font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 ring-lime-400 transition-shadow"
        />
        <input
          type="number"
          inputMode="decimal"
          placeholder={isCardio ? 'Km' : 'Reps'}
          value={val2}
          onChange={(e) => setVal2(e.target.value)}
          className="flex-1 min-w-0 h-9 bg-light-bg dark:bg-dark-surface rounded-lg px-2.5 text-[14px] font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 ring-lime-400 transition-shadow"
        />
        <button
          onClick={handleSave}
          className="w-9 h-9 bg-lime-400 rounded-lg flex items-center justify-center text-black shrink-0 active:scale-95 transition-transform"
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
    <div className="bg-light-card dark:bg-dark-card rounded-2xl px-3.5 pt-1 pb-2 border border-light-separator dark:border-dark-separator transition-colors">
      {visible.map((ex) => (
        <LogItem key={ex.id} ex={ex} workoutId={workoutId} />
      ))}

      {exercises.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-[13px] font-semibold text-lime-500 py-2.5 mt-1 active:opacity-70"
        >
          {expanded ? 'Ver Menos' : `Ver Todos (${exercises.length})`}
        </button>
      )}
    </div>
  );
}
