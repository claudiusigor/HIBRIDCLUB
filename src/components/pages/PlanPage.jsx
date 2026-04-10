import React from 'react';
import { Droplets, Flame, Dumbbell, Activity, FileText } from 'lucide-react';
import { workoutPlan } from '../../data/workoutPlan';

const DAY_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function PlanPage() {
  const sessions = DAY_ORDER.map((dayId) => workoutPlan.schedule[dayId]).filter(Boolean);

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0A3CFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
            <FileText size={12} />
            Transcrito do PDF
          </span>
        </div>
        <h2 className="mt-3 text-[32px] font-bold tracking-[-0.04em] text-gray-950 dark:text-white">Plano Híbrido</h2>
        <p className="mt-2 max-w-[36rem] text-[14px] leading-relaxed text-gray-500 dark:text-gray-400">
          Conteúdo estruturado a partir de {workoutPlan.metadata.sourceFile}, organizado para consulta rápida no app.
        </p>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3">
        <OverviewCard icon={<Dumbbell size={18} />} label="Foco" value={workoutPlan.general.focus} />
        <OverviewCard icon={<Flame size={18} />} label="TDEE" value={`${workoutPlan.general.tdee} kcal`} />
        <OverviewCard
          icon={<Droplets size={18} />}
          label="Água"
          value={`${workoutPlan.general.waterRecommendedLiters.min.toFixed(1)}-${workoutPlan.general.waterRecommendedLiters.max.toFixed(1)}L`}
        />
        <OverviewCard icon={<Activity size={18} />} label="Sessões" value={`${sessions.length} dias`} />
      </section>

      <section className="mb-4 overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
        <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Objetivo do ciclo</p>
          <p className="mt-2 text-[18px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{workoutPlan.general.objective}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{workoutPlan.general.strategy}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-4">
          <InfoRow label="Calorias alvo" value={`${workoutPlan.general.calorieTarget.min}-${workoutPlan.general.calorieTarget.max} kcal/dia`} />
          <InfoRow
            label="Hidratação base"
            value={`${workoutPlan.general.waterBaseLiters.min.toFixed(1)}-${workoutPlan.general.waterBaseLiters.max.toFixed(1)} L/dia`}
          />
          <InfoRow
            label="Hidratação recomendada"
            value={`${workoutPlan.general.waterRecommendedLiters.min.toFixed(1)}-${workoutPlan.general.waterRecommendedLiters.max.toFixed(1)} L/dia`}
          />
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-2">
        {workoutPlan.general.operationalRules.map((rule) => (
          <div
            key={rule}
            className="rounded-[22px] border border-black/[0.05] bg-white px-4 py-3 text-[13px] leading-relaxed text-gray-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-gray-300 dark:shadow-none"
          >
            {rule}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {sessions.map((session) => (
          <section
            key={session.id}
            className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none"
          >
            <div className="border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center rounded-full bg-[#0A3CFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
                    {session.id} - {session.day}
                  </span>
                  <p className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-gray-950 dark:text-white">{session.name}</p>
                  <p className="mt-1 text-[13px] font-medium text-gray-500 dark:text-gray-400">{session.type}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">{session.summary}</p>
                </div>
                <div className="rounded-2xl bg-[#F4F7FF] px-3 py-2 text-right dark:bg-white/[0.06]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Exercícios</p>
                  <p className="mt-1 text-[18px] font-bold text-gray-950 dark:text-white">{session.exercises.length}</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {session.exercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{exercise.name}</p>
                    <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                      {exercise.type === 'cardio' ? 'Cardio' : 'Força'}
                    </p>
                    {exercise.note && (
                      <p className="mt-1 text-[12px] leading-relaxed text-[#0A3CFF] dark:text-[#AFC5FF]">{exercise.note}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-bold text-gray-950 dark:text-white">
                      {exercise.type === 'cardio' ? exercise.target : exercise.sets}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-gray-500 dark:text-gray-400">
                      {exercise.type === 'cardio' ? 'Meta do bloco' : 'Séries e reps'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OverviewCard({ icon, label, value }) {
  return (
    <div className="rounded-[24px] border border-black/[0.05] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A3CFF]/10 text-[#0A3CFF] dark:bg-[#0A3CFF]/20 dark:text-[#AFC5FF]">
        {icon}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-[18px] font-bold leading-tight tracking-[-0.03em] text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#F7F9FD] px-4 py-3 dark:bg-white/[0.04]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-right text-[14px] font-bold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}
