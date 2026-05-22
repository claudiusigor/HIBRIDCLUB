import { publicPlanTemplate } from './publicPlanTemplate';

const DAY_LABELS = {
  A: 'Segunda',
  B: 'Terça',
  C: 'Quarta',
  D: 'Quinta',
  E: 'Sexta',
  F: 'Sabado',
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildMetadata(level, title) {
  return {
    sourceFile: `hibrid-club-${level}`,
    title,
    transcribedFromPdf: false,
    isTemplate: true,
    level,
    origin: 'template',
  };
}

function applySessionIdentity(planData) {
  Object.entries(planData.schedule || {}).forEach(([dayId, session]) => {
    if (!session) return;
    session.id = dayId;
    session.day = DAY_LABELS[dayId] || session.day || dayId;
  });
}

const basicTemplate = clone(publicPlanTemplate);
basicTemplate.metadata = buildMetadata('basic', 'Plano Hibrido Basico');
basicTemplate.general.focus = 'Base de força + corrida leve + consistência';
basicTemplate.schedule.A.name = 'Inferiores Base';
basicTemplate.schedule.B.name = 'Superiores Base';
basicTemplate.schedule.C.name = 'Cardio Base + Core';
basicTemplate.schedule.D.name = 'Posteriores Base';
basicTemplate.schedule.E.name = 'Superiores Volume Leve';
basicTemplate.schedule.F.name = 'Corrida Longa Base';
applySessionIdentity(basicTemplate);

const intermediateTemplate = clone(publicPlanTemplate);
intermediateTemplate.metadata = buildMetadata('intermediate', 'Plano Híbrido Intermediário');
intermediateTemplate.general.focus = 'Força híbrida com corrida estruturada';
intermediateTemplate.schedule.A.exercises[0].name = 'Agachamento frontal';
intermediateTemplate.schedule.B.exercises[0].name = 'Supino reto com pausa';
intermediateTemplate.schedule.C.exercises[0].name = 'Corrida progressiva';
intermediateTemplate.schedule.D.exercises[0].name = 'Levantamento terra convencional';
intermediateTemplate.schedule.E.exercises[0].name = 'Barra fixa pronada';
intermediateTemplate.schedule.F.exercises[0].name = 'Longao progressivo';
applySessionIdentity(intermediateTemplate);

const advancedTemplate = clone(publicPlanTemplate);
advancedTemplate.metadata = buildMetadata('advanced', 'Plano Hibrido Avancado');
advancedTemplate.general.focus = 'Alta performance em força e corrida';
advancedTemplate.schedule.A.exercises[0].name = 'Agachamento livre high-bar';
advancedTemplate.schedule.B.exercises[0].name = 'Supino com pausa longa';
advancedTemplate.schedule.C.exercises[0].name = 'Tempo run';
advancedTemplate.schedule.D.exercises[0].name = 'Terra pesado tecnico';
advancedTemplate.schedule.E.exercises[0].name = 'Remada curvada strict';
advancedTemplate.schedule.F.exercises[0].name = 'Longao com bloco forte final';
applySessionIdentity(advancedTemplate);

export const progressivePlanTemplates = [
  {
    slug: 'hibrid-club-basic',
    name: 'Basico',
    level: 'basic',
    description: 'Entrada progressiva com fundamentos de força e cardio.',
    plan_data: basicTemplate,
  },
  {
    slug: 'hibrid-club-intermediate',
    name: 'Intermediário',
    level: 'intermediate',
    description: 'Maior variedade tecnica e estrutura de evolucao semanal.',
    plan_data: intermediateTemplate,
  },
  {
    slug: 'hibrid-club-advanced',
    name: 'Avancado',
    level: 'advanced',
    description: 'Modelo intenso para usuarios com base consolidada.',
    plan_data: advancedTemplate,
  },
];

export function getFallbackTemplateBySlug(slug) {
  return progressivePlanTemplates.find((template) => template.slug === slug) || progressivePlanTemplates[0];
}
