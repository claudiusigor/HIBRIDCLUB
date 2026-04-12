import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, CircleCheckBig, PencilLine } from 'lucide-react';
import { getWorkoutHistory, saveWorkoutLog } from '../../services/storage';

function LogItem({ ex, workoutId, isDone, onDone, targetDateKey, savedEntry, forceEditMode }) {
  const isCardio = ex.type === 'cardio';
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const savedTimeoutRef = useRef(null);

  useEffect(() => {
    const primary = savedEntry?.primary;
    const secondary = savedEntry?.secondary;
    setVal1(primary === 0 || primary ? String(primary) : '');
    setVal2(secondary === 0 || secondary ? String(secondary) : '');
  }, [savedEntry]);

  useEffect(() => {
    if (forceEditMode) {
      setIsEditing(true);
    }
  }, [forceEditMode]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!val1 || !val2) return;

    const nextEntry = {
      kind: isCardio ? 'cardio' : 'strength',
      primary: Number(val1),
      secondary: Number(val2),
      primaryUnit: isCardio ? 'min' : 'kg',
      secondaryUnit: isCardio ? 'km' : 'reps',
    };

    const didSave = await saveWorkoutLog(workoutId, ex.id, nextEntry, targetDateKey);
    if (!didSave) return;

    setSaved(true);
    setIsEditing(false);
    onDone(ex.id, nextEntry);

    if (savedTimeoutRef.current) {
      window.clearTimeout(savedTimeoutRef.current);
    }
    savedTimeoutRef.current = window.setTimeout(() => setSaved(false), 1500);
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

      {isDone && !isEditing ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span>Feito</span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-white/60 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-300/35 dark:bg-black/15 dark:text-emerald-200"
          >
            <PencilLine size={12} />
            Editar
          </button>
        </div>
      ) : (
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
            aria-label="Salvar exercicio"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A3CFF] text-white transition-transform active:scale-95"
          >
            <Check size={16} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function WeightLog({ exercises = [], workoutId, targetDateKey }) {
  const [expanded, setExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState({});
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSavedExercises = async () => {
      const history = await getWorkoutHistory();
      if (!mounted) return;

      const savedSession = history?.[targetDateKey]?.sessions?.[workoutId];
      const nextMap = {};
      Object.entries(savedSession?.exercises || {}).forEach(([exerciseId, entry]) => {
        nextMap[exerciseId] = entry;
      });
      setCompletedExercises(nextMap);
    };

    void loadSavedExercises();

    return () => {
      mounted = false;
    };
  }, [targetDateKey, workoutId]);

  if (!exercises.length) return null;

  const doneCount = useMemo(
    () => exercises.filter((exercise) => Boolean(completedExercises[exercise.id])).length,
    [completedExercises, exercises]
  );
  const allDone = exercises.length > 0 && doneCount === exercises.length;

  const markExerciseDone = (exerciseId, entry) => {
    setCompletedExercises((previous) => ({
      ...previous,
      [exerciseId]: entry || previous[exerciseId] || true,
    }));
  };

  useEffect(() => {
    if (!allDone) {
      setIsReviewing(false);
    }
  }, [allDone]);

  if (allDone && !isReviewing) {
    return (
      <div className="glass-card border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-4 dark:border-emerald-400/35 dark:bg-emerald-500/[0.08]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CircleCheckBig size={19} />
            </span>
            <p className="text-[20px] font-bold tracking-[-0.03em] text-emerald-700 dark:text-emerald-200">Treino concluido</p>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/35 bg-white/70 px-3 py-2 text-[12px] font-semibold text-emerald-700 dark:border-emerald-300/35 dark:bg-black/15 dark:text-emerald-200"
          >
            <PencilLine size={13} />
            Revisar
          </button>
        </div>
      </div>
    );
  }

  const visible = expanded ? exercises : exercises.slice(0, 3);

  return (
    <div className="glass-card border border-[#0A3CFF]/8 px-3.5 pb-2 pt-1 dark:border-white/10">
      {visible.map((ex) => (
        <LogItem
          key={ex.id}
          ex={ex}
          workoutId={workoutId}
          isDone={Boolean(completedExercises[ex.id])}
          savedEntry={completedExercises[ex.id]}
          onDone={markExerciseDone}
          targetDateKey={targetDateKey}
          forceEditMode={isReviewing}
        />
      ))}

      {exercises.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 w-full py-2.5 text-center text-[13px] font-bold text-[#0A3CFF] active:opacity-70 dark:text-[#8FB1FF]"
        >
          {expanded ? 'Ver menos' : `Ver todos (${exercises.length})`}
        </button>
      )}

      <div className="px-0.5 pb-2 pt-1 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {doneCount}/{exercises.length} feitos
      </div>
    </div>
  );
}
