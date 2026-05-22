# Hybrid Club Design Notes

## Purpose

Hybrid Club is a React/Vite PWA for a hybrid training routine that combines running and strength training. The app organizes the user's daily workout, quick exercise logging, training history, progress insights, hydration/nutrition tracking, and a user-specific plan stored through Supabase.

The product copy and structure come from the codebase itself. There is no project README in the repository root, so the source of truth is the app code and data files.

## Product Language

Core brand and onboarding language:

- Hybrid Club / Hibrid Club
- HIBRIDO DE VERDADE
- Corrida e musculacao na mesma rotina
- FOCO NO ATLETA
- Feito para quem quer performance com consistencia

Core value propositions:

- Plano diario organizado
- Execucao rapida por sessao
- Acompanhamento continuo
- Corrida com tecnica
- Treino de forca estruturado
- Progressao sem confusao

Plan language from the default workout data:

- Reducao de gordura + forca + corrida
- Treino de forca + corrida + deficit calorico controlado + hidratacao adequada
- Registrar cargas, tempo e distancia de corrida e peso corporal semanal
- Ajustar calorias com base na evolucao
- Dormir 7-8 horas por noite para sustentar recuperacao e desempenho

## Critical Files

- `src/data/workoutPlan.js`: default plan data, goals, workout sessions A-F, exercise names, sets, targets, cardio and strength types.
- `src/data/publicPlanTemplate.js`: public/default plan template structure.
- `src/data/progressivePlanTemplates.js`: progressive plan variants.
- `src/data/progressivePlanTemplatesV2.js`: expanded progressive plan templates.
- `src/components/Dashboard.jsx`: main logged-in experience, weekday selector, plan of the day, quick log, progress status, bottom navigation.
- `src/components/ui/WeightLog.jsx`: quick exercise logging for kg/reps or min/km.
- `src/components/WorkoutExecution.jsx`: focused workout execution flow.
- `src/components/ui/TrainingCard.jsx`: workout card presentation.
- `src/components/pages/StatsPage.jsx`: training insights and volume/cardio summaries.
- `src/components/pages/HistoryPage.jsx`: saved training history.
- `src/components/pages/NutritionPage.jsx`: hydration and calorie tracking.
- `src/components/pages/PlanPage.jsx`: plan editing and workout configuration.
- `src/components/auth/OnboardingScreen.jsx`: first-run product messaging and brand presentation.
- `src/components/auth/LoginScreen.jsx`: Google and magic link authentication entry.
- `src/components/auth/AuthGate.jsx`: authentication and onboarding flow control.
- `src/services/storage.js`: daily logs, workout sessions, nutrition logs, and previous exercise data.
- `src/services/plans.js`: plan normalization, persistence, import parsing, and plan versioning.
- `src/services/auth.js`: Supabase auth actions.
- `src/services/profile.js`: Supabase profile fields.
- `src/lib/supabaseClient.js`: Supabase environment configuration.
- `src/components/effects/Iridescence.jsx`: WebGL background effect with fallback behavior.

## Native Product Shape

The app is organized around a weekly training rhythm, not a generic marketing page.

Primary structure:

- Weekdays: `SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB`, `DOM`
- Workout sessions: `A`, `B`, `C`, `D`, `E`, `F`
- Exercise types: `strength` and `cardio`
- Strength entry units: `kg` and `reps`
- Cardio entry units: `min` and `km`
- Daily logs: sessions, exercises, water, calories
- Saved history: date-keyed training entries

The design should put the plan of the day and quick exercise logging before secondary analytics. Metrics support the daily training workflow; they should not dominate the first screen.

## Visual Identity

The app uses a mobile-first premium fitness interface with glassmorphism, strong blue accents, dark mode, translucent cards, and compact dashboard sections.

Color values found in the codebase:

- Primary blue: `#0A3CFF`
- Light app background: `#F2F2F7`
- Light theme meta background: `#F5F7FB`
- Dark app background: `#0A0D14`
- Dark card: `#1C1C1E`
- Dark surface: `#2C2C2E`
- Dark separator: `#38383A`
- Light card: `#FFFFFF`
- Light surface: `#E5E5EA`
- Light separator: `#C6C6C8`
- Lime accent in Tailwind config: `#D0FD3E`, `#BDF914`

Typography:

- Tailwind font stack: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `SF Pro Display`, `system-ui`, `sans-serif`
- Montserrat is imported for heavy display use.
- Existing UI uses tight, bold, compact headings, frequently with negative tracking in component classes.

Component patterns:

- Rounded mobile cards, commonly `20px` to `30px`.
- Glass cards with blur, translucent borders, and inner highlights.
- Icon-first navigation using Lucide icons.
- Bottom dock tabs: Inicio, Cardio, Agua, Historico, Plano.
- Buttons use strong blue fills, compact labels, and mobile tap targets.
- Status copy is concise and action-oriented.

## Design Rules For Future Changes

- Start from the daily workout flow: plan of the day, current exercise, quick log, progress.
- Preserve the hybrid training language: running plus strength, not generic fitness.
- Use real exercise/session data from `workoutPlan.js` and plan templates.
- Use existing labels and units: kg, reps, min, km, sets, target, treino, ficha, historico.
- Do not invent marketing claims that are not present in the app.
- Keep the mobile PWA feel: compact, practical, premium, and easy to use during training.
- Any visual effect must fail safely. If WebGL is unavailable, the app must still render.
- Avoid replacing the app with a landing page. The main product is the usable training dashboard.
