import React, { useState } from 'react';
import { ArrowLeft, Check, Moon, Sun } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function ProfileSetupScreen({
  email: _email,
  initialDisplayName,
  isBusy,
  errorMessage,
  onBack,
  onSubmit,
  isDark,
  onToggleTheme,
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [localError, setLocalError] = useState('');
  const displayNameId = 'profile-display-name';
  const displayNameHintId = 'profile-display-name-hint';
  const fieldError = localError || errorMessage;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextName = displayName.trim();

    if (!nextName) {
      setLocalError('Digite o nome que você quer ver no app.');
      return;
    }

    setLocalError('');
    await onSubmit(nextName);
  };

  return (
    <div className="hc-auth-safe-screen relative min-h-[100dvh] overflow-hidden bg-[#F5F7FB] px-6 pb-10 pt-8 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
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
      <button
        onClick={onToggleTheme}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className="hc-auth-safe-top-action absolute right-6 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col">
        <button
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="mt-7 text-center" style={{ animation: 'authFadeUp 220ms ease-out both' }}>
          <div className="flex justify-center">
            <img
              src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
              alt="Hibrid Club"
              width="260"
              height="174"
              className="h-auto max-h-[92px] w-auto object-contain"
            />
          </div>
          <h1 className="mt-6 text-[30px] font-black leading-tight tracking-[-0.04em] text-gray-950 dark:text-white">
            Como você gostaria de ser chamado?
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-10" style={{ animation: 'authFadeUp 220ms ease-out both 40ms' }}>
          <div>
            <label htmlFor={displayNameId} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Nome no app
            </label>
            <div className="relative">
              <input
                id={displayNameId}
                type="text"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  if (localError) setLocalError('');
                }}
                placeholder="Seu nome"
                autoComplete="name"
                maxLength={80}
                required
                aria-describedby={displayNameHintId}
                aria-invalid={Boolean(fieldError) || undefined}
                className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white/92 px-4 pr-14 text-[16px] font-medium text-gray-950 outline-none transition-shadow placeholder:text-gray-500 focus:ring-2 focus:ring-[#0A3CFF]/24 dark:border-white/[0.08] dark:bg-white/[0.08] dark:text-white dark:placeholder:text-gray-500"
              />
              <button
                type="submit"
                disabled={isBusy}
                aria-label="Confirmar nome"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-[#0A3CFF] text-white shadow-[0_8px_14px_rgba(10,60,255,0.2)] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3CFF] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
          <p id={displayNameHintId} className="mt-2 text-center text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
            Você pode alterar esse nome depois no perfil.
          </p>

          <div className="mt-3 min-h-[24px]">
            {fieldError ? (
              <p role="alert" className="text-center text-[13px] leading-relaxed text-rose-600 dark:text-rose-300">
                {fieldError}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
