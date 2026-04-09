import React, { useEffect, useState } from 'react';
import { Trophy, Dumbbell, TrendingUp } from 'lucide-react';
import { getWorkoutHistory } from '../../services/storage';

export default function StatsPage() {
  const [stats, setStats] = useState({ days: 0, exercises: 0, volume: 0 });

  useEffect(() => {
    const history = getWorkoutHistory();
    const keys = Object.keys(history);
    let exercises = 0;
    let volume = 0;

    keys.forEach((date) => {
      const exs = history[date].exercises || {};
      exercises += Object.keys(exs).length;
      Object.values(exs).forEach((r) => {
        const kg = parseFloat(r.kg);
        const reps = parseFloat(r.reps);
        if (!isNaN(kg) && !isNaN(reps)) volume += kg * reps;
      });
    });

    setStats({ days: keys.length, exercises, volume });
  }, []);

  const cards = [
    { label: 'Sessões', value: stats.days, Icon: Trophy, color: 'text-lime-400' },
    { label: 'Exercícios Salvos', value: stats.exercises, Icon: Dumbbell, color: 'text-cyan-400' },
    { label: 'Volume Total', value: `${stats.volume.toLocaleString('pt-BR')} kg`, Icon: TrendingUp, color: 'text-orange-400' },
  ];

  return (
    <div>
      <h2 className="text-[22px] font-bold mb-5 text-gray-900 dark:text-white">Desempenho</h2>

      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-light-card dark:bg-dark-card rounded-2xl p-5 flex items-center gap-4 border border-light-separator dark:border-dark-separator transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl bg-light-bg dark:bg-dark-surface flex items-center justify-center ${c.color}`}>
              <c.Icon size={24} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
