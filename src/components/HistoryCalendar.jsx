import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getWorkoutHistory } from '../services/storage';
import { workoutPlan } from '../data/workoutPlan';

export default function HistoryCalendar({ onClose }) {
  const [history, setHistory] = useState({});

  useEffect(() => {
    setHistory(getWorkoutHistory());
  }, []);

  const historyKeys = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="fixed inset-0 z-[100] bg-white/90 dark:bg-obsidian/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10 pt-4">
         <h1 className="text-3xl font-display font-bold tracking-tight text-black dark:text-white">Histórico</h1>
         <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-surface rounded-full flex items-center justify-center text-gray-500 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors">
            <X size={20} strokeWidth={2.5} />
         </button>
      </div>

      {/* History Feed */}
      <div className="flex flex-col gap-6">
        {historyKeys.length === 0 && (
          <div className="text-center text-gray-400 dark:text-white/30 text-sm py-10 font-bold">Nenhum treino registrado. Comece agr!</div>
        )}

        {historyKeys.map(dateStr => {
           const logData = history[dateStr];
           const plan = workoutPlan.schedule[logData.workoutId];
           if (!plan) return null;
           
           return (
             <div key={dateStr} className="bg-white dark:bg-charcoal border border-gray-100 dark:border-white/5 rounded-3xl p-5 shadow-xl transition-colors duration-300">
               <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-4">
                 <div>
                   <span className="text-xs font-bold text-primary-500 dark:text-primary-400 bg-primary-400/10 px-3 py-1 rounded-full uppercase mb-2 inline-block">
                     {plan.id} - {plan.day}
                   </span>
                   <h2 className="text-lg font-display font-bold text-black dark:text-white leading-tight">{plan.name}</h2>
                 </div>
                 <div className="text-right flex flex-col items-end">
                   <span className="text-sm font-bold text-black dark:text-white">{new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric'})}</span>
                   <span className="text-[10px] text-primary-500 dark:text-primary-400 font-mono mt-1 font-bold">{Object.keys(logData.exercises).length} Itens</span>
                 </div>
               </div>

               <div className="flex flex-col gap-2">
                 {Object.keys(logData.exercises).map(exId => {
                   const exRef = plan.exercises?.find(e => e.id === exId);
                   const record = logData.exercises[exId];
                   const isCardio = String(record.kg).includes('min') || (exRef && exRef.type === 'cardio');

                   return (
                     <div key={exId} className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-600 dark:text-white/80 font-medium">{exRef ? exRef.name : `Exercício ${exId}`}</span>
                        <div className="flex gap-4">
                            <span className="text-sm font-display font-bold text-black dark:text-white">{record.kg} <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase">{isCardio ? '' : 'KG'}</span></span>
                            <span className="text-sm font-display font-bold text-black dark:text-white w-14 text-right">{record.reps} <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase">{isCardio ? '' : 'R'}</span></span>
                        </div>
                     </div>
                   )
                 })}
               </div>
             </div>
           )
        })}
      </div>

    </div>
  );
}
