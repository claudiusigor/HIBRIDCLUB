import React, { useState } from 'react';
import { ArrowLeft, PencilLine } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function ProfileSetupScreen({
  email,
  initialDisplayName,
  isBusy,
  errorMessage,
  onBack,
  onSubmit,
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(displayName);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#F5F7FB] px-6 pb-10 pt-8 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
      <div className="absolute inset-0">
        <Iridescence
          color={[0.1, 0.4, 1]}
          mouseReact
          amplitude={0.06}
          speed={0.82}
          className="h-full w-full"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_34%),linear-gradient(180deg,rgba(245,247,251,0.4),rgba(245,247,251,0.18)_38%,rgba(245,247,251,0.84))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,rgba(10,13,20,0.18),rgba(10,13,20,0.18)_38%,rgba(10,13,20,0.74))]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col">
        <button
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
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
            Seu perfil
          </p>
          <h1 className="mt-3 text-[32px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">
            Como você gostaria de ser chamado?
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            Vamos usar esse nome na sua experiência dentro do app, no plano do dia e nos estados vazios.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-[30px] border border-black/[0.05] bg-white/84 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_20px_44px_rgba(0,0,0,0.3)]"
        >
          <div className="rounded-[24px] border border-black/[0.05] bg-[#F7F9FD] p-4 dark:border-white/[0.06] dark:bg-[#0D121C]">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Nome exibido no app
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#0A3CFF] dark:text-[#AFC5FF]">
                <PencilLine size={16} />
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Seu nome ou apelido"
                className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white pl-11 pr-4 text-[15px] font-medium text-gray-950 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400">
              Conta conectada: <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[#0A3CFF] px-4 text-[16px] font-semibold text-white shadow-[0_16px_30px_rgba(10,60,255,0.24)] transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
          >
            {isBusy ? 'Salvando nome...' : 'Entrar no app'}
          </button>

          <div className="mt-4 min-h-[44px]">
            {errorMessage ? (
              <p className="text-center text-[13px] leading-relaxed text-rose-600 dark:text-rose-300">
                {errorMessage}
              </p>
            ) : (
              <p className="text-center text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                Você pode mudar esse nome depois sem alterar sua ficha.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
