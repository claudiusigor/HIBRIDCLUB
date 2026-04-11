import { workoutPlan } from '../data/workoutPlan';
import { publicPlanTemplate } from '../data/publicPlanTemplate';
import { getFallbackTemplateBySlug, progressivePlanTemplates } from '../data/progressivePlanTemplatesV2';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ensureUserProfile } from './profile';

const DEFAULT_TEMPLATE_SLUG = 'hibrid-club-basic';
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL?.trim().toLowerCase();

export const SESSION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const DAY_NAMES = {
  A: 'Segunda',
  B: 'Terça',
  C: 'Quarta',
  D: 'Quinta',
  E: 'Sexta',
  F: 'Sábado',
};
export const WEEK_ORDER_KEYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
export const DEFAULT_WEEK_ORDER = {
  SEG: 'A',
  TER: 'B',
  QUA: 'C',
  QUI: 'D',
  SEX: 'E',
  SAB: 'F',
  DOM: null,
};

function clonePlanData(plan) {
  return JSON.parse(JSON.stringify(plan));
}

function getUserEmail(user) {
  return user?.email?.trim().toLowerCase() || '';
}

function isOwnerUser(user) {
  if (!OWNER_EMAIL) return false;
  return getUserEmail(user) === OWNER_EMAIL;
}

