import React, { useEffect, useState } from 'react';
import { getWorkoutHistory } from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';

export default function HistoryPage() {
  const [history, setHistory] = useState({});

  useEffect(() => {
    setHistory(getWorkoutHistory());
  }, []);

  const keys = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div>
      <h2 className="text-[22px] font-bold mb-5 text-gray-900 dark:text-white">Histórico</h2>

      {keys.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-[14px] py-16 font-medium">
          Nenhum treino registrado ainda.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {keys.map((dateStr) => {
          const log = history[dateStr];
          const plan = workoutPlan.schedule[log.workoutId];
          if (!plan) return null;

          const exKeys = Object.keys(log.exercises || {});

          return (
            <div
              key={dateStr}
              className="glass-card p-4"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-light-separator dark:border-dark-separator">
                <div>
                  <span className="inline-block text-[10px] font-bold text-lime-500 bg-lime-400/10 px-2 py-0.5 rounded-md uppercase mb-1">
                    {plan.id} — {plan.day}
                  </span>
                  <p className="text-[15px] font-bold leading-tight text-gray-900 dark:text-white">{plan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                    {new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[11px] text-lime-500 font-semibold">{exKeys.length} itens</p>
                </div>
              </div>

              {/* Exercises */}
              {exKeys.map((exId) => {
                const ref = plan.exercises?.find((e) => e.id === exId);
                const rec = log.exercises[exId];
                const isCardio = String(rec.kg).includes('min') || (ref && ref.type === 'cardio');
                return (
                  <div key={exId} className="flex justify-between items-center py-1.5">
                    <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium">
                      {ref ? ref.name : exId}
                    </span>
                    <div className="flex gap-3 text-[13px] font-bold">
                      <span>{rec.kg}{!isCardio && <span className="text-[10px] text-gray-400 ml-0.5">kg</span>}</span>
                      <span className="w-12 text-right">{rec.reps}{!isCardio && <span className="text-[10px] text-gray-400 ml-0.5">r</span>}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
