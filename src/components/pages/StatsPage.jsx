import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarRange,
  Check,
  ChevronRight,
  Footprints,
  Gauge,
  MapPinned,
  Route,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  getLastStorageError,
  getNormalizedWorkoutEntry,
  getWorkoutHistory,
  getWorkoutSessions,
} from '../../services/storage';
import { DEFAULT_WEEK_ORDER } from '../../services/plans';
import { workoutPlan } from '../../data/workoutPlan';

const WEEKDAYS = [
  { key: 'SEG', short: 'SEG', label: 'Segunda', index: 0 },
  { key: 'TER', short: 'TER', label: 'Terça', index: 1 },
  { key: 'QUA', short: 'QUA', label: 'Quarta', index: 2 },
  { key: 'QUI', short: 'QUI', label: 'Quinta', index: 3 },
  { key: 'SEX', short: 'SEX', label: 'Sexta', index: 4 },
  { key: 'SAB', short: 'SÁB', label: 'Sábado', index: 5 },
  { key: 'DOM', short: 'DOM', label: 'Domingo', index: 6 },
];

const EMPTY_SUMMARY = {
  runs: [],
  recentRuns: [],
  monthRuns: 0,
  monthRunDays: 0,
  totalDistance: 0,
  totalDuration: 0,
  averagePace: 0,
  longestRun: null,
  paceSeries: [],
  distanceSeries: [],
  completedKeys: new Set(),
};

const RUNNING_PATTERN = /(corrida|run|trote|tiros?|esteira|long[aã]o|ritmo)/i;
const NON_RUNNING_PATTERN = /(bike|bicicleta|remo|el[ií]ptico|mobilidade|alongamento|respira[cç][aã]o)/i;