function isMissingDbObject(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

function countAssignedSessions(weekOrder) {
  return Object.values(weekOrder || {}).filter(Boolean).length;
}

export function normalizePlanModel(planData, metadata = {}) {
  const normalized = clonePlanData(planData || publicPlanTemplate);
  normalized.metadata = {
    ...(normalized.metadata || {}),
    ...metadata,
  };

  normalized.general = normalized.general || {};
  normalized.general.calorieTarget = normalized.general.calorieTarget || { min: 0, max: normalized.general.tdee || 0 };
  normalized.general.waterBaseLiters = normalized.general.waterBaseLiters || { min: 2.5, max: 2.9 };
  normalized.general.waterRecommendedLiters = normalized.general.waterRecommendedLiters || { min: 3.0, max: 4.0 };
  normalized.general.waterLiters =
    typeof normalized.general.waterLiters === 'number'
      ? normalized.general.waterLiters
      : normalized.general.waterRecommendedLiters.max || 3.5;

  normalized.schedule = normalized.schedule || {};
  SESSION_IDS.forEach((sessionId) => {
    if (!normalized.schedule[sessionId]) return;
    normalized.schedule[sessionId].id = sessionId;
    normalized.schedule[sessionId].day = DAY_NAMES[sessionId];
    normalized.schedule[sessionId].exercises = Array.isArray(normalized.schedule[sessionId].exercises)
      ? normalized.schedule[sessionId].exercises
      : [];
  });

  const nextWeekOrder = { ...DEFAULT_WEEK_ORDER, ...(normalized.weekOrder || {}) };
  WEEK_ORDER_KEYS.forEach((key) => {
    const value = nextWeekOrder[key];
    if (!value || SESSION_IDS.includes(value)) return;
    nextWeekOrder[key] = null;
  });
  normalized.weekOrder = nextWeekOrder;

  if (typeof normalized.general.sessionsPerWeekTarget !== 'number') {
    normalized.general.sessionsPerWeekTarget = Math.max(1, countAssignedSessions(nextWeekOrder));
  }

  return normalized;
}

function inferLevelFromSlug(slug) {
  if (slug.includes('advanced')) return 'advanced';
  if (slug.includes('intermediate')) return 'intermediate';
  return 'basic';
}

async function getExistingUserPlanRow(userId) {
  const { data, error } = await supabase
    .from('user_plans')
    .select('id, template_id, plan_data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getTemplatePlanBySlug(slug = DEFAULT_TEMPLATE_SLUG) {
  if (!isSupabaseConfigured || !supabase) {
    const fallback = getFallbackTemplateBySlug(slug);
    return { templateId: null, slug: fallback.slug, planData: clonePlanData(fallback.plan_data) };
  }

  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, slug, plan_data')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;

  if (!data?.plan_data) {
    const fallback = getFallbackTemplateBySlug(slug);
    return { templateId: null, slug: fallback.slug, planData: clonePlanData(fallback.plan_data) };
  }

  return { templateId: data.id, slug: data.slug, planData: clonePlanData(data.plan_data) };
}

async function insertUserPlan(userId, templateId, planData) {
  const payload = {
    user_id: userId,
    template_id: templateId,
    plan_data: planData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_plans')
    .upsert(payload, { onConflict: 'user_id' })
    .select('plan_data')
    .single();

  if (error) throw error;
  return normalizePlanModel(data.plan_data);
}

export async function listPlanTemplates() {
  if (!isSupabaseConfigured || !supabase) {
    return progressivePlanTemplates.map((template) => ({
      slug: template.slug,
      name: template.name,
      description: template.description,
      level: template.level,
    }));
  }

  const { data, error } = await supabase
    .from('plan_templates')
    .select('slug, name')
    .in(
      'slug',
      progressivePlanTemplates.map((template) => template.slug)
    );

  if (error) {
    return progressivePlanTemplates.map((template) => ({
      slug: template.slug,
      name: template.name,
      description: template.description,
      level: template.level,
    }));
  }

  const bySlug = Object.fromEntries((data || []).map((row) => [row.slug, row]));
  return progressivePlanTemplates.map((template) => ({
    slug: template.slug,
    name: bySlug[template.slug]?.name || template.name,
    description: template.description,
    level: template.level,
  }));
}

export async function ensureUserPlan(user, options = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return normalizePlanModel(workoutPlan);
  }

  const { autoCreate = false, templateSlug = DEFAULT_TEMPLATE_SLUG } = options;

  await ensureUserProfile(user);

  const existing = await getExistingUserPlanRow(user.id);
  if (existing?.plan_data) {
    return normalizePlanModel(existing.plan_data, { origin: 'published' });
  }

  if (!autoCreate && !isOwnerUser(user)) {
    return null;
  }

  if (isOwnerUser(user)) {
    const ownerPlan = normalizePlanModel(workoutPlan, {
      level: 'owner',
      origin: 'owner',
      isTemplate: false,
    });
    return insertUserPlan(user.id, null, ownerPlan);
  }

  const template = await getTemplatePlanBySlug(templateSlug);
  const templatePlan = normalizePlanModel(template.planData, {
    level: inferLevelFromSlug(template.slug),
    origin: 'template',
    isTemplate: false,
  });
  return insertUserPlan(user.id, template.templateId, templatePlan);
}

export async function createUserPlanFromTemplate(user, templateSlug) {
  if (!isSupabaseConfigured || !supabase) {
    const fallbackTemplate = getFallbackTemplateBySlug(templateSlug);
    return normalizePlanModel(fallbackTemplate.plan_data, {
      level: fallbackTemplate.level,
      origin: 'template',
      isTemplate: false,
    });
  }

  await ensureUserProfile(user);
  const template = await getTemplatePlanBySlug(templateSlug || DEFAULT_TEMPLATE_SLUG);
  const base = normalizePlanModel(template.planData, {
    level: inferLevelFromSlug(template.slug),
    origin: 'template',
    isTemplate: false,
  });
  return insertUserPlan(user.id, template.templateId, base);
}

export async function savePublishedPlan(userId, planData) {
  if (!isSupabaseConfigured || !supabase) {
    return normalizePlanModel(planData, { origin: 'published' });
  }

  const payload = normalizePlanModel(planData, { origin: 'published' });
  const existing = await getExistingUserPlanRow(userId);
  return insertUserPlan(userId, existing?.template_id ?? null, payload);
}

export async function getUserPlanDraft(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.from('user_plan_drafts').select('plan_data').eq('user_id', userId).maybeSingle();
  if (error) {
    if (isMissingDbObject(error)) return null;
    throw error;
  }
  return data?.plan_data ? normalizePlanModel(data.plan_data, { origin: 'draft' }) : null;
}

export async function saveUserPlanDraft(userId, planData) {
  if (!isSupabaseConfigured || !supabase) {
    return normalizePlanModel(planData, { origin: 'draft' });
  }

  const normalized = normalizePlanModel(planData, { origin: 'draft' });
  const payload = {
    user_id: userId,
    plan_data: normalized,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_plan_drafts')
    .upsert(payload, { onConflict: 'user_id' })
    .select('plan_data')
    .single();

  if (error) {
    if (isMissingDbObject(error)) return normalized;
    throw error;
  }

  return normalizePlanModel(data.plan_data, { origin: 'draft' });
}

export async function publishUserPlanDraft(userId) {
  const draft = await getUserPlanDraft(userId);
  if (!draft) {
    throw new Error('Não encontramos rascunho para publicar.');
  }

  const published = await savePublishedPlan(userId, draft);
  if (isSupabaseConfigured && supabase) {
    const { error: versionError } = await supabase.from('user_plan_versions').insert({
      user_id: userId,
      plan_data: published,
      created_at: new Date().toISOString(),
    });
    if (versionError && !isMissingDbObject(versionError)) {
      throw versionError;
    }
  }

  return published;
}

function parseExerciseFromLine(line, index) {
  const cleanLine = line.trim().replace(/\s+/g, ' ');
  if (!cleanLine) return null;

  const setsMatch = cleanLine.match(/(\d+\s*x\s*\d+(-\d+)?|\d+\s*series?.*)/i);
  const targetMatch = cleanLine.match(/(\d+\s*-\s*\d+\s*(min|km)|\d+\s*(min|km)|pace.*|ritmo.*)/i);
  const isCardio = /corrida|cardio|min|km|pace|ritmo|tiro|hiit/i.test(cleanLine);
  if (!setsMatch && !targetMatch && cleanLine.length < 4) return null;

  const name = cleanLine
    .replace(setsMatch?.[0] || '', '')
    .replace(targetMatch?.[0] || '', '')
    .replace(/[-—–]+$/, '')
    .trim();

  return {
    id: `svg_${index + 1}`,
    name: name || `Exercício ${index + 1}`,
    type: isCardio ? 'cardio' : 'strength',
    sets: isCardio ? undefined : (setsMatch?.[0] || '3x8-12').replace(/\s+/g, ''),
    target: isCardio ? (targetMatch?.[0] || setsMatch?.[0] || '20-30 min') : undefined,
  };
}

function extractTextFromSvg(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('SVG invalido. Verifique o arquivo e tente novamente.');
  }
  return [...doc.querySelectorAll('text, tspan')].map((node) => node.textContent?.trim() || '').filter(Boolean);
}

function splitSessionsFromLines(lines) {
  const sessions = {};
  let currentDay = null;

  lines.forEach((line) => {
    const upper = line.toUpperCase();
    const dayMatch = upper.match(/\b([A-F])\b/) || upper.match(/\b(SEG|TER|QUA|QUI|SEX|SAB)\b/);
    if (dayMatch) {
      const token = dayMatch[1];
      const mappedDay =
        token === 'SEG' ? 'A' : token === 'TER' ? 'B' : token === 'QUA' ? 'C' : token === 'QUI' ? 'D' : token === 'SEX' ? 'E' : token === 'SAB' ? 'F' : token;
      if (SESSION_IDS.includes(mappedDay)) {
        currentDay = mappedDay;
        if (!sessions[currentDay]) sessions[currentDay] = [];
        return;
      }
    }

    if (!currentDay) return;
    const exercise = parseExerciseFromLine(line, sessions[currentDay].length);
    if (exercise) sessions[currentDay].push(exercise);
  });

  return sessions;
}

export function parseStructuredSvgPlan(svgText, basePlan = publicPlanTemplate) {
  const lines = extractTextFromSvg(svgText);
  const sessions = splitSessionsFromLines(lines);
  const missingDays = SESSION_IDS.filter((day) => !sessions[day] || sessions[day].length === 0);
  if (missingDays.length > 0) {
    throw new Error(`Não encontramos blocos completos para: ${missingDays.join(', ')}.`);
  }

  const nextPlan = normalizePlanModel(basePlan, {
    sourceFile: 'svg-import',
    origin: 'imported',
    isTemplate: false,
  });

  SESSION_IDS.forEach((day) => {
    const previous = nextPlan.schedule[day];
    nextPlan.schedule[day] = {
      ...previous,
      id: day,
      day: DAY_NAMES[day],
      exercises: sessions[day],
      type: sessions[day].some((exercise) => exercise.type === 'cardio') ? 'Cardio' : previous?.type || 'Força Híbrida',
      summary: `Plano importado via SVG para ${DAY_NAMES[day]}.`,
    };
  });

  return normalizePlanModel(nextPlan);
}

export async function importPlanFromSvg(userId, svgText, basePlan = publicPlanTemplate) {
  const parsed = parseStructuredSvgPlan(svgText, basePlan);
  await saveUserPlanDraft(userId, parsed);
  return parsed;
}

export function getTemplateFallbackPlan(slug) {
  return normalizePlanModel(getFallbackTemplateBySlug(slug).plan_data);
}

export function getWeekdayKeyFromDate(date = new Date()) {
  const map = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  return map[date.getDay()];
}
