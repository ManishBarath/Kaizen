export interface Habit {
    id: string;
    name: string;
    description: string;
    type: string;
    frequency: string;
    currentStreak: number;
    longestStreak: number;
}

export interface Goal {
    id: string;
    title: string;
    motivationWhy: string;
    termType: string;
    targetDate: string | null;
    status: string;
}

export interface ScorecardLog {
    id: string;
    logDate: string;
    completionStatus: string;
    metricValue: number | null;
    contextNotes: string | null;
}
