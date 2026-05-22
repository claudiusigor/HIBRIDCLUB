import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Footprints,
  Layers3,
  Sparkles,
  TimerReset,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  getLastStorageError,
  getNormalizedWorkoutEntry,
  getWorkoutHistory,
  getWorkoutSessions,
} from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';

const INSIGHTS = {
  sessions: 'sessions',
  monthDays: 'monthDays',
  lastWorkout: 'lastWorkout',
  streak: 'streak',
  exercises: 'exercises',
  volume: 'volume',
  topWorkout: 'topWorkout',
  distribution: 'distribution',
  weeklyRhythm: 'weeklyRhythm',
};

const EMPTY_SUMMARY = {
  sessions: 0,
  monthDays: 0,
  streak: 0,
  exercises: 0,
  volume: 0,
  recentSessions: [],
  recentDays: [],
  weeklyRhythm: [],
  distribution: { strength: 0, cardio: 0 },
  topWorkout: null,
  lastWorkout: null,
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });

const formatLongDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

function buildStatsSummary(history, plan) {
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
  const dayKeys = Object.keys(history).sort((a, b) => a.localeCompare(b));
  const validDayKeys = [];
  const recentSessions = [];
  const workoutFrequency = {};
  let sessions = 0;
  let exercises = 0;
  let volume = 0;
  let strengthCount = 0;
  let cardioCount = 0;

  dayKeys.forEach((dateKey) => {
    const dayEntry = history[dateKey];
    const daySessions = getWorkoutSessions(dayEntry);

    if (daySessions.length === 0) {
      return;
    }

    validDayKeys.push(dateKey);

    daySessions.forEach((session) => {
      const planEntry = plan.schedule[session.workoutId];
      const sessionItemCount = Object.keys(session.exercises || {}).length;

      sessions += 1;
      recentSessions.push({
        dateKey,
        workoutId: session.workoutId,
        workoutName: planEntry?.name || session.workoutId,
        workoutType: planEntry?.type || 'Treino',
        itemCount: sessionItemCount,
        updatedAt: session.updatedAt || 0,
      });

      workoutFrequency[session.workoutId] = (workoutFrequency[session.workoutId] || 0) + 1;

      if (planEntry?.type === 'Cardio') {
        cardioCount += 1;
      } else {
        strengthCount += 1;
      }

      Object.entries(session.exercises || {}).forEach(([exerciseId, entry]) => {
        exercises += 1;

        const exerciseMeta = planEntry?.exercises?.find((item) => item.id === exerciseId);
        const normalized = getNormalizedWorkoutEntry(entry, exerciseMeta);

        if (normalized?.kind === 'strength') {
          volume += normalized.primary * normalized.secondary;
        }
      });
    });
  });

  const monthDays = validDayKeys.filter((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    return `${date.getFullYear()}-${date.getMonth()}` === monthKey;
  }).length;

  const trainedDays = new Set(validDayKeys);
  let streak = 0;
  if (trainedDays.size > 0) {
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (!trainedDays.has(toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (trainedDays.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const sortedRecentSessions = recentSessions.sort((a, b) => {
    if (a.dateKey === b.dateKey) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }

    return b.dateKey.localeCompare(a.dateKey);
  });

  const lastWorkout = sortedRecentSessions[0] || null;

  const topWorkoutEntry = Object.entries(workoutFrequency).sort((a, b) => {
    if (b[1] === a[1]) {
      return a[0].localeCompare(b[0]);
    }

    return b[1] - a[1];
  })[0];

  const topWorkout = topWorkoutEntry
    ? {
        workoutId: topWorkoutEntry[0],
        count: topWorkoutEntry[1],
        name: plan.schedule[topWorkoutEntry[0]]?.name || topWorkoutEntry[0],
      }
    : null;

  const weeklyRhythm = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
    const dateKey = toDateKey(date);
    const daySessions = getWorkoutSessions(history[dateKey]);

    return {
      dateKey,
      label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      dayNumber: date.getDate(),
      hasWorkout: daySessions.length > 0,
      sessions: daySessions.map((session) => ({
        workoutId: session.workoutId,
        workoutName: plan.schedule[session.workoutId]?.name || session.workoutId,
      })),
    };
  });

  return {
    sessions,
    monthDays,
    streak,
    exercises,
    volume,
    recentSessions: sortedRecentSessions.slice(0, 6),
    recentDays: validDayKeys.slice().reverse().slice(0, 6),
    weeklyRhythm,
    distribution: {
      strength: strengthCount,
      cardio: cardioCount,
    },
    topWorkout,
    lastWorkout,
  };
}

export default function StatsPage({ plan = workoutPlan }) {
  const [statsSummary, setStatsSummary] = useState(EMPTY_SUMMARY);
  const [selectedInsight, setSelectedInsight] = useState(INSIGHTS.sessions);
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      const history = await getWorkoutHistory();
      if (isMounted) {
        setStatsSummary(buildStatsSummary(history, plan));
        setStorageError(getLastStorageError());
      }
    };

    loadStats();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadStats();
      }
    };

    const handleFocus = () => {
      void loadStats();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [plan]);

  const consistencyCards = useMemo(
    () => [
      {
        id: INSIGHTS.sessions,
        label: 'Sessões totais',
        value: statsSummary.sessions,
        helper: 'Contagem real de sessões salvas',
        Icon: Trophy,
      },
      {
        id: INSIGHTS.monthDays,
        label: 'Dias no mês',
        value: statsSummary.monthDays,
        helper: 'Dias únicos com treino no mês atual',
        Icon: CalendarDays,
      },
      {
        id: INSIGHTS.lastWorkout,
        label: 'Último treino',
        value: statsSummary.lastWorkout ? statsSummary.lastWorkout.workoutId : '--',
        helper: statsSummary.lastWorkout ? formatShortDate(statsSummary.lastWorkout.dateKey) : 'Sem registro ainda',
        Icon: TimerReset,
      },
      {
        id: INSIGHTS.streak,
        label: 'Sequência atual',
        value: `${statsSummary.streak}d`,
        helper: 'Dias seguidos com treino salvo',
        Icon: Flame,
      },
    ],
    [statsSummary]
  );

  const executionCards = useMemo(
    () => [
      {
        id: INSIGHTS.exercises,
        label: 'Exercícios registrados',
        value: statsSummary.exercises,
        helper: 'Itens salvos em todas as sessões',
        Icon: Dumbbell,
      },
      {
        id: INSIGHTS.volume,
        label: 'Volume total',
        value: statsSummary.volume.toLocaleString('pt-BR'),
        helper: 'Carga de força acumulada em kg',
        Icon: TrendingUp,
      },
      {
        id: INSIGHTS.topWorkout,
        label: 'Treino mais repetido',
        value: statsSummary.topWorkout ? statsSummary.topWorkout.workoutId : '--',
        helper: statsSummary.topWorkout ? `${statsSummary.topWorkout.count} registros` : 'Sem repetições ainda',
        Icon: Sparkles,
      },
      {
        id: INSIGHTS.distribution,
        label: 'Distribuição por tipo',
        value: `${statsSummary.distribution.strength}/${statsSummary.distribution.cardio}`,
        helper: 'Força Híbrida e Cardio',
        Icon: Layers3,
      },
    ],
    [statsSummary]
  );

  const selectedDetail = useMemo(() => {
    switch (selectedInsight) {
      case INSIGHTS.monthDays:
        return {
          eyebrow: 'Dias treinados no mês',
          title: `${statsSummary.monthDays} dia${statsSummary.monthDays === 1 ? '' : 's'} com treino neste mês`,
          description: 'Cada dia conta uma vez, mesmo que você tenha salvo mais de uma sessão na mesma data.',
          items: statsSummary.recentDays.map((dateKey) => ({
            primary: formatLongDate(dateKey),
            secondary: 'Dia com pelo menos uma sessão salva',
          })),
        };
      case INSIGHTS.lastWorkout:
        return {
          eyebrow: 'Último treino salvo',
          title: statsSummary.lastWorkout ? `${statsSummary.lastWorkout.workoutName}` : 'Nenhum treino salvo ainda',
          description: statsSummary.lastWorkout
            ? `${formatLongDate(statsSummary.lastWorkout.dateKey)} • ${statsSummary.lastWorkout.itemCount} itens registrados`
            : 'Assim que você salvar o primeiro treino, o app mostra aqui o registro mais recente.',
          items: statsSummary.lastWorkout
            ? [
                {
                  primary: statsSummary.lastWorkout.workoutType,
                  secondary: `Sessão ${statsSummary.lastWorkout.workoutId}`,
                },
              ]
            : [],
        };
      case INSIGHTS.streak:
        return {
          eyebrow: 'Sequência atual',
          title: `${statsSummary.streak} dia${statsSummary.streak === 1 ? '' : 's'} em sequência`,
          description:
            statsSummary.streak > 0
              ? 'A sequência considera dias consecutivos treinados a partir do dia mais recente com treino.'
              : 'Ainda não há uma sequência ativa de treinos salvos.',
          items: statsSummary.recentDays.slice(0, 5).map((dateKey) => ({
            primary: formatLongDate(dateKey),
            secondary: 'Entrou na sua linha recente de consistência',
          })),
        };
      case INSIGHTS.exercises:
        return {
          eyebrow: 'Exercícios registrados',
          title: `${statsSummary.exercises} itens já salvos`,
          description: 'Esse total soma todos os exercícios preenchidos nas suas sessões válidas.',
          items: statsSummary.recentSessions.map((session) => ({
            primary: session.workoutName,
            secondary: `${formatShortDate(session.dateKey)} • ${session.itemCount} itens`,
          })),
        };
      case INSIGHTS.volume:
        return {
          eyebrow: 'Volume total de força',
          title: `${statsSummary.volume.toLocaleString('pt-BR')} kg acumulados`,
          description: 'O cálculo soma carga × repetições apenas das entradas de força salvas no histórico.',
          items: statsSummary.recentSessions
            .filter((session) => session.workoutType !== 'Cardio')
            .slice(0, 5)
            .map((session) => ({
              primary: session.workoutName,
              secondary: `${formatShortDate(session.dateKey)} • ${session.itemCount} itens`,
            })),
        };
      case INSIGHTS.topWorkout:
        return {
          eyebrow: 'Treino mais repetido',
          title: statsSummary.topWorkout
            ? `${statsSummary.topWorkout.name} apareceu ${statsSummary.topWorkout.count} vez${statsSummary.topWorkout.count === 1 ? '' : 'es'}`
            : 'Ainda não há treino dominante',
          description: 'Essa métrica ajuda a entender qual sessão está aparecendo com mais frequência no seu histórico.',
          items: statsSummary.recentSessions
            .filter((session) => session.workoutId === statsSummary.topWorkout?.workoutId)
            .map((session) => ({
              primary: formatLongDate(session.dateKey),
              secondary: `${session.itemCount} itens salvos`,
            })),
        };
      case INSIGHTS.distribution:
        return {
          eyebrow: 'Distribuição por tipo',
          title: 'Equilíbrio entre força e cardio',
          description: 'A contagem usa o tipo definido para cada sessão do plano salvo no app.',
          comparisons: [
            {
              label: 'Força Híbrida',
              value: statsSummary.distribution.strength,
              accent: 'bg-[#0A3CFF] text-white shadow-[0_14px_28px_rgba(10,60,255,0.2)]',
            },
            {
              label: 'Cardio',
              value: statsSummary.distribution.cardio,
              accent: 'bg-[#EAF0FF] text-[#0A3CFF] dark:bg-[#0A3CFF]/14 dark:text-[#AFC5FF]',
            },
          ],
        };
      case INSIGHTS.weeklyRhythm:
        return {
          eyebrow: 'Ritmo semanal recente',
          title: 'Últimos 7 dias',
          description: 'Uma leitura rápida da sua consistência recente, sem duplicar o calendário completo do histórico.',
          items: statsSummary.weeklyRhythm.map((day) => ({
            primary: `${day.label} ${day.dayNumber}`,
            secondary: day.hasWorkout ? day.sessions.map((session) => session.workoutId).join(' • ') : 'Sem treino salvo',
          })),
        };
      case INSIGHTS.sessions:
      default:
        return {
          eyebrow: 'Sessões totais',
          title: `${statsSummary.sessions} sessão${statsSummary.sessions === 1 ? '' : 's'} salvas`,
          description: 'Se você salvar A e C no mesmo dia, as duas contam separadamente aqui.',
          items: statsSummary.recentSessions.map((session) => ({
            primary: session.workoutName,
            secondary: `${formatShortDate(session.dateKey)} • ${session.itemCount} itens`,
          })),
        };
    }
  }, [selectedInsight, statsSummary]);

  const summaryText = statsSummary.sessions
    ? `Você treinou ${statsSummary.monthDays} dia${statsSummary.monthDays === 1 ? '' : 's'} neste mês e mantém ${statsSummary.streak} dia${statsSummary.streak === 1 ? '' : 's'} de sequência.`
    : 'Seu painel de consistência vai começar a ganhar vida assim que você salvar os primeiros treinos.';

  return (
    <div>
      {storageError && (
        <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Alguns dados não puderam ser sincronizados agora. Tente atualizar em instantes.
        </div>
      )}
      <header className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Painel analítico</p>
        <h2 className="mt-1 text-[32px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">Desempenho</h2>
      </header>

      <section className="mb-4 overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
              <Activity size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Resumo principal</p>
              <p className="mt-2 text-[28px] font-bold leading-[1.02] tracking-[-0.05em] text-gray-950 dark:text-white">
                {statsSummary.sessions} sessões, {statsSummary.monthDays} dias no mês
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 py-4">
          <HeroMetric label="Sessões" value={statsSummary.sessions} />
          <HeroMetric label="Sequência" value={`${statsSummary.streak}d`} />
          <HeroMetric label="Volume" value={`${Math.round(statsSummary.volume).toLocaleString('pt-BR')} kg`} />
        </div>

        <div className="border-t border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
          <p className="text-[14px] leading-relaxed text-gray-600 dark:text-gray-300">{summaryText}</p>
        </div>
      </section>

      <section className="mb-4">
        <SectionHeader
          eyebrow="Consistência"
          title="Frequência e presença"
          description="Toque em um card para abrir o detalhe logo abaixo."
        />
        <div className="grid grid-cols-2 gap-3">
          {consistencyCards.map((card) => (
            <InsightCard key={card.id} {...card} isActive={selectedInsight === card.id} onClick={() => setSelectedInsight(card.id)} />
          ))}
        </div>
      </section>

      <section className="mb-4">
        <SectionHeader
          eyebrow="Execução"
          title="Carga e repetição"
          description="Métricas que mostram o quanto você já registrou no app."
        />
        <div className="grid grid-cols-2 gap-3">
          {executionCards.map((card) => (
            <InsightCard key={card.id} {...card} isActive={selectedInsight === card.id} onClick={() => setSelectedInsight(card.id)} />
          ))}
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <button
          onClick={() => setSelectedInsight(INSIGHTS.weeklyRhythm)}
          className={`w-full px-5 py-4 text-left transition-colors ${
            selectedInsight === INSIGHTS.weeklyRhythm ? 'bg-[#F7FAFF] dark:bg-white/[0.04]' : ''
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Ritmo semanal recente</p>
              <h3 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">Últimos 7 dias</h3>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
              <Footprints size={18} />
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {statsSummary.weeklyRhythm.map((day) => (
              <div
                key={day.dateKey}
                className={`rounded-[18px] border px-2 py-3 text-center ${
                  day.hasWorkout
                    ? 'border-[#0A3CFF]/12 bg-[#F4F7FF] text-[#0A3CFF] dark:border-white/[0.06] dark:bg-[#0A3CFF]/12 dark:text-[#AFC5FF]'
                    : 'border-black/[0.05] bg-[#FAFBFE] text-gray-400 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-gray-500'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">{day.label}</p>
                <p className="mt-2 text-[17px] font-bold">{day.dayNumber}</p>
                <span
                  className={`mx-auto mt-2 block h-1.5 w-1.5 rounded-full ${
                    day.hasWorkout ? 'bg-[#0A3CFF] dark:bg-[#AFC5FF]' : 'bg-gray-300 dark:bg-white/20'
                  }`}
                />
              </div>
            ))}
          </div>
        </button>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0A3CFF] dark:text-[#AFC5FF]">{selectedDetail.eyebrow}</p>
          <h3 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{selectedDetail.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{selectedDetail.description}</p>
        </div>

        {selectedDetail.comparisons && (
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            {selectedDetail.comparisons.map((comparison) => (
              <div key={comparison.label} className={`rounded-[22px] px-4 py-4 ${comparison.accent}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">{comparison.label}</p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.04em]">{comparison.value}</p>
              </div>
            ))}
          </div>
        )}

        {!selectedDetail.comparisons && (
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {selectedDetail.items.length > 0 ? (
              selectedDetail.items.map((item, index) => (
                <div key={`${item.primary}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{item.primary}</p>
                    <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">{item.secondary}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] font-semibold text-gray-500 dark:text-gray-400">Ainda não há detalhes para mostrar.</p>
                <p className="mt-2 text-[13px] text-gray-400 dark:text-gray-500">
                  Salve alguns treinos para começar a preencher esse painel.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-3">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{eyebrow}</p>
      <h3 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{title}</h3>
      <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-[20px] bg-[#F7F9FD] px-4 py-3 dark:bg-white/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function InsightCard({ label, value, helper, Icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-200 ${
        isActive
          ? 'border-[#0A3CFF]/20 bg-[#F4F7FF] shadow-[0_14px_28px_rgba(10,60,255,0.12)] dark:border-[#0A3CFF]/30 dark:bg-[#0A3CFF]/10'
          : 'border-black/[0.05] bg-white hover:border-[#0A3CFF]/12 dark:border-white/[0.08] dark:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
          <Icon size={18} />
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[#0A3CFF]' : 'bg-gray-200 dark:bg-white/10'}`} />
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{value}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">{helper}</p>
    </button>
  );
}

