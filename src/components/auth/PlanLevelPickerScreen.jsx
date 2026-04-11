import React from 'react';
import { ArrowLeft, ArrowRight, Moon, Sun, Trophy } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function PlanLevelPickerScreen({
  templates,
  onBack,
  onSelectTemplate,
  isBusy,
  selectedSlug,
  message,
  isDark,
  onToggleTheme,
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#F5F7FB] px-6 pb-10 pt-8 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
      <div className="absolute inset-0">
        <Iridescence color={[0.1, 0.4, 1]} mouseReact amplitude={0.08} speed={0.9} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.56),transparent_34%),linear-gradient(180deg,rgba(245,247,251,0.5),rgba(245,247,251,0.26)_38%,rgba(245,247,251,0.9))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,rgba(10,13,20,0.18),rgba(10,13,20,0.18)_38%,rgba(10,13,20,0.72))]" />
      <button
        onClick={onToggleTheme}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className="absolute right-6 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col">
        <button
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="mt-7 text-center">
          <div className="flex justify-center">
            <img
              src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
              alt="Hibrid Club"
              width="260"
              height="174"
              className="h-auto max-h-[92px] w-auto object-contain"
            />
          </div>
          <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/12 text-[#0A3CFF] dark:bg-[#0A3CFF]/24 dark:text-[#AFC5FF]">
            <Trophy size={20} />
          </div>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#AFC5FF]">
            Plano padrão
          </p>
          <h1 className="mt-3 text-[31px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">
            Escolha seu nível inicial
          </h1>
        </div>

        <div className="mt-7 space-y-3">
          {(templates || []).map((template) => {
            const isSelected = selectedSlug === template.slug;
            return (
              <button
                key={template.slug}
                disabled={isBusy}
                onClick={() => onSelectTemplate(template.slug)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all dark:shadow-none ${
                  isSelected
                    ? 'border-[#0A3CFF]/50 bg-[#0A3CFF]/12 dark:border-[#AFC5FF]/45 dark:bg-[#0A3CFF]/18'
                    : 'border-black/[0.08] bg-white/92 dark:border-white/[0.08] dark:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-gray-950 dark:text-white">{template.name}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-gray-700 dark:text-gray-400">{template.description}</p>
                  </div>
                  <ArrowRight size={16} className={isSelected ? 'text-[#0A3CFF] dark:text-[#AFC5FF]' : 'text-gray-400'} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 min-h-[42px]">
          <p className="text-center text-[13px] leading-relaxed text-gray-700 dark:text-gray-400">
            {message || 'Você poderá editar completamente este plano depois.'}
          </p>
        </div>
      </div>
    </div>
  );
}
