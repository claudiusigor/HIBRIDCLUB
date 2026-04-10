import React, { useEffect, useState } from 'react';
import { X, Droplets, Flame, Plus } from 'lucide-react';
import { getNutritionLog, saveNutritionLog } from '../services/storage';

export default function NutritionModal({ onClose, targetWater = 4000, targetCalories = 2841 }) {
  const [data, setData] = useState({ water: 0, calories: 0 });
  const [calInput, setCalInput] = useState('');

  useEffect(() => {
    setData(getNutritionLog());
  }, []);

  const addWater = (amount) => {
    const updated = saveNutritionLog(amount, 0);
    if (updated) setData(updated);
  };

  const addCalories = () => {
    if (!calInput) return;
    const updated = saveNutritionLog(0, calInput);
    if (updated) {
      setData(updated);
      setCalInput('');
    }
  };

  const waterPercent = Math.min((data.water / targetWater) * 100, 100);
  const calPercent = Math.min((data.calories / targetCalories) * 100, 100);

  return (
    <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-obsidian/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto duration-300">
      <div className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-black dark:text-white">Nutrição</h1>
        <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-surface rounded-full flex items-center justify-center text-gray-500 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors">
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-8">
        <div className="bg-white dark:bg-charcoal rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-cyan-50 dark:bg-[#00E5FF]/10 rounded-2xl flex items-center justify-center">
                <Droplets className="text-cyan-500 dark:text-[#00E5FF]" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-black dark:text-white leading-tight">Hidratação</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mt-1">Meta: {targetWater / 1000}L</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-display font-black text-cyan-500 dark:text-[#00E5FF]">{(data.water / 1000).toFixed(1)}<span className="text-sm">L</span></span>
            </div>
          </div>

          <div className="h-4 bg-gray-100 dark:bg-surface rounded-full overflow-hidden mb-6 relative z-10">
            <div className="h-full bg-cyan-500 dark:bg-[#00E5FF] rounded-full transition-all duration-700" style={{ width: `${waterPercent}%` }} />
          </div>

          <div className="flex gap-3 relative z-10">
            <button onClick={() => addWater(250)} className="flex-1 bg-cyan-50 dark:bg-[#00E5FF]/10 hover:bg-cyan-100 dark:hover:bg-[#00E5FF]/20 text-cyan-600 dark:text-[#00E5FF] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <Plus size={18} /> 250ml
            </button>
            <button onClick={() => addWater(500)} className="flex-1 bg-cyan-50 dark:bg-[#00E5FF]/10 hover:bg-cyan-100 dark:hover:bg-[#00E5FF]/20 text-cyan-600 dark:text-[#00E5FF] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors">
              <Plus size={18} /> 500ml
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-charcoal rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex gap-4 items-center">
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center">
                <Flame className="text-orange-500" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-black dark:text-white leading-tight">Déficit diário</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/40 mt-1">Limite: {targetCalories} kcal</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-display font-black text-orange-500">{data.calories}</span>
            </div>
          </div>

          <div className="h-4 bg-gray-100 dark:bg-surface rounded-full overflow-hidden mb-6 relative z-10">
            <div className={`h-full rounded-full transition-all duration-700 ${calPercent > 100 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(calPercent, 100)}%` }} />
          </div>

          <div className="flex gap-3 relative z-10">
            <div className="flex-1 bg-gray-50 dark:bg-surface rounded-2xl flex items-center px-4 focus-within:ring-2 ring-orange-500 transition-all">
              <input
                type="number"
                placeholder="Kcal consumida"
                value={calInput}
                onChange={(e) => setCalInput(e.target.value)}
                className="bg-transparent w-full text-black dark:text-white font-bold outline-none placeholder-gray-400 dark:placeholder-white/30"
              />
            </div>
            <button onClick={addCalories} className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center hover:bg-orange-600 transition-colors shrink-0 shadow-lg shadow-orange-500/30">
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
