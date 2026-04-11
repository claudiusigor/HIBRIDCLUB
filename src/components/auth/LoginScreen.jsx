import React, { useState } from 'react';
import { ArrowLeft, Mail, Moon, MoveRight, Sun } from 'lucide-react';
import { signInWithGoogle, signInWithMagicLink } from '../../services/auth';
import Iridescence from '../effects/Iridescence';

export default function LoginScreen({
  authMessage,
  isBusy,
  isSupabaseConfigured,
  onBack,
  onAuthAction,
  isDark,
  onToggleTheme,
}) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [localMessage, setLocalMessage] = useState('');

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setLocalMessage('Digite um e-mail válido para receber o link.');
      return;
    }

    setLocalMessage('');
    await onAuthAction(async () => {
      await signInWithMagicLink(email.trim());
      setLocalMessage('Enviamos um link de acesso para o seu e-mail.');
    });
  };

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
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Entre com sua conta
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <button
            onClick={() => onAuthAction(signInWithGoogle)}
            disabled={!isSupabaseConfigured || isBusy}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#0A3CFF] px-4 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(10,60,255,0.26)] transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
          >
            <span className="text-[19px] leading-none">G</span>
            Entrar com Google
          </button>

          <div className="my-2 flex items-center gap-3">
            <span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.14]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">ou</span>
            <span className="h-px flex-1 bg-black/[0.12] dark:bg-white/[0.14]" />
          </div>

          <button
            onClick={() => setShowEmailForm((value) => !value)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.1] bg-white/92 px-4 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-[#F8FAFF] dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.12]"
          >
            <Mail size={16} />
            Entrar com e-mail
          </button>

          {showEmailForm && (
            <div className="rounded-2xl border border-black/[0.08] bg-white/88 p-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/[0.12] dark:bg-white/[0.06] dark:shadow-none">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="h-10 w-full rounded-lg border border-black/[0.1] bg-white px-3.5 text-[15px] font-medium text-gray-950 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-gray-500"
              />
              <button
                onClick={handleMagicLink}
                disabled={!isSupabaseConfigured || isBusy}
                className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0A3CFF] px-4 text-[14px] font-semibold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                Enviar link mágico
                <MoveRight size={16} />
              </button>
            </div>
          )}

          <div className="min-h-[22px] pt-1">
            {(localMessage || authMessage) && (
              <p className="text-center text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">
                {localMessage || authMessage}
              </p>
            )}
            {!isSupabaseConfigured && (
              <p className="text-center text-[12px] leading-relaxed text-amber-600 dark:text-amber-300">
                Configure o Supabase no `.env` para ativar Google, e-mail mágico e ficha por usuário.
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto pb-1 pt-6">
          <a
            href="https://instagram.com/instakoti"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-3 py-1.5 text-[11px] font-medium tracking-[0.01em] text-gray-600 backdrop-blur-md transition-colors hover:bg-white/90 dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.12]"
            aria-label="Abrir Instagram @instakoti"
          >
            <span className="opacity-80">Desenvolvido por</span>
            <span className="font-semibold text-gray-800 dark:text-gray-100">@instakoti</span>
          </a>
        </div>
      </div>
    </div>
  );
}
