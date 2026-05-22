import React, { useMemo, useState } from 'react';
import { ArrowRight, Dumbbell, Footprints, Moon, Sun } from 'lucide-react';
import Iridescence from '../effects/Iridescence';

export default function OnboardingScreen({ onContinue, isDark, onToggleTheme }) {
  const [step, setStep] = useState(0);
  const totalSteps = 3;

  const slides = useMemo(
    () => [
      {
        kind: 'brand',
      },
      {
        kind: 'value',
        kicker: 'HÍBRIDO DE VERDADE',
        title: 'Corrida e musculação na mesma rotina',
        description: 'Tenha uma experiência completa para evoluir no asfalto e na força, sem perder clareza no dia a dia.',
        points: ['Plano diário organizado', 'Execução rápida por sessão', 'Acompanhamento contínuo'],
      },
      {
        kind: 'athlete',
        kicker: 'FOCO NO ATLETA',
        title: 'Feito para quem quer performance com consistência',
        description:
          'Ajuste ficha, acompanhe histórico e mantenha evolução sustentável com uma jornada simples e inteligente.',
        points: ['Corrida com técnica', 'Treino de força estruturado', 'Progressão sem confusão'],
      },
    ],
    []
  );

  const handleNext = () => {
    if (step >= totalSteps - 1) {
      onContinue();
      return;
    }
    setStep((value) => value + 1);
  };

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
      <button
        onClick={onToggleTheme}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className="absolute right-6 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.06] bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-colors dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300 dark:shadow-none"
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        {step > 0 && (
          <div className="pt-7 text-center">
            <div className="flex justify-center">
              <img
                src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
                alt="Hibrid Club"
                width="260"
                height="174"
                className="h-auto max-h-[92px] w-auto object-contain"
              />
            </div>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full min-h-[430px]">
            {slides.map((slide, index) => {
              const isActive = index === step;
              const isPast = index < step;
              return (
                <div
                  key={slide.kind}
                  className={`absolute inset-0 transition-all duration-300 ease-out ${
                    isActive
                      ? 'translate-x-0 opacity-100'
                      : isPast
                        ? '-translate-x-8 opacity-0 pointer-events-none'
                        : 'translate-x-8 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    {slide.kind === 'brand' ? (
                      <>
                        <p className="mb-2 text-[13px] font-light tracking-[0.01em] text-gray-500 dark:text-gray-400">
                          Bem-vindo ao
                        </p>
                        <div className="relative flex items-center justify-center">
                          <img
                            src={`${import.meta.env.BASE_URL}HYBRIDCLUBBANNER.png`}
                            alt="Hibrid Club"
                            width="360"
                            height="240"
                            className="relative h-auto w-[min(72vw,280px)] object-contain"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="w-full rounded-[30px] border border-black/[0.08] bg-white/84 px-5 py-7 text-center shadow-[0_20px_44px_rgba(15,23,42,0.1)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_20px_44px_rgba(0,0,0,0.3)]">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A3CFF]/12 text-[#0A3CFF] dark:bg-[#0A3CFF]/24 dark:text-[#AFC5FF]">
                          {slide.kind === 'value' ? <Footprints size={20} /> : <Dumbbell size={20} />}
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A3CFF] dark:text-[#AFC5FF]">
                          {slide.kicker}
                        </p>
                        <h2 className="mt-3 text-[31px] font-black leading-[1.05] tracking-[-0.04em] text-gray-950 dark:text-white">
                          {slide.title}
                        </h2>
                        <p className="mx-auto mt-4 max-w-[18rem] text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                          {slide.description}
                        </p>
                        <div className="mt-5 grid gap-2">
                          {slide.points.map((point) => (
                            <div
                              key={point}
                              className="rounded-xl border border-black/[0.08] bg-[#F7F9FD] px-3 py-2 text-[13px] font-medium text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-200"
                            >
                              {point}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pb-1 pt-4" style={{ animation: 'authFadeUp 220ms ease-out both 40ms' }}>
          <div className="mb-3 flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? 'w-5 bg-[#0A3CFF] dark:bg-[#AFC5FF]'
                    : 'w-1.5 bg-black/20 dark:bg-white/25'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="group relative flex h-16 w-full items-center justify-center overflow-hidden rounded-[28px] border border-white/45 bg-white/18 px-5 text-[16px] font-semibold tracking-[-0.02em] text-gray-950 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-[28px] transition-all duration-300 active:scale-[0.99] dark:border-white/[0.16] dark:bg-white/[0.08] dark:text-white dark:shadow-[0_20px_44px_rgba(0,0,0,0.34)]"
            aria-label="Continuar para o login"
          >
            <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/40" />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.1))] opacity-95 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.03))]" />
            <span className="absolute inset-[1px] rounded-[27px] border border-black/[0.03] dark:border-white/[0.06]" />
            <span className="relative flex items-center justify-center">
              <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
