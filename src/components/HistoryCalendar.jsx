import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getNormalizedWorkoutEntry, getWorkoutHistory, getWorkoutSessions } from '../services/storage';
import { workoutPlan } from '../data/workoutPlan';

export default function HistoryCalendar({ onClose }) {
  const [history, setHistory] = useState({});

  useEffect(() => {
    setHistory(getWorkoutHistory());
  }, []);

  const historyKeys = useMemo(
    () =>
      Object.keys(history)
        .filter((dateKey) => getWorkoutSessions(history[dateKey]).length > 0)
        .sort((a, b) => new Date(b) - new Date(a)),
    [history]
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-white/90 p-6 backdrop-blur-xl transition-colors duration-300 dark:bg-obsidian/95">
      <div className="mb-10 flex items-center justify-between pt-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-black dark:text-white">Histórico</h1>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:text-black dark:bg-surface dark:text-white/50 dark:hover:text-white"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {historyKeys.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-gray-400 dark:text-white/30">Nenhum treino registrado. Comece agora.</div>
        )}

        {historyKeys.map((dateStr) => {
          const sessions = getWorkoutSessions(history[dateStr]);

          return sessions.map((session) => {
            const plan = workoutPlan.schedule[session.workoutId];
            if (!plan) return null;

            return (
              <div
                key={`${dateStr}-${session.workoutId}`}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl transition-colors duration-300 dark:border-white/5 dark:bg-charcoal"
              >
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-white/5">
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-primary-400/10 px-3 py-1 text-xs font-bold uppercase text-primary-500 dark:text-primary-400">
                      {plan.id} - {plan.day}
                    </span>
                    <h2 className="text-lg font-display font-bold leading-tight text-black dark:text-white">{plan.name}</h2>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-sm font-bold text-black dark:text-white">
                      {new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="mt-1 font-mono text-[10px] font-bold text-primary-500 dark:text-primary-400">
                      {Object.keys(session.exercises || {}).length} itens
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {Object.keys(session.exercises || {}).map((exerciseId) => {
                    const exerciseMeta = plan.exercises?.find((exercise) => exercise.id === exerciseId);
                    const normalized = getNormalizedWorkoutEntry(session.exercises[exerciseId], exerciseMeta);
                    if (!normalized) return null;

                    return (
                      <div key={exerciseId} className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-white/80">
                          {exerciseMeta ? exerciseMeta.name : `Exercício ${exerciseId}`}
                        </span>
                        <div className="flex gap-4">
                          <span className="text-sm font-display font-bold text-black dark:text-white">
                            {normalized.primary} <span className="text-[10px] uppercase text-gray-400 dark:text-white/30">{normalized.primaryUnit}</span>
                          </span>
                          <span className="w-14 text-right text-sm font-display font-bold text-black dark:text-white">
                            {normalized.secondary}{' '}
                            <span className="text-[10px] uppercase text-gray-400 dark:text-white/30">{normalized.secondaryUnit}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
