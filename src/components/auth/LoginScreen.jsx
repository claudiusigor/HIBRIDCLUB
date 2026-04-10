import React, { useState } from 'react';
import { ArrowLeft, Mail, MoveRight } from 'lucide-react';
import { signInWithGoogle, signInWithMagicLink } from '../../services/auth';
import Iridescence from '../effects/Iridescence';

export default function LoginScreen({ authMessage, isBusy, isSupabaseConfigured, onBack, onAuthAction }) {
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
        <Iridescence
          color={[0.1, 0.4, 1]}
          mouseReact
          amplitude={0.08}
          speed={0.9}
          className="h-full w-full"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.42),transparent_34%),linear-gradient(180deg,rgba(245,247,251,0.42),rgba(245,247,251,0.18)_38%,rgba(245,247,251,0.82))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,rgba(10,13,20,0.18),rgba(10,13,20,0.18)_38%,rgba(10,13,20,0.72))]" />

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
            Sua conta
          </p>
          <h1 className="mt-3 text-[32px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">
            Entre e use sua própria ficha
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            Mantemos o mesmo fluxo do app, mas agora cada usuário entra com sua conta e recebe seu plano pessoal.
          </p>
        </div>

        <div className="mt-8 rounded-[30px] border border-black/[0.05] bg-white/84 p-5 shadow-[0_20px_44px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_20px_44px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => onAuthAction(signInWithGoogle)}
            disabled={!isSupabaseConfigured || isBusy}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0A3CFF] px-4 text-[16px] font-semibold text-white shadow-[0_16px_30px_rgba(10,60,255,0.24)] transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
          >
            <span className="text-[20px] leading-none">G</span>
            Entrar com Google
          </button>

          <button
            onClick={() => setShowEmailForm((value) => !value)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-[#F7F9FD] px-4 py-3 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.07]"
          >
            <Mail size={16} />
            Entrar com e-mail
          </button>

          {showEmailForm && (
            <div className="mt-4 rounded-[24px] border border-black/[0.05] bg-[#F7F9FD] p-4 dark:border-white/[0.06] dark:bg-[#0D121C]">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                E-mail para receber o link
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white px-4 text-[15px] font-medium text-gray-950 outline-none transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-[#0A3CFF]/20 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-gray-500"
              />
              <button
                onClick={handleMagicLink}
                disabled={!isSupabaseConfigured || isBusy}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0A3CFF] px-4 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(10,60,255,0.22)] transition-transform disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
              >
                Enviar link mágico
                <MoveRight size={16} />
              </button>
            </div>
          )}

          <div className="mt-4 min-h-[44px]">
            {(localMessage || authMessage) && (
              <p className="text-center text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                {localMessage || authMessage}
              </p>
            )}
            {!isSupabaseConfigured && (
              <p className="text-center text-[13px] leading-relaxed text-amber-600 dark:text-amber-300">
                Configure o Supabase no `.env` para ativar Google, e-mail mágico e ficha por usuário.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
