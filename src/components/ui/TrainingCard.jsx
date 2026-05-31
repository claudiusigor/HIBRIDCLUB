import React from 'react';

export default function TrainingCard({
  workout,
  StatusIcon,
  statusTitle,
  statusDescription,
  statusToneClass,
  objectiveText,
  loggedExercises = 0,
  targetExercises = 0,
}) {
  if (!workout) return null;

  const isCardioDay = workout.type === 'Cardio';
  const progressPercent = targetExercises > 0 ? Math.min(100, Math.round((loggedExercises / targetExercises) * 100)) : 0;
  const remainingExercises = Math.max(targetExercises - loggedExercises, 0);
  const completionCue =
    progressPercent >= 100
      ? 'Sessão fechada com consistência.'
      : loggedExercises > 0
        ? `${remainingExercises} ${remainingExercises === 1 ? 'registro' : 'registros'} para fechar o bloco.`
        : 'Primeiro registro libera o ritmo do treino.';
  const progressTone = progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#0A3CFF]';

  return (
    <div className="hc-surface-hero relative overflow-hidden rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_6px_8px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/[0.055] dark:shadow-none">
      <span
        className={`hc-label inline-flex items-center rounded-full px-3 py-1 ${
          isCardioDay
            ? 'bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]'
            : 'bg-black/[0.05] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300'
        }`}
      >
        {workout.type}
      </span>
      <h2 className="hc-heading mt-2.5 text-[1.375rem] leading-[1.12] tracking-[-0.025em] text-gray-950 dark:text-white">
        {workout.name}
      </h2>
      <p className="mt-1.5 max-w-[34ch] text-[0.875rem] leading-6 text-gray-600 dark:text-gray-400">{objectiveText}</p>

      <div className="hc-info-panel mt-4 rounded-2xl bg-[#F6F8FD] p-3 dark:bg-white/[0.05]">
        <div className="flex items-start gap-3">
          {StatusIcon && (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${statusToneClass}`}>
              <StatusIcon size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hc-label text-gray-500 dark:text-gray-400">Status do dia</p>
                <p className="hc-heading mt-1 text-[1rem] leading-tight tracking-[-0.015em] text-gray-950 dark:text-white">{statusTitle}</p>
              </div>
              <div className="text-right">
                <p className="hc-label text-gray-500 dark:text-gray-400">Feitos</p>
                <p className="hc-heading hc-numeric mt-1 text-[1rem] leading-tight tracking-[-0.015em] text-gray-950 dark:text-white">
                  {loggedExercises}/{targetExercises}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.875rem] leading-6 text-gray-600 dark:text-gray-400">{statusDescription}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.1]">
              <div
                className={`hc-progress-fill h-full rounded-full ${progressTone} transition-[width] duration-200`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="hc-label text-gray-500 dark:text-gray-400">Próximo marco</span>
              <span className="text-right text-[0.75rem] font-semibold leading-snug text-gray-700 dark:text-gray-200">{completionCue}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
