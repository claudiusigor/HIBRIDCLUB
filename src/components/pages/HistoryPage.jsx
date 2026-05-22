import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getLastStorageError,
  getNormalizedWorkoutEntry,
  getWorkoutHistory,
  getWorkoutSessions,
  hasWorkoutSessions,
} from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

const formatValue = (value, unit) => `${value}${unit ? ` ${unit}` : ''}`;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function HistoryPage({ plan = workoutPlan }) {
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
        .filter((dateKey) => hasWorkoutSessions(history[dateKey]))
        .sort(),
    [history]
  );

  const monthCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  const visibleMonthKey = `${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`;
  const currentMonthWorkoutKeys = useMemo(
    () =>
      workoutDateKeys.filter((dateKey) => {
        const date = new Date(`${dateKey}T00:00:00`);
        return `${date.getFullYear()}-${date.getMonth()}` === visibleMonthKey;
      }),
    [visibleMonthKey, workoutDateKeys]
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

    if (currentMonthWorkoutKeys.length > 0) {
      setSelectedDateKey(currentMonthWorkoutKeys[0]);
      return;
    }

    setSelectedDateKey(toDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)));
  }, [currentMonthWorkoutKeys, selectedDateKey, visibleMonth]);

  const selectedLog = history[selectedDateKey];
  const selectedNutrition = {
    water: Number(selectedLog?.nutrition?.water) || 0,
    calories: Number(selectedLog?.nutrition?.calories) || 0,
  };
  const selectedSessions = getWorkoutSessions(selectedLog);
  const hasSelectedWorkout = selectedSessions.length > 0;

  return (
    <div>
      <header className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Sessões salvas</p>
        <h2 className="mt-1 text-[32px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">Histórico</h2>
      </header>

      {storageError && (
        <div className="mb-4 flex items-start gap-2 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-relaxed">Falha ao carregar parte do histórico agora. Tente atualizar em instantes.</p>
        </div>
      )}

      <section className="mb-4 overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Calendario</p>
            <h3 className="mt-1 text-[24px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">
              {visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
              {currentMonthWorkoutKeys.length > 0
                ? `${currentMonthWorkoutKeys.length} dia${currentMonthWorkoutKeys.length > 1 ? 's' : ''} com treino neste mês`
                : 'Nenhum treino salvo neste mês'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="Mês anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F6FC] text-[#0A3CFF] transition-colors hover:bg-[#E7EEFF] dark:bg-white/[0.08] dark:text-[#AFC5FF]"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="Próximo mês"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F6FC] text-[#0A3CFF] transition-colors hover:bg-[#E7EEFF] dark:bg-white/[0.08] dark:text-[#AFC5FF]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-7 gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthCells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-[54px]" />;
            }

            const dateKey = toDateKey(date);
            const isSelected = selectedDateKey === dateKey;
            const hasWorkout = hasWorkoutSessions(history[dateKey]);
            const isToday = toDateKey(new Date()) === dateKey;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                className={`relative flex h-[54px] flex-col items-center justify-center rounded-[18px] border text-center transition-all duration-200 ${
                  isSelected
                    ? 'border-[#0A3CFF] bg-[#0A3CFF] text-white shadow-[0_10px_22px_rgba(10,60,255,0.2)]'
                    : hasWorkout
                      ? 'border-[#0A3CFF]/12 bg-[#F4F7FF] text-[#0A3CFF] hover:border-[#0A3CFF]/25 dark:border-white/[0.06] dark:bg-[#0A3CFF]/12 dark:text-[#AFC5FF]'
                      : 'border-black/[0.05] bg-[#FAFBFE] text-gray-600 hover:border-black/[0.08] dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-gray-400'
                }`}
              >
                <span className={`text-[15px] font-bold ${isToday && !isSelected ? 'text-gray-950 dark:text-white' : ''}`}>
                  {date.getDate()}
                </span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    isSelected ? 'bg-white/90' : hasWorkout ? 'bg-[#0A3CFF] dark:bg-[#AFC5FF]' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        {!hasSelectedWorkout && (
          <div className="px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-gray-500 dark:text-gray-400">Nenhum treino salvo neste dia.</p>
            <p className="mt-2 text-[13px] text-gray-400 dark:text-gray-500">
              {selectedLog?.nutrition?.water || selectedLog?.nutrition?.calories
                ? 'Há registro de nutrição nesta data, mas sem sessão de treino salva.'
                : 'Toque em outro dia marcado para ver os detalhes do treino.'}
            </p>
            {(selectedNutrition.water > 0 || selectedNutrition.calories > 0) && (
              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-[16px] border border-black/[0.05] bg-[#F7F9FD] px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Água</p>
                  <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{selectedNutrition.water} ml</p>
                </div>
                <div className="rounded-[16px] border border-black/[0.05] bg-[#F7F9FD] px-3 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Calorias</p>
                  <p className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{selectedNutrition.calories} kcal</p>
                </div>
              </div>
            )}
          </div>
        )}

        {hasSelectedWorkout && (
          <>
            <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center rounded-full bg-[#0A3CFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
                    Dia selecionado
                  </span>
                  <p className="mt-2 text-[18px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">
                    {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                    {selectedSessions.length} sessão{selectedSessions.length > 1 ? 'es' : ''}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#0A3CFF] dark:text-[#8FB1FF]">
                    {selectedSessions.reduce((total, session) => total + Object.keys(session.exercises || {}).length, 0)} itens salvos
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-black/[0.05] bg-[#F7F9FD] px-3 py-2.5 text-left dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Água</p>
                  <p className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{selectedNutrition.water} ml</p>
                </div>
                <div className="rounded-[14px] border border-black/[0.05] bg-[#F7F9FD] px-3 py-2.5 text-left dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Calorias</p>
                  <p className="mt-1 text-[16px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{selectedNutrition.calories} kcal</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-3 py-3">
              {selectedSessions.map((session) => {
                const selectedPlan = plan.schedule[session.workoutId];
                const sessionTitle = selectedPlan ? selectedPlan.name : `Sessão ${session.workoutId}`;
                const sessionType = selectedPlan ? selectedPlan.type : 'Treino salvo';

                return (
                  <article
                    key={`${selectedDateKey}-${session.workoutId}`}
                    className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-[#FBFCFF] dark:border-white/[0.06] dark:bg-white/[0.03]"
                  >
                    <div className="border-b border-black/[0.05] px-4 py-4 dark:border-white/[0.06]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex items-center rounded-full bg-[#0A3CFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
                            {selectedPlan ? `${selectedPlan.id} - ${selectedPlan.day}` : session.workoutId}
                          </span>
                          <p className="mt-2 text-[17px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{sessionTitle}</p>
                          <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">{sessionType}</p>
                        </div>
                        <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400">
                          {Object.keys(session.exercises || {}).length} itens
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {Object.keys(session.exercises || {}).map((exerciseId) => {
                        const exerciseMeta = selectedPlan?.exercises?.find((exercise) => exercise.id === exerciseId);
                        const normalized = getNormalizedWorkoutEntry(session.exercises[exerciseId], exerciseMeta);
                        if (!normalized) return null;

                        return (
                          <div key={exerciseId} className="flex items-center justify-between gap-3 px-4 py-3.5">
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
                                {exerciseMeta ? exerciseMeta.name : exerciseId}
                              </p>
                              <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                                {normalized.kind === 'cardio' ? 'Cardio registrado' : 'Força registrada'}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[14px] font-bold text-gray-950 dark:text-white">
                                {formatValue(normalized.primary, normalized.primaryUnit)}
                              </p>
                              <p className="mt-0.5 text-[12px] font-medium text-gray-500 dark:text-gray-400">
                                {formatValue(normalized.secondary, normalized.secondaryUnit)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
