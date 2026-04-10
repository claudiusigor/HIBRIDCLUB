import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import Dashboard from '../Dashboard';
import OnboardingScreen from './OnboardingScreen';
import LoginScreen from './LoginScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import PlanStartScreen from './PlanStartScreen';
import PlanLevelPickerScreen from './PlanLevelPickerScreen';
import PlanImportScreen from './PlanImportScreen';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { clearLocalSession, getCurrentSession, onAuthStateChange, signOutUser } from '../../services/auth';
import {
  createUserPlanFromTemplate,
  ensureUserPlan,
  importPlanFromSvg,
  listPlanTemplates,
  publishUserPlanDraft,
  saveUserPlanDraft,
} from '../../services/plans';
import {
  completeUserProfile,
  deriveDisplayNameFromUser,
  getProfile,
  ensureUserProfile,
  isProfileSetupComplete,
} from '../../services/profile';
import { setStorageScope } from '../../services/storage';

const ONBOARDING_STORAGE_KEY = 'hyperactive-onboarding-seen';
const PLAN_PREPARE_TIMEOUT_MS = 12000;
const PLAN_CACHE_PREFIX = 'hibrid-plan-cache:';
const PROFILE_CACHE_PREFIX = 'hibrid-profile-cache:';
const THEME_STORAGE_KEY = 'hyperactive-theme';
const DARK_THEME_COLOR = '#0A0D14';
const LIGHT_THEME_COLOR = '#F5F7FB';

const STAGES = {
  LOADING_SESSION: 'loading_session',
  RESTORING_CACHED_PLAN: 'restoring_cached_plan',
  PREPARING_PROFILE: 'preparing_profile',
  PREPARE_ERROR: 'prepare_error',
  NEEDS_PROFILE_SETUP: 'needs_profile_setup',
  PLAN_SETUP: 'plan_setup',
  PLAN_LEVEL_PICKER: 'plan_level_picker',
  PLAN_IMPORT: 'plan_import',
  APP: 'app',
  AUTH_ERROR: 'auth_error',
  AUTH: 'auth',
  ONBOARDING: 'onboarding',
};

