import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Droplets,
  Dumbbell,
  Flame,
  GripVertical,
  Pencil,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { workoutPlan } from '../../data/workoutPlan';
import {
  DAY_NAMES,
  DEFAULT_WEEK_ORDER,
  SESSION_IDS,
  WEEK_ORDER_KEYS,
  getUserPlanDraft,
  normalizePlanModel,
  publishUserPlanDraft,
  saveUserPlanDraft,
} from '../../services/plans';

const WEEKDAY_TITLES = {
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sabado',
  DOM: 'Domingo',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeExercise(exercise, index) {
  return {
    id: exercise?.id || `custom_${index + 1}`,
    name: exercise?.name || '',
    type: exercise?.type === 'cardio' ? 'cardio' : 'strength',
    sets: exercise?.sets || '',
    target: exercise?.target || '',
    note: exercise?.note || '',
  };
}

export default function PlanPage({ plan = workoutPlan, userId, onPlanUpdated }) {
  const [editMode, setEditMode] = useState(false);
  const [draftPlan, setDraftPlan] = useState(() => normalizePlanModel(plan));
  const [expandedWeekday, setExpandedWeekday] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [draftTouched, setDraftTouched] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState('');
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);
  const [animatedWeekdays, setAnimatedWeekdays] = useState([]);
  const [touchDragOverWeekday, setTouchDragOverWeekday] = useState(null);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [pointerDragOffsetY, setPointerDragOffsetY] = useState(0);

  const draftPlanRef = useRef(draftPlan);
  const draftTouchedRef = useRef(draftTouched);
  const editModeRef = useRef(editMode);
  const userIdRef = useRef(userId);
  const autoSaveInFlightRef = useRef(false);
  const queuedAutoSaveRef = useRef(null);
  const cardRefs = useRef({});
  const previousCardPositionsRef = useRef({});
  const pointerDragStartYRef = useRef(0);
  const pointerDragActivatedRef = useRef(false);
  const pointerCardTopsRef = useRef({});
  const pointerCardBoundsRef = useRef({});
  const pointerSourceTopRef = useRef(0);
  const pointerLastClientYRef = useRef(0);
  const pointerDragOffsetYRef = useRef(0);

  useEffect(() => {
    draftPlanRef.current = draftPlan;
  }, [draftPlan]);

  useEffect(() => {
    draftTouchedRef.current = draftTouched;
  }, [draftTouched]);

  useEffect(() => {
    editModeRef.current = editMode;
  }, [editMode]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (editMode || draftTouched) return;
    setDraftPlan(normalizePlanModel(plan));
  }, [plan, editMode, draftTouched]);

  useEffect(() => {
    if (!userId) return;
    const cacheKey = `hc_plan_draft_cache_${userId}`;
    try {
      const cachedValue = localStorage.getItem(cacheKey);
      if (cachedValue && !editModeRef.current && !draftTouchedRef.current) {
        const parsed = JSON.parse(cachedValue);
        if (parsed?.planData) {
          setDraftPlan(normalizePlanModel(parsed.planData));
        }
      }
    } catch {
      // ignore invalid local draft cache
    }

    let mounted = true;
    void (async () => {
      try {
        const remoteDraft = await getUserPlanDraft(userId);
        if (!mounted || !remoteDraft) return;
        setDraftPlan((previous) => {
          if (editModeRef.current || draftTouchedRef.current) {
            return previous;
          }
          return normalizePlanModel(remoteDraft);
        });
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ planData: remoteDraft, updatedAt: Date.now() }));
        } catch {
          // ignore local cache write failure
        }
      } catch {
        // ignore bootstrap draft load failure
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    setDraftTouched(false);
    setAutoSaveError('');
    setLastAutoSavedAt(null);
    queuedAutoSaveRef.current = null;
    autoSaveInFlightRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId || !editMode) return;
    try {
      localStorage.setItem(`hc_plan_draft_cache_${userId}`, JSON.stringify({ planData: draftPlan, updatedAt: Date.now() }));
    } catch {
      // ignore local cache write failure
    }
  }, [draftPlan, editMode, userId]);

  const activePlan = editMode ? draftPlan : normalizePlanModel(plan);
  const weekOrder = activePlan.weekOrder || DEFAULT_WEEK_ORDER;
  const assignedCount = Object.values(weekOrder).filter(Boolean).length;
  const planBadge = activePlan?.metadata?.isTemplate ? activePlan.metadata.title || 'Plano Base Hibrid Club' : 'Plano Pessoal';
  const sourceLabel = activePlan?.metadata?.sourceFile || 'estrutura interna do app';

  const cards = useMemo(
    () =>
      WEEK_ORDER_KEYS.map((weekdayKey) => {
        const workoutId = weekOrder[weekdayKey] || null;
        return {
          weekdayKey,
          weekdayLabel: WEEKDAY_TITLES[weekdayKey],
          workoutId,
          session: workoutId ? activePlan.schedule[workoutId] : null,
          isRest: !workoutId,
        };
      }),
    [activePlan.schedule, weekOrder]
  );

  useLayoutEffect(() => {
    const currentPositions = {};
    cards.forEach((card) => {
      const element = cardRefs.current[card.weekdayKey];
      if (!element) return;
      currentPositions[card.weekdayKey] = element.getBoundingClientRect().top;
    });

    cards.forEach((card) => {
      const element = cardRefs.current[card.weekdayKey];
      if (!element) return;

      const previousTop = previousCardPositionsRef.current[card.weekdayKey];
      const currentTop = currentPositions[card.weekdayKey];
      if (typeof previousTop !== 'number' || typeof currentTop !== 'number') return;

      const deltaY = previousTop - currentTop;
      if (Math.abs(deltaY) < 1) return;

      element.style.transition = 'none';
      element.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        element.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
        element.style.transform = '';
      });
    });

    previousCardPositionsRef.current = currentPositions;
  }, [cards]);

  const expandedCard = cards.find((card) => card.weekdayKey === expandedWeekday) || null;

  const updateDraft = (updater) => {
    setDraftPlan((previous) => {
      const base = normalizePlanModel(previous || plan);
      updater(base);
      const normalized = normalizePlanModel(base);
      draftPlanRef.current = normalized;
      return normalized;
    });
    setDraftTouched(true);
    setAutoSaveError('');
  };

  const animateDays = (weekdayKeys, duration = 420) => {
    const validKeys = (weekdayKeys || []).filter(Boolean);
    if (!validKeys.length) return;
    setAnimatedWeekdays((current) => Array.from(new Set([...current, ...validKeys])));
    window.setTimeout(() => {
      setAnimatedWeekdays((current) => current.filter((key) => !validKeys.includes(key)));
    }, duration);
  };

  const getWeekdayFromClientPoint = (clientX, clientY, sourceKey = null) => {
    const elements =
      typeof document.elementsFromPoint === 'function'
        ? document.elementsFromPoint(clientX, clientY)
        : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

    for (const element of elements) {
      const cardElement = element?.closest?.('[data-weekday-key]');
      const weekdayKey = cardElement?.getAttribute?.('data-weekday-key');
      if (!weekdayKey || !WEEK_ORDER_KEYS.includes(weekdayKey)) continue;
      if (sourceKey && weekdayKey === sourceKey) continue;
      return weekdayKey;
    }
    return null;
  };

  const getWeekdayFromPointerZone = (clientY, sourceKey) => {
    const candidates = WEEK_ORDER_KEYS.filter((key) => key !== sourceKey)
      .map((key) => ({ weekdayKey: key, ...pointerCardBoundsRef.current[key] }))
      .filter((entry) => typeof entry.top === 'number' && typeof entry.bottom === 'number');

    if (!candidates.length) return null;

    const padding = 8;
    const inside = candidates.find((entry) => clientY >= entry.top + padding && clientY <= entry.bottom - padding);
    if (inside) return inside.weekdayKey;

    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of candidates) {
      const distance = Math.abs(clientY - entry.center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = entry;
      }
    }

    if (!nearest) return null;
    return nearestDistance <= nearest.height * 0.55 ? nearest.weekdayKey : null;
  };

  const handlePointerDragStart = (weekdayKey, event) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    pointerDragStartYRef.current = event.clientY;
    pointerLastClientYRef.current = event.clientY;
    pointerDragActivatedRef.current = false;
    pointerDragOffsetYRef.current = 0;
    pointerCardTopsRef.current = WEEK_ORDER_KEYS.reduce((acc, key) => {
      const element = cardRefs.current[key];
      if (!element) return acc;
      const rect = element.getBoundingClientRect();
      acc[key] = rect.top;
      return acc;
    }, {});
    pointerCardBoundsRef.current = WEEK_ORDER_KEYS.reduce((acc, key) => {
      const element = cardRefs.current[key];
      if (!element) return acc;
      const rect = element.getBoundingClientRect();
      acc[key] = {
        top: rect.top,
        bottom: rect.bottom,
        center: rect.top + rect.height / 2,
        height: rect.height,
      };
      return acc;
    }, {});
    pointerSourceTopRef.current = pointerCardTopsRef.current[weekdayKey] || 0;
    setPointerDragOffsetY(0);
    setIsPointerDragging(false);
    setDragSource(weekdayKey);
    setTouchDragOverWeekday(null);
  };

  const handlePointerDragMove = (event) => {
    if (!editMode || !dragSource) return;
    pointerLastClientYRef.current = event.clientY;
    const nextOffsetY = event.clientY - pointerDragStartYRef.current;

    if (!pointerDragActivatedRef.current) {
      if (Math.abs(nextOffsetY) < 8) {
        event.preventDefault();
        return;
      }
      pointerDragActivatedRef.current = true;
      setIsPointerDragging(true);
    }

    setPointerDragOffsetY(nextOffsetY);
    pointerDragOffsetYRef.current = nextOffsetY;
    const sourceHeight = pointerCardBoundsRef.current[dragSource]?.height || 0;
    const draggedCenterY = pointerSourceTopRef.current + nextOffsetY + sourceHeight / 2;
    const weekdayKey =
      getWeekdayFromPointerZone(draggedCenterY, dragSource) ||
      getWeekdayFromClientPoint(event.clientX, event.clientY, dragSource);
    setTouchDragOverWeekday((current) => (current === weekdayKey ? current : weekdayKey));
    event.preventDefault();
  };

  const handlePointerDragEnd = (event) => {
    if (!editMode || !dragSource) return;
    if (event.currentTarget.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const didActivateDrag = pointerDragActivatedRef.current;
    const sourceKey = dragSource;
    const sourceHeight = pointerCardBoundsRef.current[sourceKey]?.height || 0;
    const draggedCenterY = pointerSourceTopRef.current + pointerDragOffsetYRef.current + sourceHeight / 2;
    const targetKey =
      touchDragOverWeekday ||
      getWeekdayFromPointerZone(draggedCenterY || pointerLastClientYRef.current, sourceKey) ||
      getWeekdayFromClientPoint(event.clientX, event.clientY, sourceKey);
    if (didActivateDrag && sourceKey && targetKey && sourceKey !== targetKey) {
      swapWeekdays(sourceKey, targetKey);
    }

    pointerDragActivatedRef.current = false;
    setIsPointerDragging(false);
    setPointerDragOffsetY(0);
    pointerDragOffsetYRef.current = 0;
    pointerDragStartYRef.current = 0;
    pointerLastClientYRef.current = 0;
    pointerCardTopsRef.current = {};
    pointerCardBoundsRef.current = {};
    pointerSourceTopRef.current = 0;
    setDragSource(null);
    setTouchDragOverWeekday(null);
    event.preventDefault();
  };

  const persistDraftSilently = useCallback(async ({ force = false, planOverride = null } = {}) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId || !editModeRef.current) {
      return;
    }
    if (!force && !draftTouchedRef.current) {
      return;
    }

    const planToPersist = normalizePlanModel(planOverride || draftPlanRef.current);

    if (autoSaveInFlightRef.current) {
      queuedAutoSaveRef.current = planToPersist;
      return;
    }

    autoSaveInFlightRef.current = true;
    setIsAutoSaving(true);
    setAutoSaveError('');
    try {
      await saveUserPlanDraft(activeUserId, planToPersist);
      setDraftTouched(false);
      setLastAutoSavedAt(Date.now());
    } catch {
      setAutoSaveError('Nao foi possivel salvar automaticamente. Toque em "Salvar rascunho".');
    } finally {
      autoSaveInFlightRef.current = false;
      setIsAutoSaving(false);

      const queuedPlan = queuedAutoSaveRef.current;
      queuedAutoSaveRef.current = null;
      if (queuedPlan) {
        void persistDraftSilently({ force: true, planOverride: queuedPlan });
      }
    }
  }, []);

  const requestImmediateAutoSave = useCallback(() => {
    window.setTimeout(() => {
      void persistDraftSilently({ force: true });
    }, 0);
  }, [persistDraftSilently]);

  useEffect(() => {
    if (!editMode || !draftTouched) return;
    const timer = window.setTimeout(() => {
      void persistDraftSilently();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [draftPlan, draftTouched, editMode, persistDraftSilently]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        void persistDraftSilently();
      }
    };

    const handlePageHide = () => {
      void persistDraftSilently();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      void persistDraftSilently();
    };
  }, [persistDraftSilently]);

  const updateGeneralField = (field, value) => {
    updateDraft((next) => {
      next.general[field] = value;
    });
  };

  const updateNestedGeneralField = (group, field, value) => {
    updateDraft((next) => {
      next.general[group] = next.general[group] || {};
      next.general[group][field] = value;
    });
  };

  const handleEditorFieldBlur = () => {
    if (!editMode) return;
    requestImmediateAutoSave();
  };

  const updateExpandedSessionField = (field, value) => {
    if (!expandedCard?.workoutId) return;
    updateDraft((next) => {
      next.schedule[expandedCard.workoutId][field] = value;
    });
  };

  const updateExerciseField = (index, field, value) => {
    if (!expandedCard?.workoutId) return;
    updateDraft((next) => {
      const exercises = next.schedule[expandedCard.workoutId]?.exercises || [];
      if (!exercises[index]) return;
      exercises[index][field] = value;
      if (field === 'type' && value === 'cardio') exercises[index].sets = '';
      if (field === 'type' && value === 'strength') exercises[index].target = '';
    });
  };

  const moveExercise = (index, direction) => {
    if (!expandedCard?.workoutId) return;
    updateDraft((next) => {
      const exercises = next.schedule[expandedCard.workoutId]?.exercises || [];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= exercises.length) return;
      const [item] = exercises.splice(index, 1);
      exercises.splice(targetIndex, 0, item);
    });
    requestImmediateAutoSave();
  };

  const addExercise = () => {
    if (!expandedCard?.workoutId) return;
    updateDraft((next) => {
      const session = next.schedule[expandedCard.workoutId];
      const index = session.exercises.length;
      session.exercises.push(normalizeExercise({ id: `custom_${Date.now()}`, sets: '3x8-12' }, index));
    });
    requestImmediateAutoSave();
  };

  const removeExercise = (index) => {
    if (!expandedCard?.workoutId) return;
    updateDraft((next) => {
      const session = next.schedule[expandedCard.workoutId];
      session.exercises.splice(index, 1);
    });
    requestImmediateAutoSave();
  };

  const setRestDay = (weekdayKey) => {
    updateDraft((next) => {
      next.weekOrder[weekdayKey] = null;
    });
    requestImmediateAutoSave();
    animateDays([weekdayKey], 360);
    setFeedback(`${WEEKDAY_TITLES[weekdayKey]} definido como descanso.`);
  };

  const assignSessionToDay = (weekdayKey, sessionId) => {
    if (!SESSION_IDS.includes(sessionId)) return;
    let swappedFrom = null;
    let swappedTo = null;
    updateDraft((next) => {
      const currentOwnerKey = WEEK_ORDER_KEYS.find((key) => next.weekOrder[key] === sessionId) || null;
      const targetCurrentSession = next.weekOrder[weekdayKey] || null;

      if (currentOwnerKey && currentOwnerKey !== weekdayKey) {
        next.weekOrder[currentOwnerKey] = targetCurrentSession;
        swappedFrom = currentOwnerKey;
        swappedTo = targetCurrentSession;
      }

      next.weekOrder[weekdayKey] = sessionId;
    });
    requestImmediateAutoSave();
    if (swappedFrom) {
      const swappedLabel = swappedTo ? ` e ${swappedTo} foi para ${WEEKDAY_TITLES[swappedFrom]}` : '';
      animateDays([weekdayKey, swappedFrom], 420);
      setFeedback(`Treino ${sessionId} atribuído para ${WEEKDAY_TITLES[weekdayKey]}${swappedLabel}.`);
      return;
    }
    setFeedback(`Treino ${sessionId} atribuído para ${WEEKDAY_TITLES[weekdayKey]}.`);
  };

  const swapWeekdays = (sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    updateDraft((next) => {
      const from = next.weekOrder[sourceKey] || null;
      const to = next.weekOrder[targetKey] || null;
      next.weekOrder[sourceKey] = to;
      next.weekOrder[targetKey] = from;
    });
    requestImmediateAutoSave();
    animateDays([sourceKey, targetKey], 420);
    setFeedback(`Dias ${WEEKDAY_TITLES[sourceKey]} e ${WEEKDAY_TITLES[targetKey]} trocados.`);
  };

  const handleSaveDraft = async () => {
    if (!userId || !draftPlan) return;
    setIsBusy(true);
    setFeedback('');
    try {
      const saved = await saveUserPlanDraft(userId, draftPlan);
      setDraftPlan(normalizePlanModel(saved));
      setDraftTouched(false);
      setAutoSaveError('');
      setLastAutoSavedAt(Date.now());
      setFeedback('Rascunho salvo com sucesso.');
    } catch (error) {
      setFeedback(error.message || 'Não foi possível salvar o rascunho.');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!userId || !draftPlan) return;
    setIsBusy(true);
    setFeedback('');
    try {
      await saveUserPlanDraft(userId, draftPlan);
      const published = await publishUserPlanDraft(userId);
      const normalized = normalizePlanModel(published);
      setDraftPlan(normalized);
      setDraftTouched(false);
      setAutoSaveError('');
      setLastAutoSavedAt(Date.now());
      onPlanUpdated?.(normalized);
      setEditMode(false);
      setFeedback('Plano publicado com sucesso.');
    } catch (error) {
      setFeedback(error.message || 'Não foi possível publicar o plano.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0A3CFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
            <Sparkles size={12} />
            {planBadge}
          </span>
          <button
            onClick={() =>
              setEditMode((value) => {
                const nextValue = !value;
                if (value) {
                  void persistDraftSilently({ force: true });
                }
                if (nextValue) {
                  setExpandedWeekday(null);
                }
                return nextValue;
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-4 text-[13px] font-semibold text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200"
          >
            <Pencil size={15} />
            {editMode ? 'Fechar editor' : 'Editar plano'}
          </button>
        </div>
        <h2 className="mt-3 text-[32px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">Plano Hibrido</h2>
        <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-gray-500 dark:text-gray-400">
          Conteudo estruturado a partir de {sourceLabel}, com edicao completa por card de dia.
        </p>
      </header>

      <section className="mb-4 rounded-[28px] border border-black/[0.05] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Dados gerais</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <GeneralCard icon={<Dumbbell size={18} />} label="Foco" value={activePlan.general.focus} />
          <GeneralCard icon={<Flame size={18} />} label="TDEE base" value={`${activePlan.general.tdee} kcal`} />
          <GeneralCard
            icon={<Droplets size={18} />}
            label="Água base"
            value={`${activePlan.general.waterLiters.toFixed(1)} L`}
          />
          <GeneralCard icon={<Activity size={18} />} label="Meta semanal" value={`${activePlan.general.sessionsPerWeekTarget} sessões`} />
        </div>

        {editMode && (
          <div className="mt-4 rounded-2xl bg-[#F7F9FD] p-3 dark:bg-white/[0.05]">
            <div className="grid grid-cols-2 gap-2">
              <InputField
                label="Foco"
                value={activePlan.general.focus}
                onChange={(value) => updateGeneralField('focus', value)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="TDEE"
                value={activePlan.general.tdee}
                type="number"
                onChange={(value) => updateGeneralField('tdee', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Calorias min"
                value={activePlan.general.calorieTarget.min}
                type="number"
                onChange={(value) => updateNestedGeneralField('calorieTarget', 'min', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Calorias max"
                value={activePlan.general.calorieTarget.max}
                type="number"
                onChange={(value) => updateNestedGeneralField('calorieTarget', 'max', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Água base (L)"
                value={activePlan.general.waterLiters}
                type="number"
                step="0.1"
                onChange={(value) => updateGeneralField('waterLiters', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Água rec min"
                value={activePlan.general.waterRecommendedLiters.min}
                type="number"
                step="0.1"
                onChange={(value) => updateNestedGeneralField('waterRecommendedLiters', 'min', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Água rec max"
                value={activePlan.general.waterRecommendedLiters.max}
                type="number"
                step="0.1"
                onChange={(value) => updateNestedGeneralField('waterRecommendedLiters', 'max', Number(value) || 0)}
                onBlur={handleEditorFieldBlur}
              />
              <InputField
                label="Meta de sessões"
                value={activePlan.general.sessionsPerWeekTarget}
                type="number"
                onChange={(value) => updateGeneralField('sessionsPerWeekTarget', Math.max(0, Number(value) || 0))}
                onBlur={handleEditorFieldBlur}
              />
            </div>
          </div>
        )}
      </section>

      <section className="mb-4 rounded-[28px] border border-black/[0.05] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            Agenda semanal
          </p>
          <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">{assignedCount} dias com treino</p>
        </div>

        <div className="space-y-2">
          {cards.map((card) => {
            const isExpanded = expandedWeekday === card.weekdayKey;
            const exerciseCount = card.session?.exercises?.length || 0;
            const isDragActive = dragSource === card.weekdayKey;
            return (
              <div
                key={card.weekdayKey}
                data-weekday-key={card.weekdayKey}
                ref={(element) => {
                  if (element) {
                    cardRefs.current[card.weekdayKey] = element;
                  } else {
                    delete cardRefs.current[card.weekdayKey];
                  }
                }}
                style={
                  isPointerDragging && dragSource === card.weekdayKey
                    ? {
                        transform: `translateY(${pointerDragOffsetY}px) scale(1.015)`,
                        transition: 'transform 90ms linear',
                        position: 'relative',
                        zIndex: 30,
                        boxShadow: '0 16px 36px rgba(10,60,255,0.22)',
                      }
                    : isPointerDragging &&
                        touchDragOverWeekday === card.weekdayKey &&
                        dragSource &&
                        dragSource !== card.weekdayKey &&
                        pointerCardTopsRef.current[card.weekdayKey] !== undefined
                      ? {
                          transform: `translateY(${pointerSourceTopRef.current - pointerCardTopsRef.current[card.weekdayKey]}px)`,
                          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }
                      : undefined
                }
                className={`rounded-2xl border px-3 py-3 transition-all ${
                  isExpanded
                    ? 'border-[#0A3CFF]/35 bg-[#F4F7FF] dark:border-[#0A3CFF]/45 dark:bg-[#0A3CFF]/20'
                    : 'border-black/[0.06] bg-[#F7F9FD] dark:border-white/[0.08] dark:bg-white/[0.04]'
                } ${isDragActive ? 'opacity-70' : ''} ${
                  touchDragOverWeekday === card.weekdayKey && dragSource && dragSource !== card.weekdayKey
                    ? 'ring-2 ring-[#0A3CFF]/45'
                    : ''
                } ${
                  animatedWeekdays.includes(card.weekdayKey)
                    ? 'ring-2 ring-[#0A3CFF]/35 shadow-[0_10px_24px_rgba(10,60,255,0.14)]'
                    : ''
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editMode && (
                      <button
                        type="button"
                        aria-label={`Arrastar treino de ${card.weekdayLabel}`}
                        onClick={(event) => event.preventDefault()}
                        onPointerDown={(event) => handlePointerDragStart(card.weekdayKey, event)}
                        onPointerMove={handlePointerDragMove}
                        onPointerUp={handlePointerDragEnd}
                        onPointerCancel={handlePointerDragEnd}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 active:bg-[#0A3CFF]/10"
                        style={{ touchAction: 'none' }}
                      >
                        <GripVertical size={14} className="text-gray-400" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedWeekday((current) => (current === card.weekdayKey ? null : card.weekdayKey))}
                      className="text-left"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{card.weekdayLabel}</p>
                      <p className="mt-1 text-[16px] font-bold text-gray-950 dark:text-white">
                        {card.isRest ? 'Descanso' : `${card.workoutId} - ${card.session?.name || 'Treino'}`}
                      </p>
                    </button>
                  </div>
                  <span className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">
                    {card.isRest ? 'OFF' : `${exerciseCount} itens`}
                  </span>
                </div>

                {editMode && isExpanded && (
                  <div className="mt-3 space-y-3">
                    {card.isRest ? (
                      <div className="rounded-xl bg-white p-3 dark:bg-white/[0.06]">
                        <p className="text-[12px] text-gray-600 dark:text-gray-300">Dia sem treino. Escolha uma sessão para ativar:</p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {SESSION_IDS.map((sessionId) => (
                            <button
                              key={sessionId}
                              onClick={() => assignSessionToDay(card.weekdayKey, sessionId)}
                              className="h-9 rounded-lg bg-[#0A3CFF] text-[12px] font-semibold text-white"
                            >
                              Sessão {sessionId}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <InputField
                            label="Nome do treino"
                            value={card.session?.name || ''}
                            onChange={(value) => updateExpandedSessionField('name', value)}
                            onBlur={handleEditorFieldBlur}
                          />
                          <InputField
                            label="Tipo"
                            value={card.session?.type || ''}
                            onChange={(value) => updateExpandedSessionField('type', value)}
                            onBlur={handleEditorFieldBlur}
                          />
                        </div>

                        <textarea
                          value={card.session?.summary || ''}
                          onChange={(event) => updateExpandedSessionField('summary', event.target.value)}
                          onBlur={handleEditorFieldBlur}
                          className="min-h-[68px] w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-[13px] text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300"
                          placeholder="Resumo do treino"
                        />

                        <button
                          onClick={() => setRestDay(card.weekdayKey)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 text-[12px] font-semibold text-rose-600 dark:border-rose-400/40 dark:bg-rose-950/20 dark:text-rose-300"
                        >
                          <Trash2 size={13} />
                          Excluir dia (descanso)
                        </button>

                        <div className="space-y-2">
                          {(card.session?.exercises || []).map((exercise, index) => (
                            <div key={`${exercise.id}_${index}`} className="rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.06]">
                              <div className="grid grid-cols-2 gap-2">
                                <InputField
                                  label="Exercício"
                                  value={exercise.name || ''}
                                  onChange={(value) => updateExerciseField(index, 'name', value)}
                                  onBlur={handleEditorFieldBlur}
                                />
                                <SelectField
                                  label="Categoria"
                                  value={exercise.type || 'strength'}
                                  onChange={(value) => updateExerciseField(index, 'type', value)}
                                  onBlur={handleEditorFieldBlur}
                                  options={[
                                    { value: 'strength', label: 'Força' },
                                    { value: 'cardio', label: 'Cardio' },
                                  ]}
                                />
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <InputField
                                  label={exercise.type === 'cardio' ? 'Target' : 'Series/reps'}
                                  value={exercise.type === 'cardio' ? exercise.target || '' : exercise.sets || ''}
                                  onChange={(value) =>
                                    updateExerciseField(index, exercise.type === 'cardio' ? 'target' : 'sets', value)
                                  }
                                  onBlur={handleEditorFieldBlur}
                                />
                                <InputField
                                  label="Nota"
                                  value={exercise.note || ''}
                                  onChange={(value) => updateExerciseField(index, 'note', value)}
                                  onBlur={handleEditorFieldBlur}
                                />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => moveExercise(index, 'up')}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-white/[0.06]"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  onClick={() => moveExercise(index, 'down')}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-white/[0.06]"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  onClick={() => removeExercise(index)}
                                  className="h-8 rounded-lg border border-rose-300 bg-rose-50 px-2 text-[12px] font-semibold text-rose-600 dark:border-rose-400/40 dark:bg-rose-950/20 dark:text-rose-300"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={addExercise}
                          className="h-9 rounded-xl border border-dashed border-black/[0.2] px-3 text-[12px] font-semibold text-gray-700 dark:border-white/[0.2] dark:text-gray-200"
                        >
                          + Adicionar exercício
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editMode && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white text-[13px] font-semibold text-gray-700 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-200"
            >
              <Save size={14} />
              Salvar rascunho
            </button>
            <button
              onClick={handlePublishDraft}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0A3CFF] text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(10,60,255,0.22)] disabled:opacity-50"
            >
              <RefreshCcw size={14} />
              Publicar
            </button>
          </div>
        )}

        {feedback && <p className="mt-3 text-[13px] text-gray-600 dark:text-gray-300">{feedback}</p>}
        {editMode && (
          <p
            className={`mt-2 text-[12px] ${
              autoSaveError ? 'text-rose-600 dark:text-rose-300' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {autoSaveError
              ? autoSaveError
              : isAutoSaving
                ? 'Salvando automaticamente...'
                : lastAutoSavedAt
                  ? `Rascunho salvo automaticamente às ${new Date(lastAutoSavedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Autosave ativo durante a edição.'}
          </p>
        )}
      </section>
    </div>
  );
}

function GeneralCard({ icon, label, value }) {
  return (
    <div className="rounded-[20px] bg-[#F7F9FD] px-4 py-3 dark:bg-white/[0.04]">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
        {icon}
      </div>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-[17px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function InputField({ label, value, onChange, onBlur, type = 'text', step }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, onBlur, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[13px] text-gray-800 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
