import React, { useEffect, useMemo, useState } from 'react';
import { Droplets, Flame, Plus, AlertTriangle } from 'lucide-react';
import { getLastStorageError, getNutritionLog, saveNutritionLog } from '../../services/storage';
import { workoutPlan } from '../../data/workoutPlan';

export default function NutritionPage({ plan = workoutPlan }) {
  const targetWater = plan.general.waterLiters * 1000;
  const calorieRange = useMemo(() => plan.general.calorieTarget || { min: 0, max: plan.general.tdee }, [plan]);
  const targetCalories = calorieRange.max || plan.general.tdee;

  const [data, setData] = useState({ water: 0, calories: 0 });
  const [calInput, setCalInput] = useState('');
  const [storageError, setStorageError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadNutrition = async () => {
      const nextData = await getNutritionLog();
      if (isMounted) {
        setData(nextData);
        setStorageError(getLastStorageError());
      }
    };

    loadNutrition();

    return () => {
      isMounted = false;
    };
  }, []);

  const addWater = async (ml) => {
    const updated = await saveNutritionLog(ml, 0);
    setStorageError(getLastStorageError());
    if (updated) setData(updated);
  };

  const addCalories = async () => {
    if (!calInput) return;
    const updated = await saveNutritionLog(0, calInput);
    setStorageError(getLastStorageError());
    if (updated) {
      setData(updated);
      setCalInput('');
    }
  };

  const waterPct = Math.min((data.water / targetWater) * 100, 100);
  const calPct = Math.min((data.calories / targetCalories) * 100, 100);

  return (
    <div>
      <header className="mb-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Consumo do dia</p>
        <h2 className="mt-1 text-[32px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">Nutricao</h2>
      </header>

      {storageError && (
        <div className="mb-4 flex items-start gap-2 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="text-[13px] leading-relaxed">Falha ao sincronizar seus dados agora. Tente novamente em instantes.</p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Agua</p>
          <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{(data.water / 1000).toFixed(1)}L</p>
        </div>
        <div className="rounded-[24px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Calorias</p>
          <p className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">{data.calories}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
                <Droplets size={22} />
              </div>
              <div>
                <p className="text-[17px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">Hidratacao</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">Meta de {targetWater / 1000}L hoje</p>
              </div>
            </div>
            <p className="text-[20px] font-bold tracking-[-0.03em] text-[#0A3CFF] dark:text-[#AFC5FF]">{Math.round(waterPct)}%</p>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-[#E9EEF9] dark:bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#0A3CFF] transition-all duration-500" style={{ width: `${waterPct}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => void addWater(250)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F4F7FF] text-[14px] font-semibold text-[#0A3CFF] transition-transform active:scale-[0.98] dark:bg-[#0A3CFF]/15 dark:text-[#AFC5FF]">
              <Plus size={16} /> 250 ml
            </button>
            <button onClick={() => void addWater(500)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F4F7FF] text-[14px] font-semibold text-[#0A3CFF] transition-transform active:scale-[0.98] dark:bg-[#0A3CFF]/15 dark:text-[#AFC5FF]">
              <Plus size={16} /> 500 ml
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
                <Flame size={22} />
              </div>
              <div>
                <p className="text-[17px] font-bold tracking-[-0.02em] text-gray-950 dark:text-white">Calorias</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  Alvo diario {calorieRange.min}-{calorieRange.max} kcal
                </p>
              </div>
            </div>
            <p className="text-[20px] font-bold tracking-[-0.03em] text-[#0A3CFF] dark:text-[#AFC5FF]">{Math.round(calPct)}%</p>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-[#E9EEF9] dark:bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#0A3CFF] transition-all duration-500" style={{ width: `${Math.min(calPct, 100)}%` }} />
          </div>

          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Adicionar calorias"
              value={calInput}
              onChange={(e) => setCalInput(e.target.value)}
              className="h-12 flex-1 rounded-2xl border border-black/[0.06] bg-[#F7F9FD] px-4 text-[15px] font-semibold text-gray-950 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-gray-500"
            />
            <button
              onClick={() => void addCalories()}
              aria-label="Adicionar calorias"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0A3CFF] text-white shadow-[0_14px_26px_rgba(10,60,255,0.24)] transition-transform active:scale-[0.98]"
            >
              <Plus size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