function getInitialStage() {
  if (typeof window === 'undefined') {
    return STAGES.LOADING_SESSION;
  }

  return STAGES.ONBOARDING;
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function getCacheKey(prefix, userId) {
  return `${prefix}${userId}`;
}

function readSessionCache(prefix, userId) {
  if (typeof window === 'undefined' || !userId) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getCacheKey(prefix, userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(prefix, userId, value) {
  if (typeof window === 'undefined' || !userId || !value) {
    return;
  }

  try {
    window.sessionStorage.setItem(getCacheKey(prefix, userId), JSON.stringify(value));
  } catch {
    // ignore cache write failures
  }
}

function clearSessionCache(prefix, userId) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  try {
    window.sessionStorage.removeItem(getCacheKey(prefix, userId));
  } catch {
    // ignore cache cleanup failures
  }
}

function getSetupDisplayName(profile, user) {
  return profile?.display_name || deriveDisplayNameFromUser(user);
}

function getInitialTheme() {
  if (typeof window === 'undefined') return true;
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light') return false;
  if (savedTheme === 'dark') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function AuthGate() {
  const [stage, setStage] = useState(STAGES.LOADING_SESSION);
  const [session, setSession] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [profileSetupMode, setProfileSetupMode] = useState('required');
  const [prepareRetryNonce, setPrepareRetryNonce] = useState(0);
  const [planTemplates, setPlanTemplates] = useState([]);
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState('hibrid-club-basic');
  const [importedPlanDraft, setImportedPlanDraft] = useState(null);
  const [planSetupMessage, setPlanSetupMessage] = useState('');
  const [isDark, setIsDark] = useState(getInitialTheme);

  const preparePromiseRef = useRef(null);
  const activeUserIdRef = useRef(null);
  const activePlanRef = useRef(null);
  const activeProfileRef = useRef(null);
  const isConfigured = useMemo(() => isSupabaseConfigured, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event) => {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        setIsDark(event.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => {
    activePlanRef.current = activePlan;
  }, [activePlan]);

  useEffect(() => {
    activeProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const templates = await listPlanTemplates();
        if (!mounted) return;
        setPlanTemplates(templates);
        if (templates[0]?.slug) {
          setSelectedTemplateSlug(templates[0].slug);
        }
      } catch {
        if (!mounted) return;
        setPlanTemplates([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isConfigured]);

  useEffect(() => {
    if (session?.user?.id) {
      activeUserIdRef.current = session.user.id;
      setStorageScope(session.user.id);
      return;
    }

    activeUserIdRef.current = null;
    setStorageScope('guest');
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    const updateCaches = (userId, bundle) => {
      if (bundle.plan) {
        writeSessionCache(PLAN_CACHE_PREFIX, userId, bundle.plan);
      }
      writeSessionCache(PROFILE_CACHE_PREFIX, userId, bundle.profile);
    };

    const clearUserState = (userId) => {
      preparePromiseRef.current = null;
      clearSessionCache(PLAN_CACHE_PREFIX, userId);
      clearSessionCache(PROFILE_CACHE_PREFIX, userId);
      activeUserIdRef.current = null;
      setActivePlan(null);
      setUserProfile(null);
    };

    const prepareBundle = async (user) => {
      const nextUserId = user?.id;
      if (!nextUserId) {
        throw new Error('Usuário inválido para preparar sua conta.');
      }

      if (preparePromiseRef.current && activeUserIdRef.current === nextUserId) {
        return preparePromiseRef.current;
      }

      const promise = withTimeout(
        (async () => {
          const plan = await ensureUserPlan(user, { autoCreate: false });
          const profile = (await getProfile(user.id)) || (await ensureUserProfile(user));
          return { profile, plan };
        })(),
        PLAN_PREPARE_TIMEOUT_MS,
        'A preparação da sua conta demorou mais do que o esperado. Tente entrar novamente.'
      ).finally(() => {
        preparePromiseRef.current = null;
      });

      activeUserIdRef.current = nextUserId;
      preparePromiseRef.current = promise;
      return promise;
    };

    const applyBundle = (bundle, nextSession) => {
      setActivePlan(bundle.plan);
      setUserProfile(bundle.profile);
      updateCaches(nextSession.user.id, bundle);
      setAuthMessage('');

      if (isProfileSetupComplete(bundle.profile)) {
        if (!bundle.plan) {
          setPlanSetupMessage('');
          setStage(STAGES.PLAN_SETUP);
          return;
        }
        setStage(STAGES.APP);
        return;
      }

      setProfileSetupMode('required');
      setStage(STAGES.NEEDS_PROFILE_SETUP);
    };

    const resolveSession = async (event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        clearUserState(activeUserIdRef.current);
        setStage(STAGES.ONBOARDING);
        return;
      }

      const nextUserId = nextSession.user.id;
      const sameUser = activeUserIdRef.current === nextUserId;
      activeUserIdRef.current = nextUserId;
      const hasLoadedUserData = Boolean(activePlanRef.current) && Boolean(activeProfileRef.current);
      const currentProfileReady = isProfileSetupComplete(activeProfileRef.current);

      if (sameUser && hasLoadedUserData && currentProfileReady && event !== 'SIGNED_OUT') {
        try {
          const bundle = await prepareBundle(nextSession.user);
          if (!isMounted || activeUserIdRef.current !== nextUserId) return;
          setActivePlan(bundle.plan);
          setUserProfile(bundle.profile);
          updateCaches(nextUserId, bundle);
          setAuthMessage('');
        } catch (error) {
          if (!isMounted || activeUserIdRef.current !== nextUserId) return;
          setAuthMessage(error.message || 'Não foi possível atualizar seus dados agora.');
        }
        return;
      }

      const cachedPlan = readSessionCache(PLAN_CACHE_PREFIX, nextUserId);
      const cachedProfile = readSessionCache(PROFILE_CACHE_PREFIX, nextUserId);

      if (cachedProfile) {
        setActivePlan(cachedPlan || null);
        setUserProfile(cachedProfile);

        if (isProfileSetupComplete(cachedProfile)) {
          if (cachedPlan) {
            setStage(STAGES.APP);
          } else {
            setStage(STAGES.PLAN_SETUP);
          }
        } else {
          setProfileSetupMode('required');
          setStage(STAGES.NEEDS_PROFILE_SETUP);
        }
      } else {
        setStage(cachedPlan || cachedProfile ? STAGES.RESTORING_CACHED_PLAN : STAGES.PREPARING_PROFILE);
      }

      try {
        const bundle = await prepareBundle(nextSession.user);
        if (!isMounted || activeUserIdRef.current !== nextUserId) return;
        applyBundle(bundle, nextSession);
      } catch (error) {
        if (!isMounted || activeUserIdRef.current !== nextUserId) return;
        setAuthMessage(error.message || 'Não foi possível preparar sua conta.');
        setStage(STAGES.PREPARE_ERROR);
      }
    };

    const bootstrapSession = async () => {
      if (!isConfigured) {
        if (isMounted) {
          setStage(getInitialStage());
          setAuthMessage('Configure o Supabase para ativar login e plano por usuário.');
        }
        return;
      }

      try {
        const currentSession = await getCurrentSession();
        if (!isMounted) return;

        if (!currentSession?.user) {
          setSession(null);
          setStage(getInitialStage());
          return;
        }

        await resolveSession('INITIAL_SESSION', currentSession);
      } catch (error) {
        if (!isMounted) return;
        setAuthMessage(error.message || 'Não foi possível validar sua sessão.');
        setStage(STAGES.AUTH_ERROR);
      }
    };

    bootstrapSession();

    if (!isConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const handleAuthEvent = async (event, nextSession) => {
      if (!isMounted) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        try {
          const recoveredSession = await getCurrentSession();
          if (recoveredSession?.user) {
            await resolveSession('SESSION_RECOVERED', recoveredSession);
            return;
          }
        } catch {
          // ignore recovery read failures and continue with normal SIGNED_OUT flow
        }
      }

      if (
        event === 'INITIAL_SESSION' &&
        nextSession?.user?.id === activeUserIdRef.current &&
        activePlanRef.current &&
        activeProfileRef.current
      ) {
        return;
      }

      await resolveSession(event, nextSession);
    };

    const { data } = onAuthStateChange((event, nextSession) => {
      setTimeout(() => {
        void handleAuthEvent(event, nextSession);
      }, 0);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [isConfigured, prepareRetryNonce]);

  const handleContinueFromOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setStage(STAGES.AUTH);
  };

  const handleBackToOnboarding = () => {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setStage(STAGES.ONBOARDING);
  };

  const handleStartAuth = async (action) => {
    setAuthMessage('');
    setIsAuthBusy(true);

    try {
      await action();
    } catch (error) {
      setAuthMessage(error.message || 'Não foi possível iniciar o login.');
      setStage(STAGES.AUTH);
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsAuthBusy(true);
    setAuthMessage('');

    try {
      clearSessionCache(PLAN_CACHE_PREFIX, session?.user?.id);
      clearSessionCache(PROFILE_CACHE_PREFIX, session?.user?.id);
      await signOutUser();
    } catch (error) {
      try {
        await clearLocalSession();
      } catch {
        // ignore fallback errors
      }
      setAuthMessage(error.message || 'Não foi possível sair no servidor. Limpamos sua sessão local.');
    } finally {
      preparePromiseRef.current = null;
      setSession(null);
      setActivePlan(null);
      setUserProfile(null);
      setImportedPlanDraft(null);
      setPlanSetupMessage('');
      setStage(STAGES.ONBOARDING);
      setIsAuthBusy(false);
    }
  };

  const handleResetAuth = async () => {
    setIsAuthBusy(true);
    setAuthMessage('');

    try {
      if (isConfigured) {
        await clearLocalSession();
      }
    } catch (error) {
      setAuthMessage(error.message || 'Não foi possível limpar a sessão atual.');
    } finally {
      clearSessionCache(PLAN_CACHE_PREFIX, session?.user?.id);
      clearSessionCache(PROFILE_CACHE_PREFIX, session?.user?.id);
      preparePromiseRef.current = null;
      setSession(null);
      setActivePlan(null);
      setUserProfile(null);
      setImportedPlanDraft(null);
      setPlanSetupMessage('');
      setIsAuthBusy(false);
      setStage(STAGES.ONBOARDING);
    }
  };

  const handleCompleteProfile = async (displayName) => {
    if (!session?.user?.id) {
      setAuthMessage('Sua sessão expirou. Entre novamente para continuar.');
      setStage(STAGES.AUTH);
      return;
    }

    setIsAuthBusy(true);
    setAuthMessage('');

    try {
      const updatedProfile = await completeUserProfile(session.user.id, displayName);
      setUserProfile(updatedProfile);
      writeSessionCache(PROFILE_CACHE_PREFIX, session.user.id, updatedProfile);
      setProfileSetupMode('required');
      setStage(activePlan ? STAGES.APP : STAGES.PLAN_SETUP);
    } catch (error) {
      setAuthMessage(error.message || 'Não foi possível salvar seu nome agora.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleBackFromProfileSetup = () => {
    setAuthMessage('');
    if (profileSetupMode === 'edit' && activePlan) {
      setStage(STAGES.APP);
      return;
    }

    handleResetAuth();
  };

  const handleCreatePlanFromTemplate = async (templateSlug) => {
    if (!session?.user) return;
    setIsAuthBusy(true);
    setPlanSetupMessage('');
    setSelectedTemplateSlug(templateSlug);

    try {
      const nextPlan = await createUserPlanFromTemplate(session.user, templateSlug);
      setActivePlan(nextPlan);
      writeSessionCache(PLAN_CACHE_PREFIX, session.user.id, nextPlan);
      setStage(STAGES.APP);
    } catch (error) {
      setPlanSetupMessage(error.message || 'Não foi possível criar o plano padrão agora.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleImportSvgFile = async (file) => {
    if (!session?.user) return;
    setIsAuthBusy(true);
    setPlanSetupMessage('');

    try {
      const svgText = await file.text();
      const parsedPlan = await importPlanFromSvg(session.user.id, svgText);
      setImportedPlanDraft(parsedPlan);
      setPlanSetupMessage('Pré-visualização gerada com sucesso. Salve ou publique quando quiser.');
    } catch (error) {
      setImportedPlanDraft(null);
      setPlanSetupMessage(
        error.message ||
          'Não conseguimos ler seu SVG neste formato. Escolha um plano padrão e edite depois.'
      );
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleSaveImportedDraft = async () => {
    if (!session?.user?.id || !importedPlanDraft) return;
    setIsAuthBusy(true);
    setPlanSetupMessage('');

    try {
      await saveUserPlanDraft(session.user.id, importedPlanDraft);
      setPlanSetupMessage('Rascunho salvo com sucesso.');
    } catch (error) {
      setPlanSetupMessage(error.message || 'Não foi possível salvar o rascunho.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handlePublishImportedDraft = async () => {
    if (!session?.user?.id || !importedPlanDraft) return;
    setIsAuthBusy(true);
    setPlanSetupMessage('');

    try {
      await saveUserPlanDraft(session.user.id, importedPlanDraft);
      const published = await publishUserPlanDraft(session.user.id);
      setActivePlan(published);
      writeSessionCache(PLAN_CACHE_PREFIX, session.user.id, published);
      setStage(STAGES.APP);
    } catch (error) {
      setPlanSetupMessage(error.message || 'Não foi possível publicar o plano agora.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  if (stage === STAGES.LOADING_SESSION || stage === STAGES.RESTORING_CACHED_PLAN || stage === STAGES.PREPARING_PROFILE) {
    return (
      <SessionLoadingScreen
        label={
          stage === STAGES.RESTORING_CACHED_PLAN
            ? 'Restaurando sua experiência'
            : stage === STAGES.PREPARING_PROFILE
              ? 'Preparando sua ficha'
              : 'Validando sessão'
        }
        description={
          stage === STAGES.RESTORING_CACHED_PLAN
            ? 'Encontramos seus dados locais e estamos confirmando tudo com a nuvem.'
            : stage === STAGES.PREPARING_PROFILE
              ? 'Estamos validando sua conta, carregando seu plano e organizando sua entrada no app.'
              : 'Estamos verificando sua sessão para liberar a entrada no app.'
        }
        actionLabel={stage === STAGES.LOADING_SESSION ? 'Reiniciar sessão' : 'Voltar ao login'}
        onAction={handleResetAuth}
        isBusy={isAuthBusy}
      />
    );
  }

  if (stage === STAGES.PREPARE_ERROR) {
    return (
      <SessionLoadingScreen
        label="Não conseguimos finalizar sua entrada"
        description={
          authMessage ||
          'Sua sessão parece ativa, mas tivemos uma falha temporária ao carregar os dados. Tente novamente.'
        }
        actionLabel="Tentar novamente"
        onAction={() => {
          setAuthMessage('');
          setStage(STAGES.LOADING_SESSION);
          setPrepareRetryNonce((value) => value + 1);
        }}
        isBusy={isAuthBusy}
      />
    );
  }

  if (stage === STAGES.ONBOARDING) {
    return <OnboardingScreen onContinue={handleContinueFromOnboarding} isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />;
  }

  if (stage === STAGES.AUTH || stage === STAGES.AUTH_ERROR) {
    return (
      <LoginScreen
        authMessage={authMessage}
        isBusy={isAuthBusy}
        isSupabaseConfigured={isConfigured}
        onBack={handleBackToOnboarding}
        onAuthAction={handleStartAuth}
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />
    );
  }

  if (stage === STAGES.NEEDS_PROFILE_SETUP && session?.user) {
    return (
      <ProfileSetupScreen
        email={session.user.email}
        initialDisplayName={getSetupDisplayName(userProfile, session.user)}
        isBusy={isAuthBusy}
        errorMessage={authMessage}
        onBack={handleBackFromProfileSetup}
        onSubmit={handleCompleteProfile}
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />
    );
  }

  if (stage === STAGES.PLAN_SETUP) {
    return (
      <PlanStartScreen
        isBusy={isAuthBusy}
        message={planSetupMessage}
        onBack={handleResetAuth}
        onSelectImport={() => {
          setPlanSetupMessage('');
          setStage(STAGES.PLAN_IMPORT);
        }}
        onSelectDefault={() => {
          setPlanSetupMessage('');
          setStage(STAGES.PLAN_LEVEL_PICKER);
        }}
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />
    );
  }

  if (stage === STAGES.PLAN_LEVEL_PICKER) {
    return (
      <PlanLevelPickerScreen
        templates={planTemplates}
        selectedSlug={selectedTemplateSlug}
        isBusy={isAuthBusy}
        message={planSetupMessage}
        onBack={() => setStage(STAGES.PLAN_SETUP)}
        onSelectTemplate={handleCreatePlanFromTemplate}
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />
    );
  }

  if (stage === STAGES.PLAN_IMPORT) {
    return (
      <PlanImportScreen
        parsedPlan={importedPlanDraft}
        isBusy={isAuthBusy}
        errorMessage={planSetupMessage && !importedPlanDraft ? planSetupMessage : ''}
        successMessage={planSetupMessage && importedPlanDraft ? planSetupMessage : ''}
        onBack={() => setStage(STAGES.PLAN_SETUP)}
        onFileSelected={handleImportSvgFile}
        onSaveDraft={handleSaveImportedDraft}
        onPublish={handlePublishImportedDraft}
        isDark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
      />
    );
  }

  if (stage === STAGES.APP && activePlan && session?.user) {
    return (
      <Dashboard
        plan={activePlan}
        user={session.user}
        userProfile={userProfile}
        onEditProfile={() => {
          setProfileSetupMode('edit');
          setStage(STAGES.NEEDS_PROFILE_SETUP);
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <SessionLoadingScreen
      label="Carregando experiência"
      description="Estamos organizando a entrada no app."
      actionLabel="Voltar ao login"
      onAction={handleResetAuth}
      isBusy={isAuthBusy}
    />
  );
}

function SessionLoadingScreen({ label, description, actionLabel, onAction, isBusy }) {
  const ActionIcon = label.includes('Preparando') ? ArrowLeft : RotateCcw;

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#F5F7FB] px-6 text-gray-900 dark:bg-[#0A0D14] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-2%] h-72 w-72 rounded-full bg-[#CFE1FF]/68 blur-3xl dark:bg-[#123EAA]/24" />
        <div className="absolute bottom-[8%] right-[-16%] h-72 w-72 rounded-full bg-[#D8F4CE]/34 blur-3xl dark:bg-[#0C4A38]/16" />
      </div>
      <div className="relative w-full max-w-sm rounded-[32px] border border-black/[0.05] bg-white/86 px-6 py-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05] dark:shadow-[0_24px_60px_rgba(0,0,0,0.34)]">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#0A3CFF]/15 border-t-[#0A3CFF]" />
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#0A3CFF] dark:text-[#AFC5FF]">
          Hibrid Club
        </p>
        <h1 className="mt-2 text-[26px] font-black tracking-[-0.05em] text-gray-950 dark:text-white">{label}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
        <button
          onClick={onAction}
          disabled={isBusy}
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/[0.06] bg-[#F7F9FD] px-4 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.07]"
        >
          <ActionIcon size={16} />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
