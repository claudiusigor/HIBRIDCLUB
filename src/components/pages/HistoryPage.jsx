import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  getLastStorageError,
  getNormalizedWorkoutEntry,
  getWorkoutHistory,
  getWorkoutSessions,
  hasWorkoutSessions,
} from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';
import { getCurrentBadges, RANKING_SCORING } from '../../domain/ranking';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const BADGE_LABELS = {
  consistency_10: 'Constância',
  hybrid_complete: 'Híbrido',
  streak_7: 'Sequência',
  top_10: 'Top 10',
  podium: 'Pódio',
  champion: 'Campeão',
};

const BADGE_ICONS = {
  consistency_10: BadgeCheck,
  hybrid_complete: Dumbbell,
  streak_7: Flame,
  top_10: Award,
  podium: Trophy,
  champion: Trophy,
};

const formatValue = (value, unit) => `${value}${unit ? ` ${unit}` : ''}`;

const formatPoints = (value) => new Intl.NumberFormat('pt-BR').format(Number(value) || 0);

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAdjacentDateKey = (date, offset) => {
  const adjacentDate = new Date(date);
  adjacentDate.setDate(adjacentDate.getDate() + offset);
  return toDateKey(adjacentDate);
};

const getMonthPrefix = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const isValidDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const isSameMonth = (dateA, dateB) =>
  dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();

