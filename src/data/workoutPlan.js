export const workoutPlan = {
  general: {
    focus: "Hipertrofia + Corrida",
    tdee: 2841,
    waterLiters: 4.0
  },
  schedule: {
    A: {
      id: "A",
      day: "Segunda",
      name: "Inferiores Pesado",
      type: "Força Híbrida",
      themeColor: "primary-400",
      exercises: [
        { id: "e1", name: "Agachamento hack", sets: "4x6–8", type: "strength" },
        { id: "e2", name: "Leg press", sets: "3x8–10", type: "strength" },
        { id: "e3", name: "Terra romeno", sets: "3x8–10", type: "strength" },
        { id: "e4", name: "Cadeira extensora", sets: "3x10–12", type: "strength" },
        { id: "e5", name: "Mesa flexora", sets: "3x10–12", type: "strength" },
        { id: "e6", name: "Panturrilha", sets: "4x12–15", type: "strength" },
        { id: "e7", name: "Prancha (Core)", sets: "3x30–45s", type: "strength" },
        { id: "e_c1", name: "Corrida leve (Pós)", target: "20-30 min", type: "cardio" }
      ]
    },
    B: {
      id: "B",
      day: "Terça",
      name: "Superiores (Empurrar/Puxar)",
      type: "Força Híbrida",
      themeColor: "primary-400",
      exercises: [
        { id: "e8", name: "Supino reto", sets: "4x6–8", type: "strength" },
        { id: "e9", name: "Supino inclinado", sets: "3x8–10", type: "strength" },
        { id: "e10", name: "Desenvolvimento militar", sets: "3x8–10", type: "strength" },
        { id: "e11", name: "Barra fixa", sets: "4x6–10", type: "strength" },
        { id: "e12", name: "Remada curvada", sets: "3x8–10", type: "strength" },
        { id: "e13", name: "Tríceps testa", sets: "3x10–12", type: "strength" },
        { id: "e14", name: "Rosca direta", sets: "3x10–12", type: "strength" },
        { id: "e_c2", name: "HIIT", target: "8-10x", type: "cardio" }
      ]
    },
    C: {
      id: "C",
      day: "Quarta",
      name: "Corrida + Core",
      type: "Cardio",
      themeColor: "cyan-400",
      exercises: [
        { id: "e15", name: "Corrida moderada", target: "35–45 min", type: "cardio" },
        { id: "e16", name: "Elevação de pernas", sets: "3x10–15", type: "strength" },
        { id: "e17", name: "Abdominal com carga", sets: "3x12–15", type: "strength" },
        { id: "e18", name: "Prancha lateral", sets: "3x20–30s", type: "strength" }
      ]
    },
    D: {
      id: "D",
      day: "Quinta",
      name: "Inferiores Post / Glúteos",
      type: "Força Híbrida",
      themeColor: "primary-400",
      exercises: [
        { id: "e19", name: "Terra sumô", sets: "4x5–6", type: "strength" },
        { id: "e20", name: "Agacho frontal", sets: "3x8–10", type: "strength" },
        { id: "e21", name: "Stiff", sets: "3x8–10", type: "strength" },
        { id: "e22", name: "Glute bridge", sets: "3x10–12", type: "strength" },
        { id: "e23", name: "Adutora/Abdutora", sets: "3x12–15", type: "strength" },
        { id: "e_c3", name: "Tiros (10x100m forte)", target: "10 sprints", type: "cardio" }
      ]
    },
    E: {
      id: "E",
      day: "Sexta",
      name: "Superiores Costas/Ombros",
      type: "Força Híbrida",
      themeColor: "primary-400",
      exercises: [
        { id: "e24", name: "Puxada na frente", sets: "4x6–8", type: "strength" },
        { id: "e25", name: "Remada unilateral", sets: "3x8–10", type: "strength" },
        { id: "e26", name: "Remada cavalinho", sets: "3x8–10", type: "strength" },
        { id: "e27", name: "Desenvolvimento", sets: "3x8–10", type: "strength" },
        { id: "e28", name: "Elevação lateral", sets: "3x12–15", type: "strength" },
        { id: "e29", name: "Face pull", sets: "3x12–15", type: "strength" },
        { id: "e30", name: "Biceps/Tríceps Pump", sets: "2x15–20", type: "strength" },
        { id: "e_c4", name: "Corrida leve (Pós)", target: "20-30 min", type: "cardio" }
      ]
    },
    F: {
      id: "F",
      day: "Sábado",
      name: "Corrida Longa",
      type: "Cardio",
      themeColor: "cyan-400",
      exercises: [
        { id: "e31", name: "Corrida Longa (Z2)", target: "45–60+ min", type: "cardio" }
      ]
    }
  }
};
