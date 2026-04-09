import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { saveWorkoutLog } from '../services/storage';

export default function WorkoutExecution({ workout, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');

  if (!workout?.exercises?.length) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
        <button onClick={onClose} className="text-lime-500 font-semibold">Nenhum exercício. Voltar.</button>
      </div>
    );
  }

  const ex = workout.exercises[currentIndex];
  const isCardio = ex.type === 'cardio';
  const isLast = currentIndex === workout.exercises.length - 1;

  const handleNext = () => {
    if (val1 && val2) {
      saveWorkoutLog(workout.id, ex.id, isCardio ? `${val1} min` : val1, isCardio ? `${val2} km` : val2);
    }
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
      setVal1('');
      setVal2('');
    } else {
      onClose();
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-black dark:text-white flex flex-col transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between p-5">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-400 text-[14px] font-semibold active:opacity-60">
          <ChevronLeft size={18} /> Sair
        </button>
        <span className="text-[12px] font-bold text-lime-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
          Em progresso
        </span>
        <span className="text-[14px] font-bold">{currentIndex + 1}/{workout.exercises.length}</span>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Background number */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <span className="text-[35vw] font-black text-gray-100 dark:text-white/[0.03] leading-none select-none">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* Exercise info */}
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold uppercase tracking-widest text-lime-500 mb-2">Agora</p>
            <h2 className="text-[28px] font-bold leading-tight mb-3">{ex.name}</h2>
            <span className="inline-block text-[12px] font-semibold text-gray-400 dark:text-gray-500 bg-light-card dark:bg-dark-card px-3 py-1 rounded-lg border border-light-separator dark:border-dark-separator">
              Meta: {isCardio ? ex.target : ex.sets}
            </span>
          </div>

          {/* Input card */}
          <div className="bg-light-card dark:bg-dark-card rounded-2xl p-5 border border-light-separator dark:border-dark-separator">
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-lime-500 uppercase tracking-wider mb-1.5 block">
                  {isCardio ? 'Tempo (min)' : 'Carga (kg)'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val1}
                  onChange={(e) => setVal1(e.target.value)}
                  placeholder="0"
                  className="w-full h-14 bg-light-bg dark:bg-dark-surface rounded-xl px-4 text-3xl font-bold outline-none focus:ring-2 ring-lime-400 transition-shadow placeholder-gray-300 dark:placeholder-gray-600"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-lime-500 uppercase tracking-wider mb-1.5 block">
                  {isCardio ? 'Distância (km)' : 'Repetições'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val2}
                  onChange={(e) => setVal2(e.target.value)}
                  placeholder="0"
                  className="w-full h-14 bg-light-bg dark:bg-dark-surface rounded-xl px-4 text-3xl font-bold outline-none focus:ring-2 ring-lime-400 transition-shadow placeholder-gray-300 dark:placeholder-gray-600"
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full h-12 bg-lime-400 text-black rounded-xl font-bold text-[15px] uppercase tracking-wider active:scale-[0.98] transition-transform"
            >
              {isLast ? 'Concluir Treino' : 'Salvar & Próximo'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