const buildCalendarCells = (visibleMonth) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const leadingEmptyDays = firstDay.getDay();

  const cells = [];

  for (let i = 0; i < leadingEmptyDays; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const getActiveStreak = (trainedDateKeys) => {
  const trainedSet = new Set(trainedDateKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!trainedSet.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (trainedSet.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const buildMonthSummary = (history, visibleMonth, workoutDateKeys) => {
  const monthPrefix = getMonthPrefix(visibleMonth);
  const monthWorkoutKeys = workoutDateKeys.filter((dateKey) => dateKey.startsWith(monthPrefix));
  const workoutIds = new Set();

  monthWorkoutKeys.forEach((dateKey) => {
    getWorkoutSessions(history[dateKey]).forEach((session) => {
      if (session?.workoutId) workoutIds.add(session.workoutId);
    });
  });

  const monthDays = monthWorkoutKeys.length;
  const workoutVariety = workoutIds.size;
  const streak = getActiveStreak(workoutDateKeys);
  const points =
    monthDays * RANKING_SCORING.trainingDay
    + streak * RANKING_SCORING.activeStreakDay
    + workoutVariety * RANKING_SCORING.workoutVariety;
  const badges = getCurrentBadges({
    month_days: monthDays,
    streak,
    workout_variety: workoutVariety,
  });

  return {
    monthWorkoutKeys,
    monthDays,
    workoutVariety,
    streak,
    points,
    badges,
  };
};

export default function HistoryPage({ plan = workoutPlan, onOpenRanking }) {
  const [history, setHistory] = useState({});
  const [storageError, setStorageError] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      const nextHistory = await getWorkoutHistory();
      if (isMounted) {
        setHistory(nextHistory);
        setStorageError(getLastStorageError());
      }
    };

    loadHistory();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadHistory();
      }
    };

    const handleFocus = () => {
      void loadHistory();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const workoutDateKeys = useMemo(
    () =>
      Object.keys(history)
        .filter((dateKey) => isValidDateKey(dateKey) && hasWorkoutSessions(history[dateKey]))
        .sort(),
    [history]
  );

  const workoutDateSet = useMemo(() => new Set(workoutDateKeys), [workoutDateKeys]);

  const monthCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  const monthSummary = useMemo(
    () => buildMonthSummary(history, visibleMonth, workoutDateKeys),
    [history, visibleMonth, workoutDateKeys]
  );

  useEffect(() => {
    const selectedDate = new Date(`${selectedDateKey}T00:00:00`);
    if (isSameMonth(selectedDate, visibleMonth)) {
      return;
    }

    const today = new Date();
    if (isSameMonth(today, visibleMonth)) {
      setSelectedDateKey(toDateKey(today));
      return;
    }

    if (monthSummary.monthWorkoutKeys.length > 0) {
      setSelectedDateKey(monthSummary.monthWorkoutKeys[0]);
      return;
    }

    setSelectedDateKey(toDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)));
  }, [monthSummary.monthWorkoutKeys, selectedDateKey, visibleMonth]);

  const selectedLog = history[selectedDateKey];
  const selectedNutrition = {
    water: Number(selectedLog?.nutrition?.water) || 0,
    calories: Number(selectedLog?.nutrition?.calories) || 0,
  };
  const selectedSessions = getWorkoutSessions(selectedLog);
  const hasSelectedWorkout = selectedSessions.length > 0;
  const selectedExerciseCount = selectedSessions.reduce(
    (total, session) => total + Object.keys(session.exercises || {}).length,
    0
  );
  const selectedWorkoutIds = new Set(selectedSessions.map((session) => session.workoutId).filter(Boolean));
  const selectedWorkoutLabel = [...selectedWorkoutIds].join(' + ') || '-';
  const selectedDate = new Date(`${selectedDateKey}T00:00:00`);
  const selectedIsInVisibleMonth = isSameMonth(selectedDate, visibleMonth);
  const selectedImpactPoints = hasSelectedWorkout && selectedIsInVisibleMonth ? RANKING_SCORING.trainingDay : 0;
  const hasSelectedNutrition = selectedNutrition.water > 0 || selectedNutrition.calories > 0;

  return (
    <div className="hc-history-page">
      <header className="hc-history-hero">
        <div className="hc-history-hero__copy">
          <p className="hc-label text-[#0A3CFF] dark:text-[#8FB1FF]">Progresso mensal</p>
          <h2 className="hc-heading">Histórico</h2>
          <p>Revise seus treinos e acompanhe como sua consistência alimenta o ranking.</p>
        </div>
        <button
          type="button"
          onClick={onOpenRanking}
          className="hc-history-ranking-link"
          disabled={!onOpenRanking}
        >
          <Trophy size={15} aria-hidden="true" />
          Ver ranking
        </button>
      </header>

      {storageError && (
        <div className="mb-4 flex items-start gap-2 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-relaxed">Falha ao carregar parte do histórico agora. Tente atualizar em instantes.</p>
        </div>
      )}

      <section className="hc-history-summary" aria-label="Resumo mensal para o ranking">
        <div className="hc-history-score-card">
          <span className="hc-history-score-card__icon">
            <Sparkles size={17} aria-hidden="true" />
          </span>
          <div>
            <p>Pontos</p>
            <strong>{formatPoints(monthSummary.points)}</strong>
          </div>
        </div>

        <div className="hc-history-metrics">
          <div>
            <span>Dias</span>
            <strong>{monthSummary.monthDays}</strong>
          </div>
          <div className={monthSummary.streak >= 2 ? 'is-streak-active' : ''}>
            <span>Sequência</span>
            <strong>
              {monthSummary.streak >= 2 && <Flame size={14} aria-hidden="true" />}
              {monthSummary.streak}
            </strong>
          </div>
          <div>
            <span>Fichas</span>
            <strong>{monthSummary.workoutVariety}</strong>
          </div>
        </div>

        {monthSummary.streak >= 2 && (
          <div className="hc-history-streak-highlight" role="status">
            <span className="hc-history-streak-highlight__icon">
              <Flame size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{monthSummary.streak} dias seguidos</strong>
              <span>Sequência ativa no ranking</span>
            </div>
            <b>+{formatPoints(monthSummary.streak * RANKING_SCORING.activeStreakDay)} pts</b>
          </div>
        )}

        <div className="hc-history-badges" aria-label="Conquistas">
          {monthSummary.badges.length > 0 ? (
            monthSummary.badges.map((badge) => {
              const Icon = BADGE_ICONS[badge] || Award;
              return (
                <span key={badge}>
                  <Icon size={12} aria-hidden="true" />
                  {BADGE_LABELS[badge] || badge}
                </span>
              );
            })
          ) : (
            <span className="is-muted">Medalhas aparecem conforme sua rotina ganha volume.</span>
          )}
        </div>
      </section>

      <section className="hc-history-calendar">
        <div className="hc-history-section-head">
          <div>
            <p className="hc-label text-gray-500 dark:text-gray-400">Calendário</p>
            <h3 className="hc-heading">
              {visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <p>
              {monthSummary.monthDays > 0
                ? `${monthSummary.monthDays} dia${monthSummary.monthDays > 1 ? 's' : ''} com treino neste mês`
                : 'Nenhum treino salvo neste mês'}
            </p>
          </div>
          <div className="hc-history-month-actions">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="hc-history-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="hc-history-calendar-grid">
          {monthCells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="hc-history-calendar-empty" />;
            }

            const dateKey = toDateKey(date);
            const isSelected = selectedDateKey === dateKey;
            const hasWorkout = hasWorkoutSessions(history[dateKey]);
            const isToday = toDateKey(new Date()) === dateKey;
            const hasPreviousWorkout = hasWorkout && workoutDateSet.has(getAdjacentDateKey(date, -1));
            const hasNextWorkout = hasWorkout && workoutDateSet.has(getAdjacentDateKey(date, 1));
            const isStreakDay = hasPreviousWorkout || hasNextWorkout;
            const linksToNextDay = hasNextWorkout && date.getDay() !== 6;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={`hc-history-day ${isSelected ? 'is-selected' : ''} ${hasWorkout ? 'has-workout' : ''} ${isToday ? 'is-today' : ''} ${isStreakDay ? 'is-streak-day' : ''} ${linksToNextDay ? 'links-to-next-day' : ''}`}
                style={isStreakDay ? { '--hc-streak-delay': `${Math.min(index, 8) * 35}ms` } : undefined}
                aria-pressed={isSelected}
                aria-label={`${date.toLocaleDateString('pt-BR')}${hasWorkout ? ', treino concluído' : ''}${isStreakDay ? ', parte de uma sequência' : ''}`}
              >
                <span>{date.getDate()}</span>
                <small>{hasWorkout ? `+${RANKING_SCORING.trainingDay}` : ''}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section key={selectedDateKey} className="hc-history-detail">
        <div className="hc-history-detail__header">
          <div>
            <span className="hc-history-pill">Dia selecionado</span>
            <h3>
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
          </div>
          <div className="hc-history-day-score">
            <span>{selectedImpactPoints > 0 ? `+${selectedImpactPoints}` : '0'}</span>
            <small>pts</small>
          </div>
        </div>

        <div className="hc-history-detail-stats">
          <div>
            <span>Treino</span>
            <strong>{hasSelectedWorkout ? 'Concluído' : 'Sem registro'}</strong>
          </div>
          <div>
            <span>Exercícios</span>
            <strong>{selectedExerciseCount}</strong>
          </div>
          <div>
            <span>Ficha</span>
            <strong>{selectedWorkoutLabel}</strong>
          </div>
        </div>

        <div className="hc-history-nutrition">
          <div>
            <span>Água</span>
            <strong>{selectedNutrition.water} ml</strong>
          </div>
          <div>
            <span>Calorias</span>
            <strong>{selectedNutrition.calories} kcal</strong>
          </div>
        </div>

        {!hasSelectedWorkout && (
          <div className="hc-history-empty">
            <p>Nenhum treino salvo neste dia.</p>
            <span>
              {hasSelectedNutrition
                ? 'Há registro de nutrição nesta data, mas sem treino salvo.'
                : 'Toque em outro dia marcado para ver os detalhes do treino.'}
            </span>
          </div>
        )}

        {hasSelectedWorkout && (
          <div className="hc-history-session-list">
            {selectedSessions.map((session) => {
              const selectedPlan = plan.schedule[session.workoutId];
              const sessionTitle = selectedPlan ? selectedPlan.name : `Treino ${session.workoutId}`;
              const sessionType = selectedPlan ? selectedPlan.type : 'Treino salvo';
              const exerciseIds = Object.keys(session.exercises || {});

              return (
                <article key={`${selectedDateKey}-${session.workoutId}`} className="hc-history-session-card">
                  <div className="hc-history-session-card__header">
                    <div>
                      <span>{selectedPlan ? `${selectedPlan.id} - ${selectedPlan.day}` : session.workoutId}</span>
                      <h4>{sessionTitle}</h4>
                      <p>{sessionType}</p>
                    </div>
                    <strong>{exerciseIds.length} itens</strong>
                  </div>

                  <div className="hc-history-exercise-list">
                    {exerciseIds.map((exerciseId) => {
                      const exerciseMeta = selectedPlan?.exercises?.find((exercise) => exercise.id === exerciseId);
                      const normalized = getNormalizedWorkoutEntry(session.exercises[exerciseId], exerciseMeta);
                      if (!normalized) return null;

                      return (
                        <div key={exerciseId} className="hc-history-exercise-row">
                          <div>
                            <p>{exerciseMeta ? exerciseMeta.name : exerciseId}</p>
                            <span>{normalized.kind === 'cardio' ? 'Cardio registrado' : 'Força registrada'}</span>
                          </div>
                          <div>
                            <strong>{formatValue(normalized.primary, normalized.primaryUnit)}</strong>
                            <span>{formatValue(normalized.secondary, normalized.secondaryUnit)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
