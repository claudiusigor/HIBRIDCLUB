import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, CircleCheckBig, PencilLine } from 'lucide-react';
import { getNormalizedWorkoutEntry, getPreviousWorkoutEntry, getWorkoutHistory, saveWorkoutLog } from '../../services/storage';

const REORDER_DELAY_MS = 650;
const SAVE_FEEDBACK_MS = 1450;

const formatLogValue = (value, unit) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue) ? numericValue.toLocaleString('pt-BR') : String(value);
  return `${displayValue} ${unit}`;
};

function LogItem({ ex, workoutId, isDone, onDone, targetDateKey, savedEntry, forceEditMode, itemRef }) {
  const isCardio = ex.type === 'cardio';
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [previousEntry, setPreviousEntry] = useState(null);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(Boolean(forceEditMode));
  const savedTimeoutRef = useRef(null);
  const reorderTimeoutRef = useRef(null);

  useEffect(() => {
    const normalizedSavedEntry = getNormalizedWorkoutEntry(savedEntry, ex);
    const primary = normalizedSavedEntry?.primary;
    const secondary = normalizedSavedEntry?.secondary;
    setVal1(primary === 0 || primary ? String(primary) : '');
    setVal2(secondary === 0 || secondary ? String(secondary) : '');
  }, [ex, savedEntry]);

  useEffect(() => {
    let mounted = true;

    const loadPreviousEntry = async () => {
      const entry = await getPreviousWorkoutEntry({
        workoutId,
        exerciseId: ex.id,
        beforeDateKey: targetDateKey,
        exerciseMeta: ex,
      });
      if (mounted) setPreviousEntry(entry);
    };

    void loadPreviousEntry();

    return () => {
      mounted = false;
    };
  }, [ex, targetDateKey, workoutId]);

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
      if (reorderTimeoutRef.current) {
        window.clearTimeout(reorderTimeoutRef.current);
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

    if (savedTimeoutRef.current) {
      window.clearTimeout(savedTimeoutRef.current);
    }
    if (reorderTimeoutRef.current) {
      window.clearTimeout(reorderTimeoutRef.current);
    }

    reorderTimeoutRef.current = window.setTimeout(() => onDone(ex.id, nextEntry), REORDER_DELAY_MS);
    savedTimeoutRef.current = window.setTimeout(() => setSaved(false), SAVE_FEEDBACK_MS);
  };

  const primaryPlaceholder = previousEntry
    ? formatLogValue(previousEntry.primary, previousEntry.primaryUnit)
    : isCardio
      ? 'Min'
      : 'Kg';
  const secondaryPlaceholder = previousEntry
    ? formatLogValue(previousEntry.secondary, previousEntry.secondaryUnit)
    : isCardio
      ? 'Km'
      : 'Reps';
  const canSave = Boolean(val1 && val2);

  return (
    <div
      ref={itemRef}
      className={`hc-log-item relative border-b border-light-separator py-3 last:border-0 dark:border-dark-separator ${
        isDone && !isEditing ? 'hc-log-item-done' : ''
      }`}
    >
      {saved && (
        <div
          className="hc-save-confirmation absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#0A3CFF] animate-fade-out"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
            <Check size={15} strokeWidth={3} />
            Registro salvo
          </span>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="min-w-0 flex-1 truncate pr-2 text-[0.875rem] font-semibold leading-5 text-gray-800 dark:text-gray-100">{ex.name}</span>
        <span className="hc-numeric ml-2 shrink-0 rounded-md bg-light-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-gray-600 dark:bg-dark-surface dark:text-gray-400">
          {isCardio ? ex.target : ex.sets}
        </span>
      </div>

      {isDone && !isEditing ? (
        <div className="flex items-center justify-between gap-2 py-1 text-[0.8125rem] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <Check size={14} strokeWidth={3} />
            Feito
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`Editar ${ex.name}`}
            title="Editar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
          >
            <PencilLine size={15} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            aria-label={isCardio ? `${ex.name}: minutos` : `${ex.name}: carga em kg`}
            placeholder={primaryPlaceholder}
            value={val1}
            onChange={(event) => setVal1(event.target.value)}
            className="hc-input hc-numeric h-10 min-w-0 flex-1 rounded-xl border border-[#0A3CFF]/10 bg-light-bg px-2.5 text-[0.875rem] font-semibold text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-[#0A3CFF]/40 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
          />
          <input
            type="number"
            inputMode="decimal"
            aria-label={isCardio ? `${ex.name}: quilômetros` : `${ex.name}: repetições`}
            placeholder={secondaryPlaceholder}
            value={val2}
            onChange={(event) => setVal2(event.target.value)}
            className="hc-input hc-numeric h-10 min-w-0 flex-1 rounded-xl border border-[#0A3CFF]/10 bg-light-bg px-2.5 text-[0.875rem] font-semibold text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-[#0A3CFF]/40 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
          />
          <button
            onClick={handleSave}
            disabled={!canSave}
            aria-label="Salvar exercício"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A3CFF] text-white transition hover:bg-[#0833D8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-gray-500"
          >
            <Check size={16} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function WeightLog({ exercises = [], workoutId, targetDateKey, onProgressChange }) {
  const [expanded, setExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewedExercises, setReviewedExercises] = useState({});
  const itemRefs = useRef(new Map());
  const previousRectsRef = useRef(new Map());

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

  const doneCount = useMemo(
    () => exercises.filter((exercise) => Boolean(completedExercises[exercise.id])).length,
    [completedExercises, exercises]
  );
  const allDone = exercises.length > 0 && doneCount === exercises.length;
  const orderedExercises = useMemo(
    () =>
      exercises
        .map((exercise, index) => ({
          exercise,
          index,
          isDone: Boolean(completedExercises[exercise.id]),
          isReviewed: Boolean(reviewedExercises[exercise.id]),
        }))
        .sort((a, b) => {
          if (isReviewing && allDone) {
            return Number(a.isReviewed) - Number(b.isReviewed) || a.index - b.index;
          }
          return Number(a.isDone) - Number(b.isDone) || a.index - b.index;
        })
        .map((item) => item.exercise),
    [allDone, completedExercises, exercises, isReviewing, reviewedExercises]
  );
  const visible = expanded ? orderedExercises : orderedExercises.slice(0, 3);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const nextRects = new Map();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    visible.forEach((exercise) => {
      const node = itemRefs.current.get(exercise.id);
      if (!node) return;

      const rect = node.getBoundingClientRect();
      nextRects.set(exercise.id, { left: rect.left, top: rect.top });

      const previousRect = previousRectsRef.current.get(exercise.id);
      if (!previousRect || reduceMotion) return;

      const deltaX = previousRect.left - rect.left;
      const deltaY = previousRect.top - rect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)`, opacity: 0.96 },
          { transform: 'translate(0, 0)', opacity: 1 },
        ],
        {
          duration: Math.min(520, Math.max(320, Math.abs(deltaY) * 2.2)),
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }
      );
    });

    previousRectsRef.current = nextRects;
  }, [visible]);

  const markExerciseDone = (exerciseId, entry) => {
    setCompletedExercises((previous) => ({
      ...previous,
      [exerciseId]: entry || previous[exerciseId] || true,
    }));
    if (isReviewing) {
      setReviewedExercises((previous) => ({
        ...previous,
        [exerciseId]: true,
      }));
    }
    if (typeof onProgressChange === 'function') {
      onProgressChange();
    }
  };

  const startReview = () => {
    setReviewedExercises({});
    setExpanded(true);
    setIsReviewing(true);
  };

  useEffect(() => {
    if (!allDone) {
      setIsReviewing(false);
      setReviewedExercises({});
    }
  }, [allDone]);

  useEffect(() => {
    setReviewedExercises({});
    previousRectsRef.current = new Map();
  }, [targetDateKey, workoutId]);

  if (!exercises.length) return null;

  if (allDone && !isReviewing) {
    return (
      <div className="hc-workout-complete rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-4 dark:border-emerald-400/35 dark:bg-emerald-500/[0.08]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="hc-complete-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
              <CircleCheckBig size={19} />
            </span>
            <p className="hc-heading text-[1.125rem] leading-tight tracking-[-0.02em] text-emerald-700 dark:text-emerald-200">Treino concluído</p>
          </div>
          <button
            type="button"
            onClick={startReview}
            aria-label="Revisar treino concluído"
            title="Revisar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-400/10"
          >
            <PencilLine size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hc-surface hc-glass overflow-hidden rounded-[22px] border border-black/[0.05] bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.055]">
      <div className="border-b border-black/[0.055] px-3.5 py-3 dark:border-white/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="hc-label text-gray-500 dark:text-gray-400">Preenchimento</p>
          </div>
          <div className="hc-numeric shrink-0 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[0.8125rem] font-semibold leading-none text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-100">
            {doneCount}/{exercises.length}
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-2 pt-1">
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
          itemRef={(node) => {
            if (node) {
              itemRefs.current.set(ex.id, node);
            } else {
              itemRefs.current.delete(ex.id);
            }
          }}
        />
      ))}

      {exercises.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 w-full rounded-xl py-2.5 text-center text-[0.8125rem] font-semibold text-[#0A3CFF] transition hover:bg-[#0A3CFF]/5 active:opacity-70 dark:text-[#8FB1FF] dark:hover:bg-white/[0.04]"
        >
          {expanded ? 'Ver menos' : `Ver todos (${exercises.length})`}
        </button>
      )}

      {allDone && (
        <div className="px-0.5 pb-2 pt-1 text-[0.75rem] font-semibold leading-5 text-emerald-700 dark:text-emerald-300">
          Checklist finalizado
        </div>
      )}
      </div>
    </div>
  );
}
