import { publicPlanTemplate } from './publicPlanTemplate';

const DAY_LABELS = {
  A: 'Segunda',
  B: 'Terca',
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

const strength = (id, name, sets, note = '') => ({ id, name, sets, type: 'strength', ...(note ? { note } : {}) });
const cardio = (id, name, target, note = '') => ({ id, name, target, type: 'cardio', ...(note ? { note } : {}) });

const basicTemplate = clone(publicPlanTemplate);
basicTemplate.metadata = buildMetadata('basic', 'Plano Hibrido Basico');
basicTemplate.general.focus = 'Base de forca + corrida leve + consistencia';
basicTemplate.general.objective = 'Criar consistencia semanal com tecnica, controle de carga e cardio progressivo.';
basicTemplate.general.sessionsPerWeekTarget = 5;
basicTemplate.schedule.A = {
  id: 'A',
  day: DAY_LABELS.A,
  name: 'Inferiores Base',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Forca de pernas com padrao tecnico e finalizacao aerobica leve.',
  exercises: [
    strength('a1', 'Agachamento livre ou hack', '4x6-8'),
    strength('a2', 'Leg press', '3x10-12'),
    strength('a3', 'Levantamento terra romeno', '3x8-10'),
    strength('a4', 'Passada no smith', '3x10 por lado'),
    strength('a5', 'Mesa flexora', '3x10-12'),
    strength('a6', 'Panturrilha em pe', '4x12-15'),
    strength('a7', 'Prancha frontal', '3x30-45 s'),
    cardio('a8', 'Caminhada inclinada', '15-20 min'),
  ],
};
basicTemplate.schedule.B = {
  id: 'B',
  day: DAY_LABELS.B,
  name: 'Superiores Base',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Empurrar e puxar com volume moderado e foco em execucao.',
  exercises: [
    strength('b1', 'Supino reto com halter', '4x8-10'),
    strength('b2', 'Supino inclinado', '3x8-10'),
    strength('b3', 'Desenvolvimento sentado', '3x8-10'),
    strength('b4', 'Puxada frontal', '4x8-10'),
    strength('b5', 'Remada baixa', '3x10-12'),
    strength('b6', 'Triceps corda', '3x12-15'),
    strength('b7', 'Rosca direta', '3x10-12'),
    strength('b8', 'Face pull', '3x12-15'),
  ],
};
basicTemplate.schedule.C = {
  id: 'C',
  day: DAY_LABELS.C,
  name: 'Cardio Base + Recuperacao',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Dia cardio com ritmo confortavel e bloco final de recuperacao.',
  exercises: [
    cardio('c1', 'Corrida continua em zona confortavel', '30-36 min'),
    cardio('c2', 'Caminhada de recuperacao', '6-8 min'),
    cardio('c3', 'Alongamento de quadriceps', '2x30-40 s por lado'),
    cardio('c4', 'Alongamento de adutor', '2x30-40 s por lado'),
    cardio('c5', 'Mobilidade de quadril em circulos', '2x8 por lado'),
    cardio('c6', 'Respiracao diafragmatica', '3x1 min'),
  ],
};
basicTemplate.schedule.D = {
  id: 'D',
  day: DAY_LABELS.D,
  name: 'Posteriores Base',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Cadeia posterior com gluteos e estabilidade de tronco.',
  exercises: [
    strength('d1', 'Terra sumo leve tecnico', '4x5-6'),
    strength('d2', 'Agachamento frontal', '3x8-10'),
    strength('d3', 'Stiff com halter', '3x8-10'),
    strength('d4', 'Hip thrust', '3x10-12'),
    strength('d5', 'Cadeira abdutora', '3x12-15'),
    strength('d6', 'Panturrilha sentado', '4x12-15'),
    strength('d7', 'Pallof press', '3x10 por lado'),
  ],
};
basicTemplate.schedule.E = {
  id: 'E',
  day: DAY_LABELS.E,
  name: 'Superiores Volume',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Costas e ombros com alto controle de tecnica.',
  exercises: [
    strength('e1', 'Barra assistida ou puxada neutra', '4x8-10'),
    strength('e2', 'Remada unilateral', '3x10 por lado'),
    strength('e3', 'Remada cavalinho', '3x8-10'),
    strength('e4', 'Desenvolvimento militar', '3x8-10'),
    strength('e5', 'Elevacao lateral', '3x12-15'),
    strength('e6', 'Crucifixo invertido', '3x12-15'),
    strength('e7', 'Biceps alternado', '3x10-12'),
    strength('e8', 'Triceps testa', '3x10-12'),
  ],
};
basicTemplate.schedule.F = {
  id: 'F',
  day: DAY_LABELS.F,
  name: 'Corrida Longa Base',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Base aerobica de sabado com progressao gradual de tempo.',
  exercises: [
    cardio('f1', 'Corrida longa continua', '45-55 min'),
    cardio('f2', 'Bloco final progressivo', '8 min'),
    cardio('f3', 'Caminhada de retorno', '6 min'),
    cardio('f4', 'Alongamento de panturrilha', '2x30-40 s por lado'),
    cardio('f5', 'Alongamento de posterior', '2x30-40 s por lado'),
    cardio('f6', 'Respiracao para recuperar frequencia', '3x1 min'),
  ],
};
applySessionIdentity(basicTemplate);

const intermediateTemplate = clone(publicPlanTemplate);
intermediateTemplate.metadata = buildMetadata('intermediate', 'Plano Hibrido Intermediario');
intermediateTemplate.general.focus = 'Forca hibrida com corrida estruturada';
intermediateTemplate.general.objective = 'Evoluir carga, densidade de treino e capacidade de corrida com controle.';
intermediateTemplate.general.sessionsPerWeekTarget = 6;
intermediateTemplate.schedule.A = {
  id: 'A',
  day: DAY_LABELS.A,
  name: 'Inferiores Forca',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Dia principal de pernas com finalizacao de velocidade curta.',
  exercises: [
    strength('ia1', 'Agachamento frontal', '5x5-6'),
    strength('ia2', 'Leg press pesado', '4x8'),
    strength('ia3', 'Terra romeno', '4x8'),
    strength('ia4', 'Afundo bulgaro', '3x10 por lado'),
    strength('ia5', 'Mesa flexora unilateral', '3x10-12'),
    strength('ia6', 'Panturrilha em pe', '4x12-15'),
    strength('ia7', 'Prancha com carga', '3x35-45 s'),
    cardio('ia8', 'Tiros curtos em esteira', '8x20 s forte / 60 s leve'),
  ],
};
intermediateTemplate.schedule.B = {
  id: 'B',
  day: DAY_LABELS.B,
  name: 'Superiores Forca + Corrida',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Empurrar e puxar com bloco aerobico moderado no final.',
  exercises: [
    strength('ib1', 'Supino reto com pausa', '5x4-6'),
    strength('ib2', 'Supino inclinado halter', '3x8-10'),
    strength('ib3', 'Desenvolvimento em pe', '4x6-8'),
    strength('ib4', 'Barra fixa pronada', '4x6-8'),
    strength('ib5', 'Remada curvada', '4x8'),
    strength('ib6', 'Face pull', '3x12-15'),
    strength('ib7', 'Triceps corda', '3x12'),
    cardio('ib8', 'Corrida Z2', '18-25 min'),
  ],
};
intermediateTemplate.schedule.C = {
  id: 'C',
  day: DAY_LABELS.C,
  name: 'Tempo Run',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Ritmo sustentado com foco em tecnica de respiracao e postura.',
  exercises: [
    cardio('ic1', 'Aquecimento leve', '8-10 min'),
    cardio('ic2', 'Tempo run', '3x8 min (2 min leve)'),
    cardio('ic3', 'Desaquecimento', '6-8 min'),
    cardio('ic4', 'Alongamento de panturrilha e soleo', '2x35-45 s por lado'),
    cardio('ic5', 'Alongamento de quadriceps', '2x35-45 s por lado'),
    cardio('ic6', 'Respiracao controlada', '3x1 min'),
  ],
};
intermediateTemplate.schedule.D = {
  id: 'D',
  day: DAY_LABELS.D,
  name: 'Posterior + Potencia',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Posterior de coxa e gluteos com potencia controlada.',
  exercises: [
    strength('id1', 'Levantamento terra convencional', '5x3-5'),
    strength('id2', 'Agachamento pausa curta', '4x6-8'),
    strength('id3', 'Stiff barra', '4x8'),
    strength('id4', 'Hip thrust pesado', '4x8-10'),
    strength('id5', 'Passada reversa', '3x10 por lado'),
    strength('id6', 'Panturrilha sentado', '4x12-15'),
    strength('id7', 'Pallof press', '3x12 por lado'),
    cardio('id8', 'Bike sprint', '10x15 s forte / 45 s leve'),
  ],
};
intermediateTemplate.schedule.E = {
  id: 'E',
  day: DAY_LABELS.E,
  name: 'Costas e Ombros Volume',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Volume tecnico para dorsal, ombros e bracos.',
  exercises: [
    strength('ie1', 'Barra fixa neutra', '4x8'),
    strength('ie2', 'Remada unilateral apoiada', '4x10 por lado'),
    strength('ie3', 'Remada baixa triangulo', '3x10-12'),
    strength('ie4', 'Desenvolvimento halter', '3x8-10'),
    strength('ie5', 'Elevacao lateral', '4x12-15'),
    strength('ie6', 'Crucifixo invertido', '3x12-15'),
    strength('ie7', 'Rosca alternada', '3x10-12'),
    strength('ie8', 'Triceps frances', '3x10-12'),
  ],
};
intermediateTemplate.schedule.F = {
  id: 'F',
  day: DAY_LABELS.F,
  name: 'Longao Intermediario',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Corrida longa com bloco final mais forte.',
  exercises: [
    cardio('if1', 'Corrida longa continua', '55-70 min'),
    cardio('if2', 'Bloco final em ritmo moderado', '10-12 min'),
    cardio('if3', 'Trote ou caminhada para recuperar', '6-8 min'),
    cardio('if4', 'Mobilidade de quadril', '2x35-45 s por lado'),
    cardio('if5', 'Alongamento cadeia posterior', '2x35-45 s por lado'),
    cardio('if6', 'Respiracao diafragmatica', '4x1 min'),
  ],
};
applySessionIdentity(intermediateTemplate);

const advancedTemplate = clone(publicPlanTemplate);
advancedTemplate.metadata = buildMetadata('advanced', 'Plano Hibrido Avancado');
advancedTemplate.general.focus = 'Alta performance em forca e corrida';
advancedTemplate.general.objective = 'Maximizar performance com alto controle de fadiga e progressao semanal.';
advancedTemplate.general.sessionsPerWeekTarget = 6;
advancedTemplate.schedule.A = {
  id: 'A',
  day: DAY_LABELS.A,
  name: 'Lower Power',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Pernas pesadas com potencia e finalizacao de velocidade.',
  exercises: [
    strength('aa1', 'Agachamento high-bar', '5x3-5'),
    strength('aa2', 'Agachamento frontal pausa', '4x5-6'),
    strength('aa3', 'Levantamento terra romeno', '4x6-8'),
    strength('aa4', 'Passada bulgara', '3x8 por lado'),
    strength('aa5', 'Nordic assistido', '3x6-8'),
    strength('aa6', 'Panturrilha em pe', '5x10-12'),
    strength('aa7', 'Core anti-rotacao', '3x12 por lado'),
    cardio('aa8', 'Sprints curtos', '10x15 s forte / 45 s leve'),
  ],
};
advancedTemplate.schedule.B = {
  id: 'B',
  day: DAY_LABELS.B,
  name: 'Upper Strength',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Supino e puxadas com alta intensidade e tecnico rigoroso.',
  exercises: [
    strength('ab1', 'Supino com pausa longa', '6x3-4'),
    strength('ab2', 'Supino inclinado barra', '4x6-8'),
    strength('ab3', 'Desenvolvimento militar em pe', '4x6'),
    strength('ab4', 'Barra fixa com carga', '5x4-6'),
    strength('ab5', 'Remada curvada strict', '4x6-8'),
    strength('ab6', 'Face pull', '3x12-15'),
    strength('ab7', 'Rosca barra W', '3x8-10'),
    strength('ab8', 'Triceps testa barra', '3x8-10'),
  ],
};
advancedTemplate.schedule.C = {
  id: 'C',
  day: DAY_LABELS.C,
  name: 'Tempo Run Avancado',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Dia de limiar com blocos de tempo e estabilidade.',
  exercises: [
    cardio('ac1', 'Aquecimento leve', '10 min'),
    cardio('ac2', 'Tempo run', '3x10 min (2 min leve)'),
    cardio('ac3', 'Desaquecimento', '8 min'),
    cardio('ac4', 'Alongamento de quadriceps', '2x40-50 s por lado'),
    cardio('ac5', 'Alongamento de adutor', '2x40-50 s por lado'),
    cardio('ac6', 'Respiracao diafragmatica', '4x1 min'),
  ],
};
advancedTemplate.schedule.D = {
  id: 'D',
  day: DAY_LABELS.D,
  name: 'Posterior Heavy',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Posterior intenso com foco em cadeia completa.',
  exercises: [
    strength('ad1', 'Terra pesado tecnico', '6x2-4'),
    strength('ad2', 'Agachamento box', '4x5-6'),
    strength('ad3', 'Hip thrust', '4x8'),
    strength('ad4', 'Stiff barra', '4x6-8'),
    strength('ad5', 'Afundo reverso', '3x8 por lado'),
    strength('ad6', 'Panturrilha sentado', '5x10-12'),
    strength('ad7', 'Pallof press', '3x12 por lado'),
    cardio('ad8', 'Assault bike', '12x15 s forte / 45 s leve'),
  ],
};
advancedTemplate.schedule.E = {
  id: 'E',
  day: DAY_LABELS.E,
  name: 'Upper Volume + Threshold',
  type: 'Forca Hibrida',
  themeColor: 'primary-400',
  summary: 'Volume superior com bloco de corrida moderada no final.',
  exercises: [
    strength('ae1', 'Barra fixa pronada', '4x6-8'),
    strength('ae2', 'Remada unilateral', '4x8 por lado'),
    strength('ae3', 'Remada baixa', '3x10'),
    strength('ae4', 'Desenvolvimento halter', '4x8'),
    strength('ae5', 'Elevacao lateral', '4x12-15'),
    strength('ae6', 'Crucifixo invertido', '3x12-15'),
    strength('ae7', 'Rosca alternada inclinada', '3x10-12'),
    cardio('ae8', 'Corrida ritmo moderado', '20-25 min'),
  ],
};
advancedTemplate.schedule.F = {
  id: 'F',
  day: DAY_LABELS.F,
  name: 'Longao Avancado',
  type: 'Cardio',
  themeColor: 'cyan-400',
  summary: 'Longao com progressao e bloco final forte.',
  exercises: [
    cardio('af1', 'Corrida longa', '70-90 min'),
    cardio('af2', 'Bloco final forte', '12-15 min'),
    cardio('af3', 'Trote de recuperacao', '8 min'),
    cardio('af4', 'Mobilidade tornozelo e quadril', '2x40-50 s por lado'),
    cardio('af5', 'Alongamento posterior e gluteo', '2x40-50 s por lado'),
    cardio('af6', 'Respiracao e recuperacao ativa', '5x1 min'),
  ],
};
applySessionIdentity(advancedTemplate);

export const progressivePlanTemplates = [
  {
    slug: 'hibrid-club-basic',
    name: 'Basico',
    level: 'basic',
    description: 'Entrada progressiva com volume completo e cardio controlado.',
    plan_data: basicTemplate,
  },
  {
    slug: 'hibrid-club-intermediate',
    name: 'Intermediario',
    level: 'intermediate',
    description: 'Mais intensidade, mais densidade de treino e corrida estruturada.',
    plan_data: intermediateTemplate,
  },
  {
    slug: 'hibrid-club-advanced',
    name: 'Avancado',
    level: 'advanced',
    description: 'Modelo de alta performance com forca e corrida em alto nivel.',
    plan_data: advancedTemplate,
  },
];

export function getFallbackTemplateBySlug(slug) {
  return progressivePlanTemplates.find((template) => template.slug === slug) || progressivePlanTemplates[0];
}
