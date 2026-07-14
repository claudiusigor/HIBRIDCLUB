import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

export default function TrainingCard({
  workout,
  objectiveText,
  loggedExercises = 0,
  targetExercises = 0,
  onStartWorkout,
}) {
  if (!workout) return null;

  const isCardioDay = workout.type === 'Cardio';
  const progressPercent = targetExercises > 0 ? Math.min(100, Math.round((loggedExercises / targetExercises) * 100)) : 0;
  const progressTone = progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#0A3CFF]';
  const strengthCount = workout.exercises?.filter((exercise) => exercise.type !== 'cardio').length || 0;
  const cardioCount = workout.exercises?.filter((exercise) => exercise.type === 'cardio').length || 0;
  const planState = progressPercent >= 100 ? 'Concluído' : loggedExercises > 0 ? 'Continuar treino' : 'Pronto para começar';
  const activitySummary = [
    strengthCount ? `${strengthCount} ${strengthCount === 1 ? 'exercício de força' : 'exercícios de força'}` : null,
    cardioCount ? `${cardioCount} ${cardioCount === 1 ? 'bloco de corrida' : 'blocos de corrida'}` : null,
  ].filter(Boolean);

  return (
    <div className="hc-surface-hero hc-glass relative overflow-hidden rounded-[22px] border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.055]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0A3CFF] via-[#4D7BFF] to-transparent opacity-80 dark:opacity-70" />

      <div className="min-w-0">
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
        <p className="hc-workout-objective mt-1.5 max-w-[34ch] text-[0.8125rem] leading-5 text-gray-600 dark:text-gray-400">{objectiveText}</p>
      </div>

      <div className="mt-4 border-y border-black/[0.055] py-3 dark:border-white/[0.08]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            {activitySummary.map((item) => (
              <span
                key={item}
                className="inline-flex items-center text-[0.75rem] font-semibold leading-none text-gray-600 before:mr-1.5 before:h-1 before:w-1 before:rounded-full before:bg-[#0A3CFF] dark:text-gray-300"
              >
                {item}
              </span>
            ))}
          </div>
          <span className="hc-numeric shrink-0 text-[0.75rem] font-bold text-gray-700 dark:text-gray-200">
            {loggedExercises}/{targetExercises}
          </span>
        </div>

        {progressPercent > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.1]">
            <div
              className={`hc-progress-fill h-full rounded-full ${progressTone} transition-[width] duration-200`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {progressPercent < 100 && (
        <button type="button" className="hc-workout-start" onClick={onStartWorkout}>
          <span className="hc-workout-start__icon"><Play size={15} fill="currentColor" aria-hidden="true" /></span>
          <span>{loggedExercises > 0 ? 'Continuar treino' : 'Começar treino'}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
