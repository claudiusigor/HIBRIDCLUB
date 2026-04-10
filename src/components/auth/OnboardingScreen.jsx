import React from 'react';
import { ArrowRight } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function OnboardingScreen({ onContinue }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#F5F7FB] px-6 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-8 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
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
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <img
                src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
                alt="Hibrid Club"
                width="360"
                height="240"
                className="relative h-auto w-[min(72vw,280px)] object-contain"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onContinue}
            className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/45 bg-white/18 px-5 text-[16px] font-semibold tracking-[-0.02em] text-gray-950 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-[28px] transition-all duration-300 active:scale-[0.99] dark:border-white/[0.16] dark:bg-white/[0.08] dark:text-white dark:shadow-[0_20px_44px_rgba(0,0,0,0.34)]"
            aria-label="Continuar para o login"
          >
            <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/40" />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.1))] opacity-95 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))]" />
            <span className="absolute inset-[1px] rounded-[27px] border border-black/[0.03] dark:border-white/[0.06]" />
            <span className="relative flex items-center gap-2">
              Continuar
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
