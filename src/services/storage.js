export const STORAGE_KEY = '@hyperactive_logs';

export const saveWorkoutLog = (workoutId, exerciseId, kg, reps) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingStr = localStorage.getItem(STORAGE_KEY);
    const logs = existingStr ? JSON.parse(existingStr) : {};

    if (!logs[today]) {
        logs[today] = {
            date: today,
            workoutId,
            exercises: {}
        };
    }

    logs[today].exercises[exerciseId] = {
        kg: Number(kg),
        reps: Number(reps),
        timestamp: new Date().getTime()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return true;
  } catch (error) {
    console.error('Failed to save log', error);
    return false;
  }
};

export const getWorkoutHistory = () => {
    try {
        const existingStr = localStorage.getItem(STORAGE_KEY);
        return existingStr ? JSON.parse(existingStr) : {};
    } catch {
        return {};
    }
};

export const saveNutritionLog = (waterMl, calories) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const existingStr = localStorage.getItem(STORAGE_KEY);
        const logs = existingStr ? JSON.parse(existingStr) : {};

        if (!logs[today]) {
            logs[today] = { date: today, exercises: {}, nutrition: { water: 0, calories: 0 } };
        }
        
        if (!logs[today].nutrition) {
            logs[today].nutrition = { water: 0, calories: 0 };
        }

        logs[today].nutrition.water += parseInt(waterMl) || 0;
        logs[today].nutrition.calories += parseInt(calories) || 0;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        return logs[today].nutrition;
    } catch (e) {
        return null;
    }
};

export const getNutritionLog = () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const existingStr = localStorage.getItem(STORAGE_KEY);
        const logs = existingStr ? JSON.parse(existingStr) : {};
        if (logs[today] && logs[today].nutrition) return logs[today].nutrition;
        return { water:  0, calories: 0 };
    } catch {
        return { water: 0, calories: 0 };
    }
};
