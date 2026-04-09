import React, { useEffect, useState } from 'react';
import { Droplets, Flame, Plus } from 'lucide-react';
import { getNutritionLog, saveNutritionLog } from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';

export default function NutritionPage() {
  const targetWater = workoutPlan.general.waterLiters * 1000;
  const targetCalories = workoutPlan.general.tdee;

  const [data, setData] = useState({ water: 0, calories: 0 });
  const [calInput, setCalInput] = useState('');

  useEffect(() => {
    setData(getNutritionLog());
  }, []);

  const addWater = (ml) => {
    const updated = saveNutritionLog(ml, 0);
    if (updated) setData(updated);
  };

  const addCalories = () => {
    if (!calInput) return;
    const updated = saveNutritionLog(0, calInput);
    if (updated) { setData(updated); setCalInput(''); }
  };

  const waterPct = Math.min((data.water / targetWater) * 100, 100);
  const calPct = Math.min((data.calories / targetCalories) * 100, 100);

  return (
    <div>
      <h2 className="text-[22px] font-bold mb-5 text-gray-900 dark:text-white">Nutrição</h2>

      <div className="flex flex-col gap-4">
        {/* Water */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Droplets size={20} className="text-cyan-500" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">Hidratação</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Meta: {targetWater / 1000}L</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-cyan-500">{(data.water / 1000).toFixed(1)}<span className="text-sm">L</span></p>
          </div>

          {/* Progress */}
          <div className="h-2.5 bg-light-bg dark:bg-dark-surface rounded-full overflow-hidden mb-4">
            <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${waterPct}%` }} />
          </div>

          <div className="flex gap-2">
            <button onClick={() => addWater(250)} className="flex-1 h-10 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
              <Plus size={14} /> 250ml
            </button>
            <button onClick={() => addWater(500)} className="flex-1 h-10 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
              <Plus size={14} /> 500ml
            </button>
          </div>
        </div>

        {/* Calories */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Flame size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900 dark:text-white">Calorias</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Limite: {targetCalories} kcal</p>
              </div>
            </div>
            <p className={`text-2xl font-bold ${calPct >= 100 ? 'text-red-500' : 'text-orange-500'}`}>{data.calories}</p>
          </div>

          <div className="h-2.5 bg-light-bg dark:bg-dark-surface rounded-full overflow-hidden mb-4">
            <div className={`h-full rounded-full transition-all duration-500 ${calPct >= 100 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(calPct, 100)}%` }} />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Kcal consumida"
              value={calInput}
              onChange={(e) => setCalInput(e.target.value)}
              className="flex-1 h-10 bg-light-bg dark:bg-dark-surface rounded-xl px-3 text-[14px] font-semibold text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-600 outline-none focus:ring-2 ring-orange-500 transition-shadow"
            />
            <button onClick={addCalories} className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-transform">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
