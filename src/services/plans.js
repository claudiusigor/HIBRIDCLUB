import { workoutPlan } from '../data/workoutPlan';
import { publicPlanTemplate } from '../data/publicPlanTemplate';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ensureUserProfile } from './profile';

const DEFAULT_TEMPLATE_SLUG = 'hibrid-club-default';
const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL?.trim().toLowerCase();

function clonePlanData(plan) {
  return JSON.parse(JSON.stringify(plan));
}

function getUserEmail(user) {
  return user?.email?.trim().toLowerCase() || '';
}

function isOwnerUser(user) {
  if (!OWNER_EMAIL) {
    return false;
  }

  return getUserEmail(user) === OWNER_EMAIL;
}

async function getTemplatePlan() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      templateId: null,
      planData: clonePlanData(publicPlanTemplate),
    };
  }

  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, slug, plan_data')
    .eq('slug', DEFAULT_TEMPLATE_SLUG)
    .maybeSingle();

  if (error) throw error;

  if (data?.plan_data) {
    return {
      templateId: data.id,
      planData: clonePlanData(data.plan_data),
    };
  }

  return {
    templateId: null,
    planData: clonePlanData(publicPlanTemplate),
  };
}

async function getExistingUserPlan(userId) {
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan_data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.plan_data ? clonePlanData(data.plan_data) : null;
}

export async function ensureUserPlan(user) {
  if (!isSupabaseConfigured || !supabase) {
    return clonePlanData(workoutPlan);
  }

  await ensureUserProfile(user);

  const existingPlan = await getExistingUserPlan(user.id);
  if (existingPlan) {
    return existingPlan;
  }

  const template = isOwnerUser(user)
    ? {
        templateId: null,
        planData: clonePlanData(workoutPlan),
      }
    : await getTemplatePlan();

  const planPayload = {
    user_id: user.id,
    template_id: template.templateId,
    plan_data: template.planData,
    updated_at: new Date().toISOString(),
  };

  const { data: createdPlan, error: createError } = await supabase
    .from('user_plans')
    .insert(planPayload)
    .select('plan_data')
    .single();

  if (createError) {
    if (createError.code === '23505') {
      const concurrentPlan = await getExistingUserPlan(user.id);
      if (concurrentPlan) {
        return concurrentPlan;
      }
    }

    throw createError;
  }

  return clonePlanData(createdPlan.plan_data);
}
