import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5181/api', // .NET API URL
    headers: {
        'Content-Type': 'application/json'
    }
});

// A dummy UserId for testing until an authentication system is built
export const authApi = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    login: (data: any) => api.post('/auth/login', data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: (data: any) => api.post('/auth/register', data),
};

export const habitApi = {
    getUserHabits: (userId: string) => api.get(`/habits/user/${userId}`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createHabit: (data: any) => api.post('/habits', data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateHabit: (habitId: string, data: any) => api.put(`/habits/${habitId}`, data),                                                                               deleteHabit: (habitId: string) => api.delete(`/habits/${habitId}`),
};

export const scorecardApi = {
    logScorecard: (data: { habitId: string, userId: string, logDate: string, completionStatus: string }) => 
        api.post('/scorecard/log', data),
    getHabitScorecard: (habitId: string) => api.get(`/scorecard/habit/${habitId}`),
};

export const goalApi = {
    getUserGoals: (userId: string) => api.get(`/goals/user/${userId}`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createGoal: (data: any) => api.post('/goals', data),
};

export const journalApi = {
    getEntry: (userId: string, date: string) => api.get(`/journal/${userId}/${date}`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveEntry: (data: any) => api.post('/journal', data),
};

export const whiteboardApi = {
    getNotes: (userId: string) => api.get(`/whiteboard/${userId}`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    syncNotes: (data: any) => api.post('/whiteboard/sync', data),
};
