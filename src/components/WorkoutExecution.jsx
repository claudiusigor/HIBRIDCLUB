import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { saveWorkoutLog } from '../services/storage';

const PRIMARY_BLUE = '#0A3CFF';

export default function WorkoutExecution({ workout, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [saveError, setSaveError] = useState('');

  if (!workout?.exercises?.length) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
        <button onClick={onClose} className="font-semibold text-[#0A3CFF] dark:text-[#8FB1FF]">
          Nenhum exercício. Voltar.
        </button>
      </div>
    );
  }

  const ex = workout.exercises[currentIndex];
  const isCardio = ex.type === 'cardio';
  const isLast = currentIndex === workout.exercises.length - 1;

  const handleNext = async () => {
    setSaveError('');

    if (val1 && val2) {
      const didSave = await saveWorkoutLog(workout.id, ex.id, {
        kind: isCardio ? 'cardio' : 'strength',
        primary: Number(val1),
        secondary: Number(val2),
        primaryUnit: isCardio ? 'min' : 'kg',
        secondaryUnit: isCardio ? 'km' : 'reps',
      });

      if (!didSave) {
        setSaveError('Não foi possível salvar agora. Tente novamente.');
        return;
      }
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
      <header className="flex items-center justify-between p-5">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[14px] font-semibold active:opacity-60"
        >
          <ChevronLeft size={18} /> Sair
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A3CFF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#8FB1FF]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A3CFF] dark:bg-[#8FB1FF] animate-pulse" />
          Em progresso
        </span>
        <span className="text-[14px] font-bold text-gray-900 dark:text-white">
          {currentIndex + 1}/{workout.exercises.length}
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <span className="text-[35vw] font-black text-[#0A3CFF]/[0.05] dark:text-white/[0.03] leading-none select-none">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#0A3CFF] dark:text-[#8FB1FF]">Agora</p>
            <h2 className="mb-3 text-[28px] font-bold leading-tight text-gray-950 dark:text-white">{ex.name}</h2>
            <span className="inline-flex items-center rounded-full border border-[#0A3CFF]/10 bg-[#0A3CFF]/6 px-3 py-1 text-[12px] font-semibold text-[#0A3CFF] dark:border-[#8FB1FF]/10 dark:bg-white/[0.04] dark:text-[#B6CBFF]">
              Meta: {isCardio ? ex.target : ex.sets}
            </span>
          </div>

          <div className="rounded-[28px] border border-[#0A3CFF]/10 bg-white/80 p-5 shadow-[0_18px_50px_rgba(10,60,255,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#0A3CFF] dark:text-[#8FB1FF]">
                  {isCardio ? 'Tempo (min)' : 'Carga (kg)'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val1}
                  onChange={(e) => setVal1(e.target.value)}
                  placeholder="0"
                  className="h-14 w-full rounded-2xl border border-[#0A3CFF]/10 bg-[#F7F9FF] px-4 text-3xl font-bold text-gray-950 outline-none transition-shadow placeholder-gray-300 focus:ring-2 focus:ring-[#0A3CFF]/25 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder-gray-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-[#0A3CFF] dark:text-[#8FB1FF]">
                  {isCardio ? 'Distância (km)' : 'Repetições'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val2}
                  onChange={(e) => setVal2(e.target.value)}
                  placeholder="0"
                  className="h-14 w-full rounded-2xl border border-[#0A3CFF]/10 bg-[#F7F9FF] px-4 text-3xl font-bold text-gray-950 outline-none transition-shadow placeholder-gray-300 focus:ring-2 focus:ring-[#0A3CFF]/25 dark:border-white/10 dark:bg-dark-surface dark:text-white dark:placeholder-gray-600"
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              style={{ backgroundColor: PRIMARY_BLUE }}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_16px_30px_rgba(10,60,255,0.28)] transition-all active:scale-[0.98] hover:brightness-110"
            >
              {isLast ? 'Concluir treino' : 'Salvar e próximo'}
            </button>
            {saveError && <p className="mt-3 text-center text-[13px] font-medium text-rose-600 dark:text-rose-300">{saveError}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
