import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, FileUp, Moon, Sun, UploadCloud } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

function getSessionSummary(plan) {
  if (!plan?.schedule) return [];
  return ['A', 'B', 'C', 'D', 'E', 'F'].map((dayId) => {
    const session = plan.schedule[dayId];
    return {
      dayId,
      count: session?.exercises?.length || 0,
      name: session?.name || `Sessão ${dayId}`,
    };
  });
}

export default function PlanImportScreen({
  onBack,
  onFileSelected,
  onSaveDraft,
  onPublish,
  isBusy,
  errorMessage,
  successMessage,
  parsedPlan,
  isDark,
  onToggleTheme,
}) {
  const [fileName, setFileName] = useState('');
  const summary = useMemo(() => getSessionSummary(parsedPlan), [parsedPlan]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    await onFileSelected(file);
  };

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
            <UploadCloud size={20} />
          </div>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#AFC5FF]">
            Importar ficha
          </p>
          <h1 className="mt-3 text-[30px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">
            Envie um SVG estruturado
          </h1>
          <p className="mx-auto mt-3 max-w-[18rem] text-[14px] leading-relaxed text-gray-700 dark:text-gray-400">
            O arquivo deve conter sessões A-F com exercícios e séries/alvos para força e cardio.
          </p>
        </div>

        <div className="mt-7 rounded-[30px] border border-black/[0.08] bg-white/92 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_20px_44px_rgba(0,0,0,0.3)]">
          <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0A3CFF] px-4 text-[15px] font-semibold text-white shadow-[0_16px_30px_rgba(10,60,255,0.24)]">
            <FileUp size={18} />
            Enviar SVG
            <input type="file" accept=".svg,image/svg+xml" className="hidden" onChange={handleFileChange} />
          </label>

          {fileName && <p className="mt-3 text-center text-[12px] text-gray-700 dark:text-gray-400">Arquivo: {fileName}</p>}

          {parsedPlan && (
            <div className="mt-4 rounded-[22px] border border-black/[0.08] bg-[#F7F9FD] p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                Pré-visualização
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {summary.map((item) => (
                  <div key={item.dayId} className="rounded-xl bg-white px-3 py-2 dark:bg-white/[0.06]">
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-400">
                      {item.dayId} - {item.name}
                    </p>
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">{item.count} exercícios</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              disabled={!parsedPlan || isBusy}
              onClick={onSaveDraft}
              className="h-12 rounded-2xl border border-black/[0.08] bg-white text-[14px] font-semibold text-gray-700 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-200"
            >
              Salvar rascunho
            </button>
            <button
              disabled={!parsedPlan || isBusy}
              onClick={onPublish}
              className="h-12 rounded-2xl bg-[#0A3CFF] text-[14px] font-semibold text-white shadow-[0_12px_24px_rgba(10,60,255,0.25)] disabled:opacity-50"
            >
              Publicar
            </button>
          </div>

          <div className="mt-4 min-h-[48px]">
            {errorMessage ? (
              <p className="flex items-center justify-center gap-2 text-center text-[13px] text-rose-600 dark:text-rose-300">
                <AlertCircle size={14} />
                {errorMessage}
              </p>
            ) : successMessage ? (
              <p className="flex items-center justify-center gap-2 text-center text-[13px] text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 size={14} />
                {successMessage}
              </p>
            ) : (
              <p className="text-center text-[13px] leading-relaxed text-gray-700 dark:text-gray-400">
                Se o SVG não for aceito, selecione um plano padrão e edite depois.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
