import React from 'react';
import { ArrowLeft, FileUp, ListChecks, Moon, Sun } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function PlanStartScreen({
  onBack,
  onSelectImport,
  onSelectDefault,
  isBusy,
  message,
  isDark,
  onToggleTheme,
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#F5F7FB] px-6 pb-10 pt-8 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
      <div className="absolute inset-0">
        <Iridescence color={[0.1, 0.4, 1]} mouseReact amplitude={0.08} speed={0.9} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42),transparent_34%),linear-gradient(180deg,rgba(245,247,251,0.42),rgba(245,247,251,0.18)_38%,rgba(245,247,251,0.82))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,rgba(10,13,20,0.18),rgba(10,13,20,0.18)_38%,rgba(10,13,20,0.72))]" />
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
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#AFC5FF]">
            Configuração inicial
          </p>
          <h1 className="mt-3 text-[31px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">
            Como você quer montar sua ficha?
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            Importe seu plano em SVG estruturado ou comece com um plano padrão progressivo.
          </p>
        </div>

        <div className="mt-8 rounded-[30px] border border-black/[0.05] bg-white/84 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_20px_44px_rgba(0,0,0,0.3)]">
          <button
            onClick={onSelectImport}
            disabled={isBusy}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0A3CFF] px-4 text-[16px] font-semibold text-white shadow-[0_16px_30px_rgba(10,60,255,0.24)] disabled:opacity-50"
          >
            <FileUp size={18} />
            Importar minha ficha
          </button>

          <button
            onClick={onSelectDefault}
            disabled={isBusy}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-[#F7F9FD] px-4 text-[15px] font-semibold text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200"
          >
            <ListChecks size={18} />
            Usar plano padrão
          </button>

          <div className="mt-4 min-h-[42px]">
            <p className="text-center text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              {message || 'Depois você poderá editar dias, treinos e corrida do jeito que preferir.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
