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
  const progressTone = progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#0A3CFF]';
  const strengthCount = workout.exercises?.filter((exercise) => exercise.type !== 'cardio').length || 0;
  const cardioCount = workout.exercises?.filter((exercise) => exercise.type === 'cardio').length || 0;
  const planState = progressPercent >= 100 ? 'Concluído' : loggedExercises > 0 ? 'Em andamento' : 'Pronto';
  const activitySummary = [
    strengthCount ? `${strengthCount} ${strengthCount === 1 ? 'exercício de força' : 'exercícios de força'}` : null,
    cardioCount ? `${cardioCount} ${cardioCount === 1 ? 'bloco de corrida' : 'blocos de corrida'}` : null,
  ].filter(Boolean);

  return (
    <div className="hc-surface-hero relative overflow-hidden rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_6px_8px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/[0.055] dark:shadow-none">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0A3CFF] via-[#4D7BFF] to-transparent opacity-80 dark:opacity-70" />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`hc-label inline-flex items-center rounded-full px-3 py-1 ${
                isCardioDay
                  ? 'bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]'
                  : 'bg-black/[0.05] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300'
              }`}
            >
              {workout.type}
            </span>
            <span className="hc-label text-gray-400 dark:text-gray-500">{workout.id || 'Sessão'}</span>
          </div>

          <h2 className="hc-heading mt-2.5 text-[1.375rem] leading-[1.12] tracking-[-0.025em] text-gray-950 dark:text-white">
            {workout.name}
          </h2>
          <p className="mt-1.5 max-w-[34ch] text-[0.875rem] leading-6 text-gray-600 dark:text-gray-400">{objectiveText}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-black/[0.045] bg-white/58 p-3 dark:border-white/[0.07] dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {activitySummary.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-black/[0.055] bg-black/[0.022] px-2.5 py-1 text-[0.75rem] font-semibold leading-none text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.055] dark:text-gray-300"
              >
                {item}
              </span>
            ))}
          </div>
          <span
            className={`hc-label shrink-0 rounded-full px-2.5 py-1 ${
              progressPercent >= 100
                ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300'
                : 'bg-black/[0.045] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300'
            }`}
          >
            {planState}
          </span>
        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]">
          <div
            className={`hc-progress-fill h-full rounded-full ${progressTone} transition-[width] duration-200`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-[18px] bg-[#F6F8FD]/82 px-3 py-3 dark:bg-white/[0.045]">
        {StatusIcon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${statusToneClass}`}>
            <StatusIcon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="hc-heading text-[0.95rem] leading-tight tracking-[-0.012em] text-gray-950 dark:text-white">{statusTitle}</p>
          <p className="mt-1 text-[0.8125rem] leading-5 text-gray-600 dark:text-gray-400">{statusDescription}</p>
        </div>
      </div>
    </div>
  );
}
