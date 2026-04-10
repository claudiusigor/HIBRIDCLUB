create extension if not exists pgcrypto;

create table if not exists public.user_plan_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_plan_drafts enable row level security;
alter table public.user_plan_versions enable row level security;

drop policy if exists "user_plan_drafts_select_own" on public.user_plan_drafts;
create policy "user_plan_drafts_select_own"
  on public.user_plan_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_plan_drafts_insert_own" on public.user_plan_drafts;
create policy "user_plan_drafts_insert_own"
  on public.user_plan_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_plan_drafts_update_own" on public.user_plan_drafts;
create policy "user_plan_drafts_update_own"
  on public.user_plan_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_plan_versions_select_own" on public.user_plan_versions;
create policy "user_plan_versions_select_own"
  on public.user_plan_versions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_plan_versions_insert_own" on public.user_plan_versions;
create policy "user_plan_versions_insert_own"
  on public.user_plan_versions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

insert into public.plan_templates (slug, name, plan_data)
values
  (
    'hibrid-club-basic',
    'Basico',
    '{
      "metadata": { "sourceFile": "hibrid-club-basic", "title": "Plano Hibrido Basico", "transcribedFromPdf": false, "isTemplate": true, "level": "basic", "origin": "template" },
      "general": { "focus": "Base de forca + corrida leve + consistencia", "tdee": 2400, "waterLiters": 3.5, "currentWeightKg": 75, "heightM": 1.75, "ageYears": 30, "sex": "Personalizar", "bmi": 24.5, "bmr": 1700, "calorieTarget": { "min": 2100, "max": 2400 }, "waterBaseLiters": { "min": 2.5, "max": 2.9 }, "waterRecommendedLiters": { "min": 3.0, "max": 4.0 }, "objective": "Construir base de treino com consistencia.", "strategy": "Treino de forca e cardio com progressao semanal.", "operationalRules": ["Registrar evolucao e ajustar carga gradualmente."] },
      "schedule": {
        "A": { "id": "A", "day": "Segunda", "name": "Inferiores Base", "type": "Forca Hibrida", "summary": "Fundamentos de pernas", "exercises": [{"id":"a1","name":"Agachamento goblet","sets":"3x10","type":"strength"},{"id":"a2","name":"Leg press","sets":"3x10","type":"strength"},{"id":"a3","name":"Corrida leve","target":"15-20 min","type":"cardio"}] },
        "B": { "id": "B", "day": "Terca", "name": "Superiores Base", "type": "Forca Hibrida", "summary": "Fundamentos de superiores", "exercises": [{"id":"b1","name":"Supino halter","sets":"3x10","type":"strength"},{"id":"b2","name":"Remada baixa","sets":"3x10","type":"strength"}] },
        "C": { "id": "C", "day": "Quarta", "name": "Cardio Base + Core", "type": "Cardio", "summary": "Resistencia leve", "exercises": [{"id":"c1","name":"Corrida moderada","target":"25-35 min","type":"cardio"},{"id":"c2","name":"Prancha","sets":"3x30s","type":"strength"}] },
        "D": { "id": "D", "day": "Quinta", "name": "Posteriores Base", "type": "Forca Hibrida", "summary": "Posterior e gluteo", "exercises": [{"id":"d1","name":"Stiff halter","sets":"3x10","type":"strength"},{"id":"d2","name":"Hip thrust","sets":"3x12","type":"strength"}] },
        "E": { "id": "E", "day": "Sexta", "name": "Superiores Volume Leve", "type": "Forca Hibrida", "summary": "Volume tecnico", "exercises": [{"id":"e1","name":"Puxada frente","sets":"3x10","type":"strength"},{"id":"e2","name":"Desenvolvimento","sets":"3x10","type":"strength"}] },
        "F": { "id": "F", "day": "Sabado", "name": "Corrida Longa Base", "type": "Cardio", "summary": "Longao leve", "exercises": [{"id":"f1","name":"Corrida longa","target":"35-45 min","type":"cardio"}] }
      }
    }'::jsonb
  ),
  (
    'hibrid-club-intermediate',
    'Intermediario',
    '{"metadata":{"sourceFile":"hibrid-club-intermediate","title":"Plano Hibrido Intermediario","transcribedFromPdf":false,"isTemplate":true,"level":"intermediate","origin":"template"},"general":{"focus":"Forca hibrida com corrida estruturada","tdee":2500,"waterLiters":3.8,"currentWeightKg":75,"heightM":1.75,"ageYears":30,"sex":"Personalizar","bmi":24.5,"bmr":1700,"calorieTarget":{"min":2200,"max":2500},"waterBaseLiters":{"min":2.7,"max":3.0},"waterRecommendedLiters":{"min":3.2,"max":4.2},"objective":"Aumentar intensidade mantendo tecnica.","strategy":"Troca de exercicios e consolidacao de volume.","operationalRules":["Registrar progresso semanal."]},"schedule":{"A":{"id":"A","day":"Segunda","name":"Inferiores Intermediario","type":"Forca Hibrida","summary":"Pernas com mais exigencia","exercises":[{"id":"a1","name":"Agachamento frontal","sets":"4x6-8","type":"strength"},{"id":"a2","name":"Leg press","sets":"3x8-10","type":"strength"}]},"B":{"id":"B","day":"Terca","name":"Superiores Intermediario","type":"Forca Hibrida","summary":"Press e puxada pesada","exercises":[{"id":"b1","name":"Supino com pausa","sets":"4x6-8","type":"strength"},{"id":"b2","name":"Remada curvada","sets":"3x8-10","type":"strength"}]},"C":{"id":"C","day":"Quarta","name":"Cardio Intermediario + Core","type":"Cardio","summary":"Corrida progressiva","exercises":[{"id":"c1","name":"Corrida progressiva","target":"30-40 min","type":"cardio"},{"id":"c2","name":"Prancha lateral","sets":"3x30s","type":"strength"}]},"D":{"id":"D","day":"Quinta","name":"Posteriores Intermediario","type":"Forca Hibrida","summary":"Posterior com carga","exercises":[{"id":"d1","name":"Terra convencional","sets":"4x5-6","type":"strength"},{"id":"d2","name":"Hip thrust","sets":"3x8-10","type":"strength"}]},"E":{"id":"E","day":"Sexta","name":"Superiores Costas/Ombros","type":"Forca Hibrida","summary":"Volume de costas","exercises":[{"id":"e1","name":"Barra fixa pronada","sets":"4x6-8","type":"strength"},{"id":"e2","name":"Desenvolvimento militar","sets":"3x8-10","type":"strength"}]},"F":{"id":"F","day":"Sabado","name":"Corrida Longa Intermediario","type":"Cardio","summary":"Longao progressivo","exercises":[{"id":"f1","name":"Longao progressivo","target":"45-55 min","type":"cardio"}]}}}'::jsonb
  ),
  (
    'hibrid-club-advanced',
    'Avancado',
    '{"metadata":{"sourceFile":"hibrid-club-advanced","title":"Plano Hibrido Avancado","transcribedFromPdf":false,"isTemplate":true,"level":"advanced","origin":"template"},"general":{"focus":"Alta performance em forca e corrida","tdee":2650,"waterLiters":4.0,"currentWeightKg":75,"heightM":1.75,"ageYears":30,"sex":"Personalizar","bmi":24.5,"bmr":1700,"calorieTarget":{"min":2300,"max":2650},"waterBaseLiters":{"min":2.8,"max":3.2},"waterRecommendedLiters":{"min":3.5,"max":4.5},"objective":"Performance alta com recuperacao controlada.","strategy":"Blocos tecnicos e estimulo elevado.","operationalRules":["Monitorar fadiga e ajustar carga."]},"schedule":{"A":{"id":"A","day":"Segunda","name":"Inferiores Avancado","type":"Forca Hibrida","summary":"Forca tecnica pesada","exercises":[{"id":"a1","name":"Agachamento high-bar","sets":"5x4-6","type":"strength"},{"id":"a2","name":"Terra romeno","sets":"4x6-8","type":"strength"}]},"B":{"id":"B","day":"Terca","name":"Superiores Avancado","type":"Forca Hibrida","summary":"Forca de superiores","exercises":[{"id":"b1","name":"Supino pausa longa","sets":"5x4-6","type":"strength"},{"id":"b2","name":"Remada strict","sets":"4x6-8","type":"strength"}]},"C":{"id":"C","day":"Quarta","name":"Tempo Run + Core","type":"Cardio","summary":"Cardio de desempenho","exercises":[{"id":"c1","name":"Tempo run","target":"35-45 min","type":"cardio"},{"id":"c2","name":"Core anti-rotacao","sets":"4x12","type":"strength"}]},"D":{"id":"D","day":"Quinta","name":"Posteriores Avancado","type":"Forca Hibrida","summary":"Forca posterior avancada","exercises":[{"id":"d1","name":"Terra tecnico pesado","sets":"5x3-5","type":"strength"},{"id":"d2","name":"Hip thrust pesado","sets":"4x6-8","type":"strength"}]},"E":{"id":"E","day":"Sexta","name":"Costas/Ombros Avancado","type":"Forca Hibrida","summary":"Volume intenso","exercises":[{"id":"e1","name":"Barra fixa lastrada","sets":"5x4-6","type":"strength"},{"id":"e2","name":"Face pull","sets":"4x12-15","type":"strength"}]},"F":{"id":"F","day":"Sabado","name":"Longao Avancado","type":"Cardio","summary":"Longao com bloco forte","exercises":[{"id":"f1","name":"Longao com final forte","target":"55-70 min","type":"cardio"}]}}}'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  plan_data = excluded.plan_data,
  updated_at = now();

