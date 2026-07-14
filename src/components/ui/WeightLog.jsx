import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CircleCheckBig, Pause, PencilLine, Play, RotateCcw } from 'lucide-react';
import { getNormalizedWorkoutEntry, getPreviousWorkoutEntry, getWorkoutHistory, saveWorkoutLog } from '../../services/storage';

const REORDER_DELAY_MS = 650;
const SAVE_FEEDBACK_MS = 1450;

const formatLogValue = (value, unit) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue) ? numericValue.toLocaleString('pt-BR') : String(value);
  return `${displayValue} ${unit}`;
};

const formatCountdown = (seconds) => `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, '0')}`;

function LogItem({ ex, workoutId, isDone, onDone, targetDateKey, savedEntry, forceEditMode, focusMode, itemRef }) {
  const isCardio = ex.type === 'cardio';
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [previousEntry, setPreviousEntry] = useState(null);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(Boolean(forceEditMode));
  const savedTimeoutRef = useRef(null);
  const reorderTimeoutRef = useRef(null);
  const supportsBodyweight = !isCardio && /(barra fixa|flex[aã]o|prancha|abdominal|paralela)/i.test(ex.name || '');

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
  const primaryUnit = isCardio ? 'min' : 'kg';
  const secondaryUnit = isCardio ? 'km' : 'reps';
  const previousSummary = previousEntry
    ? `${formatLogValue(previousEntry.primary, previousEntry.primaryUnit)} · ${formatLogValue(previousEntry.secondary, previousEntry.secondaryUnit)}`
    : '';

  const repeatPrevious = () => {
    if (!previousEntry) return;
    setVal1(String(previousEntry.primary));
    setVal2(String(previousEntry.secondary));
  };

  return (
    <div
      ref={itemRef}
      className={`hc-log-item relative border-b border-light-separator py-3 last:border-0 dark:border-dark-separator ${focusMode ? 'hc-log-item--focus' : ''} ${
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
        <span className={`min-w-0 flex-1 pr-2 font-semibold text-gray-800 dark:text-gray-100 ${focusMode ? 'text-[1.15rem] leading-6' : 'truncate text-[0.875rem] leading-5'}`}>{ex.name}</span>
        <span className="hc-numeric ml-2 shrink-0 rounded-md bg-light-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-gray-600 dark:bg-dark-surface dark:text-gray-400">
          {isCardio ? ex.target : ex.sets}
        </span>
      </div>

      {focusMode && previousEntry && !isDone && (
        <div className="hc-last-performance">
          <div>
            <span>Último treino</span>
            <strong className="hc-numeric">{previousSummary}</strong>
          </div>
          <button type="button" onClick={repeatPrevious}>
            <RotateCcw size={14} aria-hidden="true" /> Repetir
          </button>
        </div>
      )}

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
          <label className="hc-log-field">
            <span className="sr-only">{isCardio ? 'Minutos' : 'Carga em kg'}</span>
            <input
              type="number"
              inputMode="decimal"
              aria-label={isCardio ? `${ex.name}: minutos` : `${ex.name}: carga em kg`}
              placeholder={focusMode ? '0' : primaryPlaceholder}
              value={val1}
              onChange={(event) => setVal1(event.target.value)}
              className="hc-input hc-numeric min-w-0 border border-[#0A3CFF]/10 bg-light-bg text-[0.875rem] font-semibold text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-[#0A3CFF]/40 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
            />
            <b>{primaryUnit}</b>
          </label>
          <label className="hc-log-field">
            <span className="sr-only">{isCardio ? 'Quilômetros' : 'Repetições'}</span>
            <input
              type="number"
              inputMode="decimal"
              aria-label={isCardio ? `${ex.name}: quilômetros` : `${ex.name}: repetições`}
              placeholder={focusMode ? '0' : secondaryPlaceholder}
              value={val2}
              onChange={(event) => setVal2(event.target.value)}
              className="hc-input hc-numeric min-w-0 border border-[#0A3CFF]/10 bg-light-bg text-[0.875rem] font-semibold text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-[#0A3CFF]/40 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder:text-gray-400"
            />
            <b>{secondaryUnit}</b>
          </label>
          <button
            onClick={handleSave}
            disabled={!canSave}
            aria-label="Salvar exercício"
            className="hc-log-save flex shrink-0 items-center justify-center rounded-xl bg-[#0A3CFF] text-white transition hover:bg-[#0833D8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-white/10 dark:disabled:text-gray-500"
          >
            <Check size={16} strokeWidth={3} />
          </button>
        </div>
      )}
      {focusMode && supportsBodyweight && !isDone && (
        <button type="button" className="hc-bodyweight-action" onClick={() => setVal1('0')}>
          Usar peso corporal
        </button>
      )}
    </div>
  );
}

export default function WeightLog({ exercises = [], workoutId, targetDateKey, onProgressChange, focusMode = false }) {
  const [expanded, setExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState({});
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewedExercises, setReviewedExercises] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isRestRunning, setIsRestRunning] = useState(false);
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
    () => {
      if (focusMode) return exercises;
      return exercises
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
        .map((item) => item.exercise);
    },
    [allDone, completedExercises, exercises, focusMode, isReviewing, reviewedExercises]
  );
  const visible = focusMode
    ? orderedExercises.slice(activeIndex, activeIndex + 1)
    : expanded ? orderedExercises : orderedExercises.slice(0, 3);

  useEffect(() => {
    if (!isRestRunning || restSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRestSeconds((seconds) => {
        if (seconds <= 1) {
          setIsRestRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRestRunning, restSeconds]);

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
    setCompletedExercises((previous) => {
      const next = {
        ...previous,
        [exerciseId]: entry || previous[exerciseId] || true,
      };

      if (focusMode) {
        const nextPendingIndex = exercises.findIndex((exercise, index) => index > activeIndex && !next[exercise.id]);
        const firstPendingIndex = exercises.findIndex((exercise) => !next[exercise.id]);
        setActiveIndex(nextPendingIndex >= 0 ? nextPendingIndex : firstPendingIndex >= 0 ? firstPendingIndex : activeIndex);
        setRestSeconds(90);
        setIsRestRunning(true);
      }

      return next;
    });
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

  const toggleRestTimer = () => {
    if (restSeconds <= 0) {
      setRestSeconds(90);
      setIsRestRunning(true);
      return;
    }
    setIsRestRunning((running) => !running);
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
    setActiveIndex(0);
    setRestSeconds(0);
    setIsRestRunning(false);
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
    <>
    <div className={`hc-surface hc-glass overflow-hidden rounded-[22px] border border-black/[0.05] bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.055] ${focusMode ? 'hc-weight-log--focus' : ''}`}>
      <div className="border-b border-black/[0.055] px-3.5 py-3 dark:border-white/[0.07]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="hc-label text-gray-500 dark:text-gray-400">{focusMode ? `Etapa ${activeIndex + 1}` : 'Preenchimento'}</p>
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
          focusMode={focusMode}
          itemRef={(node) => {
            if (node) {
              itemRefs.current.set(ex.id, node);
            } else {
              itemRefs.current.delete(ex.id);
            }
          }}
        />
      ))}

      {!focusMode && exercises.length > 3 && (
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
    {focusMode && (
      <div className="hc-session-stepper hc-glass" aria-label="Controles do treino">
        <button
          type="button"
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
          disabled={activeIndex === 0}
          aria-label="Exercício anterior"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button type="button" className="hc-session-stepper__timer" onClick={toggleRestTimer}>
          {isRestRunning ? <Pause size={15} fill="currentColor" aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
          <span>{restSeconds > 0 ? `Descanso ${formatCountdown(restSeconds)}` : 'Descanso 1:30'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveIndex((index) => Math.min(exercises.length - 1, index + 1))}
          disabled={activeIndex >= exercises.length - 1}
          aria-label="Próximo exercício"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    )}
    </>
  );
}