const isRunningExercise = (exercise) => {
  const exerciseName = exercise?.name || '';
  return !NON_RUNNING_PATTERN.test(exerciseName) && RUNNING_PATTERN.test(exerciseName);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const formatDistance = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const formatDuration = (minutes) => {
  const rounded = Math.max(0, Math.round(Number(minutes) || 0));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const remainder = `${rounded % 60}`.padStart(2, '0');
  return `${hours}h ${remainder}min`;
};

const formatPace = (pace) => {
  if (!Number.isFinite(pace) || pace <= 0) return '--';
  const totalSeconds = Math.round(pace * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const formatRunDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

function buildRunningPlan(plan, today = new Date()) {
  const weekOrder = { ...DEFAULT_WEEK_ORDER, ...(plan.weekOrder || {}) };
  const weekStart = startOfWeek(today);
  const todayIndex = (today.getDay() + 6) % 7;

  return WEEKDAYS.flatMap((weekday) => {
    const workoutId = weekOrder[weekday.key];
    const workout = workoutId ? plan.schedule?.[workoutId] : null;
    if (!workout) return [];

    const date = addDays(weekStart, weekday.index);
    const runningExercises = (workout.exercises || [])
      .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
      .filter(({ exercise }) => exercise.type === 'cardio' && isRunningExercise(exercise));

    if (runningExercises.length === 0) return [];
    const mainBlock = runningExercises[0];

    return [{
      id: `${weekday.key}-${workoutId}`,
      weekdayKey: weekday.key,
      weekdayIndex: weekday.index,
      dayLabel: weekday.label,
      dayShort: weekday.short,
      date,
      dateKey: toDateKey(date),
      workoutId,
      workoutName: workout.name,
      exerciseId: mainBlock.exercise.id,
      exerciseIds: runningExercises.map(({ exercise }) => exercise.id),
      exerciseIndex: mainBlock.exerciseIndex,
      name: /^cardio$/i.test(workout.type || '') ? workout.name : mainBlock.exercise.name,
      target: mainBlock.exercise.target || 'Sessão de corrida',
      note: mainBlock.exercise.note || workout.summary || '',
      isToday: weekday.index === todayIndex,
      isPast: weekday.index < todayIndex,
      daysAhead: (weekday.index - todayIndex + 7) % 7,
    }];
  });
}

function buildRunningSummary(history, plan, today = new Date()) {
  const runs = [];

  Object.keys(history || {})
    .sort()
    .forEach((dateKey) => {
      getWorkoutSessions(history[dateKey]).forEach((session, sessionIndex) => {
        const workout = plan.schedule?.[session.workoutId];
        const runningEntries = Object.entries(session.exercises || {}).flatMap(([exerciseId, entry]) => {
          const exercise = workout?.exercises?.find((item) => item.id === exerciseId);
          const normalized = getNormalizedWorkoutEntry(entry, exercise);
          if (normalized?.kind !== 'cardio' || !isRunningExercise(exercise)) return [];

          const durationMinutes = Math.max(0, Number(normalized.primary) || 0);
          const distanceKm = Math.max(0, Number(normalized.secondary) || 0);
          if (durationMinutes <= 0 && distanceKm <= 0) return [];

          return [{
            exerciseId,
            exerciseName: exercise?.name || 'Corrida registrada',
            durationMinutes,
            distanceKm,
            updatedAt: normalized.timestamp || session.updatedAt || 0,
          }];
        });

        if (runningEntries.length === 0) return;
        const durationMinutes = runningEntries.reduce((total, entry) => total + entry.durationMinutes, 0);
        const distanceKm = runningEntries.reduce((total, entry) => total + entry.distanceKm, 0);

        runs.push({
          id: `${dateKey}-${session.workoutId}-${sessionIndex}`,
          dateKey,
          workoutId: session.workoutId,
          workoutName: workout?.name || `Treino ${session.workoutId}`,
          exerciseIds: runningEntries.map((entry) => entry.exerciseId),
          name: workout?.name || runningEntries[0].exerciseName,
          durationMinutes,
          distanceKm,
          pace: durationMinutes > 0 && distanceKm > 0 ? durationMinutes / distanceKm : 0,
          updatedAt: Math.max(...runningEntries.map((entry) => entry.updatedAt)),
        });
      });
    });

  runs.sort((a, b) => {
    if (a.dateKey === b.dateKey) return b.updatedAt - a.updatedAt;
    return b.dateKey.localeCompare(a.dateKey);
  });

  const monthPrefix = toDateKey(today).slice(0, 7);
  const currentMonthRuns = runs.filter((run) => run.dateKey.startsWith(monthPrefix));
  const totalDistance = currentMonthRuns.reduce((total, run) => total + run.distanceKm, 0);
  const totalDuration = currentMonthRuns.reduce((total, run) => total + run.durationMinutes, 0);
  const pacedRuns = currentMonthRuns.filter((run) => run.durationMinutes > 0 && run.distanceKm > 0);
  const pacedDistance = pacedRuns.reduce((total, run) => total + run.distanceKm, 0);
  const pacedDuration = pacedRuns.reduce((total, run) => total + run.durationMinutes, 0);
  const longestRun = runs
    .filter((run) => run.distanceKm > 0)
    .slice()
    .sort((a, b) => b.distanceKm - a.distanceKm)[0] || null;

  const currentWeekStart = startOfWeek(today);
  const distanceSeries = Array.from({ length: 5 }, (_, index) => {
    const weekStart = addDays(currentWeekStart, (index - 4) * 7);
    const nextWeekStart = addDays(weekStart, 7);
    const startKey = toDateKey(weekStart);
    const endKey = toDateKey(nextWeekStart);
    const weekRuns = runs.filter((run) => run.dateKey >= startKey && run.dateKey < endKey);

    return {
      label: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: weekRuns.reduce((total, run) => total + run.distanceKm, 0),
      runs: weekRuns.length,
    };
  });

  const paceSeries = runs
    .filter((run) => run.pace > 0)
    .slice(0, 6)
    .reverse()
    .map((run) => ({
      label: formatRunDate(run.dateKey).replace('.', ''),
      value: run.pace,
      runs: 1,
    }));

  return {
    runs,
    recentRuns: runs.slice(0, 6),
    monthRuns: currentMonthRuns.length,
    monthRunDays: new Set(currentMonthRuns.map((run) => run.dateKey)).size,
    totalDistance,
    totalDuration,
    averagePace: pacedDistance > 0 ? pacedDuration / pacedDistance : 0,
    longestRun,
    paceSeries,
    distanceSeries,
    completedKeys: new Set(runs.flatMap((run) =>
      run.exerciseIds.map((exerciseId) => `${run.dateKey}:${run.workoutId}:${exerciseId}`))),
  };
}

function getUpcomingRun(runningPlan) {
  return runningPlan
    .slice()
    .sort((a, b) => a.daysAhead - b.daysAhead || a.exerciseIndex - b.exerciseIndex)[0] || null;
}

function getPlanTiming(run) {
  if (!run) return '';
  if (run.daysAhead === 0) return 'Hoje';
  if (run.daysAhead === 1) return 'Amanhã';
  return run.dayLabel;
}

export default function StatsPage({ plan = workoutPlan, onOpenWorkout }) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [storageError, setStorageError] = useState(null);
  const [chartMode, setChartMode] = useState('distance');
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadRunningData = async () => {
      const history = await getWorkoutHistory();
      if (!mounted) return;
      setSummary(buildRunningSummary(history, plan));
      setStorageError(getLastStorageError());
    };

    void loadRunningData();
    const refresh = () => { if (!document.hidden) void loadRunningData(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      mounted = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [plan]);

  const runningPlan = useMemo(() => buildRunningPlan(plan), [plan]);
  const upcomingRun = useMemo(() => getUpcomingRun(runningPlan), [runningPlan]);
  const selectedRun = runningPlan.find((run) => run.id === selectedPlanId) || upcomingRun || runningPlan[0] || null;
  const isUpcomingSelected = selectedRun?.id === upcomingRun?.id;
  const chartSeries = chartMode === 'pace' ? summary.paceSeries : summary.distanceSeries;
  const chartHasData = chartSeries.some((point) => point.value > 0);

  return (
    <div className="hc-run-page">
      {storageError && (
        <div className="hc-run-alert" role="status">
          A sincronização da corrida está temporariamente indisponível. Os dados exibidos podem estar incompletos.
        </div>
      )}

      <header className="hc-run-header">
        <div>
          <p className="hc-run-kicker">Corrida</p>
          <h2>Ritmo para ir mais longe</h2>
        </div>
        <div className="hc-run-month-mark" aria-label={`${summary.monthRuns} corridas neste mês`}>
          <Footprints size={16} aria-hidden="true" />
          <span>{summary.monthRuns}</span>
          <small>no mês</small>
        </div>
      </header>

      <section className="hc-run-focus" aria-labelledby="next-run-title">
        <div className="hc-run-focus__copy">
          <div className="hc-run-focus__meta">
            <span>{isUpcomingSelected ? 'Próximo bloco' : 'Treino selecionado'}</span>
            <b>{selectedRun ? getPlanTiming(selectedRun) : 'Plano vazio'}</b>
          </div>
          <h3 id="next-run-title">{selectedRun?.name || 'Adicione uma corrida ao plano'}</h3>
          <p>{selectedRun?.target || 'Defina minutos ou distância para preparar seu próximo bloco.'}</p>
          {selectedRun && (
            <div className="hc-run-focus__context">
              <CalendarRange size={14} aria-hidden="true" />
              <span>{selectedRun.dayLabel} · Treino {selectedRun.workoutId}</span>
            </div>
          )}
        </div>

        <RunRouteGraphic />

        {selectedRun && (
          <button
            type="button"
            className="hc-run-focus__action"
            onClick={() => onOpenWorkout?.(selectedRun.weekdayKey)}
          >
            Abrir treino <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}

        <div className="hc-run-metrics" aria-label="Resumo de corrida do mês">
          <RunMetric label="Distância" value={formatDistance(summary.totalDistance)} unit="km" />
          <RunMetric label="Tempo" value={formatDuration(summary.totalDuration).replace(' min', '')} unit={summary.totalDuration >= 60 ? '' : 'min'} />
          <RunMetric label="Ritmo médio" value={formatPace(summary.averagePace)} unit={summary.averagePace ? '/km' : ''} />
        </div>
      </section>

      <section className="hc-run-section" aria-labelledby="run-evolution-title">
        <div className="hc-run-section__heading">
          <div>
            <h3 id="run-evolution-title">Evolução</h3>
            <p>{chartMode === 'distance' ? 'Quilômetros por semana' : 'Pace das últimas corridas'}</p>
          </div>
          <div className="hc-run-segmented" aria-label="Métrica do gráfico">
            <button type="button" aria-pressed={chartMode === 'distance'} onClick={() => setChartMode('distance')}>Distância</button>
            <button type="button" aria-pressed={chartMode === 'pace'} onClick={() => setChartMode('pace')}>Ritmo</button>
          </div>
        </div>

        <div className="hc-run-chart">
          <div className="hc-run-chart__summary">
            <div>
              <span>{chartMode === 'distance' ? 'Acumulado em julho' : 'Média em julho'}</span>
              <strong>
                {chartMode === 'distance' ? formatDistance(summary.totalDistance) : formatPace(summary.averagePace)}
                <small>{chartMode === 'distance' ? ' km' : summary.averagePace ? ' /km' : ''}</small>
              </strong>
            </div>
            {summary.longestRun && (
              <div className="hc-run-chart__record">
                <TrendingUp size={15} aria-hidden="true" />
                <span>Maior distância</span>
                <b>{formatDistance(summary.longestRun.distanceKm)} km</b>
              </div>
            )}
          </div>

          {chartHasData ? (
            <RunChart series={chartSeries} mode={chartMode} />
          ) : (
            <div className="hc-run-chart__empty">
              <Gauge size={22} aria-hidden="true" />
              <p>Registre minutos e quilômetros para formar sua curva de evolução.</p>
            </div>
          )}
        </div>
      </section>

      <section className="hc-run-section" aria-labelledby="run-week-title">
        <div className="hc-run-section__heading hc-run-section__heading--plain">
          <div>
            <h3 id="run-week-title">Semana de corrida</h3>
            <p>Seus blocos aeróbicos dentro do plano híbrido</p>
          </div>
          <Route size={20} aria-hidden="true" />
        </div>

        <div className="hc-run-weekline">
          {runningPlan.length > 0 ? runningPlan.map((run) => {
            const completed = run.exerciseIds.some((exerciseId) =>
              summary.completedKeys.has(`${run.dateKey}:${run.workoutId}:${exerciseId}`));
            const selected = run.id === selectedRun?.id;
            return (
              <button
                type="button"
                key={run.id}
                className="hc-run-weekline__row"
                data-selected={selected ? 'true' : 'false'}
                onClick={() => setSelectedPlanId(run.id)}
                aria-pressed={selected}
              >
                <span className="hc-run-weekline__day">{run.dayShort}</span>
                <span className="hc-run-weekline__marker" data-completed={completed ? 'true' : 'false'}>
                  {completed && <Check size={11} aria-hidden="true" />}
                </span>
                <span className="hc-run-weekline__copy">
                  <strong>{run.name}</strong>
                  <small>{run.target}</small>
                </span>
                <span className="hc-run-weekline__state">
                  {completed ? 'Feito' : run.isToday ? 'Hoje' : `Treino ${run.workoutId}`}
                  <ChevronRight size={15} aria-hidden="true" />
                </span>
              </button>
            );
          }) : (
            <div className="hc-run-weekline__empty">Nenhum bloco de corrida foi encontrado no plano atual.</div>
          )}
        </div>
      </section>

      <section className="hc-run-section" aria-labelledby="recent-runs-title">
        <div className="hc-run-section__heading hc-run-section__heading--plain">
          <div>
            <h3 id="recent-runs-title">Últimas corridas</h3>
            <p>{summary.monthRunDays} dia{summary.monthRunDays === 1 ? '' : 's'} com corrida neste mês</p>
          </div>
          <Timer size={20} aria-hidden="true" />
        </div>

        {summary.recentRuns.length > 0 ? (
          <div className="hc-run-history">
            {summary.recentRuns.map((run) => (
              <article key={run.id} className="hc-run-history__row">
                <div className="hc-run-history__icon"><MapPinned size={17} aria-hidden="true" /></div>
                <div className="hc-run-history__copy">
                  <strong>{run.name}</strong>
                  <span>{formatRunDate(run.dateKey)} · Treino {run.workoutId}</span>
                </div>
                <div className="hc-run-history__numbers">
                  <strong>{formatDistance(run.distanceKm)} km</strong>
                  <span>{formatDuration(run.durationMinutes)} · {formatPace(run.pace)}{run.pace ? '/km' : ''}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="hc-run-empty">
            <div className="hc-run-empty__icon"><Zap size={20} aria-hidden="true" /></div>
            <div>
              <strong>Sua primeira corrida começa no plano</strong>
              <p>Preencha minutos e quilômetros no treino para liberar ritmo, distância e evolução.</p>
            </div>
            {upcomingRun && (
              <button type="button" onClick={() => onOpenWorkout?.(upcomingRun.weekdayKey)}>
                Registrar corrida <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function RunMetric({ label, value, unit }) {
  return (
    <div className="hc-run-metric">
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
    </div>
  );
}

function RunRouteGraphic() {
  return (
    <svg className="hc-run-route" viewBox="0 0 150 132" role="img" aria-label="Traçado estilizado da próxima corrida">
      <path className="hc-run-route__lane" d="M18 111C30 91 19 70 42 60C63 50 63 26 89 21C111 17 126 29 132 47C140 70 119 81 108 99C99 114 105 122 119 126" />
      <path className="hc-run-route__progress" d="M18 111C30 91 19 70 42 60C63 50 63 26 89 21C111 17 126 29 132 47" />
      <circle className="hc-run-route__start" cx="18" cy="111" r="5" />
      <circle className="hc-run-route__current" cx="132" cy="47" r="6" />
      <circle className="hc-run-route__finish" cx="119" cy="126" r="4" />
    </svg>
  );
}

function RunChart({ series, mode }) {
  const width = 320;
  const height = 150;
  const horizontalPadding = 18;
  const topPadding = 20;
  const bottomPadding = 36;
  const values = series.map((point) => Number(point.value) || 0);
  const max = Math.max(...values, 1);
  const min = mode === 'pace' ? Math.min(...values.filter((value) => value > 0)) : 0;
  const range = Math.max(max - min, 0.1);
  const points = series.map((point, index) => {
    const x = horizontalPadding + (index * (width - horizontalPadding * 2)) / Math.max(series.length - 1, 1);
    const y = mode === 'pace'
      ? topPadding + ((point.value - min) / range) * (height - topPadding - bottomPadding)
      : height - bottomPadding - (point.value / max) * (height - topPadding - bottomPadding);
    return { ...point, x, y };
  });

  return (
    <div className="hc-run-chart__plot">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={mode === 'pace' ? 'Gráfico de ritmo das últimas corridas' : 'Gráfico de distância semanal'}>
        <line className="hc-run-chart__grid" x1="18" y1="39" x2="302" y2="39" />
        <line className="hc-run-chart__grid" x1="18" y1="76" x2="302" y2="76" />
        <line className="hc-run-chart__grid" x1="18" y1="113" x2="302" y2="113" />
        {points.length > 1 && <polyline className="hc-run-chart__line" points={points.map((point) => `${point.x},${point.y}`).join(' ')} />}
        {points.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle className="hc-run-chart__point" cx={point.x} cy={point.y} r="4" />
            <text className="hc-run-chart__label" x={point.x} y="139" textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
