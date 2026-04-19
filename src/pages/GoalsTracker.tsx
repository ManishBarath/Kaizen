import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Check, Calendar, Trash2, Loader2, Flag, Target, TrendingUp, Plus } from 'lucide-react';
import { habitApi, scorecardApi } from '../api/client';
import type { Habit, ScorecardLog } from '../types';

type WeeklyRow = {
  id: string;
  action: string;
  logs: Record<number, ScorecardLog>;
  goal: string;
  isBackend: boolean;
};

export const GoalsTracker = () => {
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const days = ['MON', 'TUES', 'WED', 'THUR', 'FRI', 'SAT', 'SUN'];

  // Current week calculation (Start = Monday, End = Sunday)
  const { startOfWeek, endOfWeek } = useMemo(() => {
    const currentTempDate = new Date();
    const dayOfWeek = currentTempDate.getDay() === 0 ? 7 : currentTempDate.getDay();
    const start = new Date(currentTempDate);
    start.setDate(currentTempDate.getDate() - dayOfWeek + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return {
      startOfWeek: start,
      endOfWeek: end
    };
  }, []);

  const getDateForDayIndex = (index: number) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + index);
    return d;
  };

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem('USER_ID');
      if (!userId) return;

      const { data: userHabits } = await habitApi.getUserHabits(userId);
      const weeklyHabits = userHabits.filter((h: Habit) => h.frequency === 'Weekly');

      const logPromises = weeklyHabits.map((h: Habit) => scorecardApi.getHabitScorecard(h.id));
      const logResponses = await Promise.all(logPromises);

      const enrichedRows: WeeklyRow[] = weeklyHabits.map((habit: Habit, idx: number) => {
        const logsArray = logResponses[idx].data || [];
        const logsMap: Record<number, ScorecardLog> = {};
        
        logsArray.forEach((log: ScorecardLog) => {
          const logDate = new Date(log.logDate);
          logDate.setHours(0,0,0,0);
          
          // Check if this log belongs to the current week
          if (logDate >= startOfWeek && logDate <= endOfWeek) {
            // Find what day index (0-6)
            const dayDiff = Math.floor((logDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
            if (dayDiff >= 0 && dayDiff <= 6) {
              logsMap[dayDiff] = log;
            }
          }
        });

        // Simple hack: we store the numeric goal in Description as "Goal:5"
        let parsedGoal = '';
        if (habit.description?.startsWith('Goal:')) {
          parsedGoal = habit.description.replace('Goal:', '');
        }

        return {
          id: habit.id,
          action: habit.name,
          logs: logsMap,
          goal: parsedGoal,
          isBackend: true
        };
      });

      // Maintain at least 5 empty rows if none exist
      if (enrichedRows.length < 5) {
        const emptyRows = Array.from({ length: 5 - enrichedRows.length }, (_, i) => ({
          id: `temp-${Date.now()}-${i}`,
          action: '',
          logs: {},
          goal: '',
          isBackend: false
        }));
        setRows([...enrichedRows, ...emptyRows]);
      } else {
        setRows(enrichedRows);
      }
    } catch (error) {
      console.error('Failed to fetch weekly goals:', error);
    } finally {
      setLoading(false);
    }
  }, [startOfWeek, endOfWeek]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleActionChange = (id: string, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, action: value } : row));
  };

  const handleGoalChange = (id: string, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, goal: value } : row));
  };

  const saveRowToBackend = async (row: WeeklyRow) => {
    if (!row.action.trim()) return row; // Don't save empty rows
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return row;

    try {
      setIsSaving(true);
      if (row.isBackend) {
        await habitApi.updateHabit(row.id, {
          id: row.id,
          name: row.action.trim(),
          description: row.goal ? `Goal:${row.goal}` : '',
        });
        return row;
      } else {
        const res = await habitApi.createHabit({
          userId: userId,
          name: row.action.trim(),
          description: row.goal ? `Goal:${row.goal}` : '',
          frequency: 'Weekly',
          type: 'Positive'
        });
        // Returns { Id: 'guid' }
        return { ...row, id: res.data.id || row.id, isBackend: true };
      }
    } catch (error) {
      console.error('Failed to create/update habit:', error);
    } finally {
      setIsSaving(false);
    }
    return row;
  };

  const handleBlurRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const updatedRow = await saveRowToBackend(row);
    if (updatedRow.isBackend) {
      setRows(prev => prev.map(r => r.id === id ? updatedRow : r));
    }
  };

  const handleDeleteRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (row && row.isBackend) {
      try {
        await habitApi.deleteHabit(id);
      } catch (error) {
        console.error('Failed to delete backend habit:', error);
        return;
      }
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const handleToggleDaily = async (rowId: string, dayIndex: number) => {
    let row = rows.find(r => r.id === rowId);
    if (!row) return;

    // If it's a frontend-only row, save it first before tracking log!
    if (!row.isBackend && row.action.trim()) {
      row = await saveRowToBackend(row);
      setRows(prev => prev.map(r => r.id === rowId ? row! : r));
    }

    if (!row || !row.isBackend) return; // Cannot check an empty unsaved row

    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;

    const existingLog = row.logs[dayIndex];
    const newStatus = existingLog?.completionStatus === 'Completed' ? 'Skipped' : 'Completed';
    const logDate = getDateForDayIndex(dayIndex).toISOString();

    // Optimistic update
    const optimisticRows = rows.map(r => {
      if (r.id === row!.id) {
        return {
          ...r,
          logs: {
            ...r.logs,
            [dayIndex]: { ...existingLog, completionStatus: newStatus } as ScorecardLog
          }
        };
      }
      return r;
    });
    setRows(optimisticRows);

    try {
      await scorecardApi.logScorecard({
        habitId: row!.id,
        userId: userId,
        logDate: logDate,
        completionStatus: newStatus
      });
      // Optionally refetch or trust optimistic UI
    } catch (error) {
      console.error('Failed to toggle:', error);
      // Revert if error
      setRows(rows);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If we are on the last row and it's not empty, add a new row
      if (index === rows.length - 1 && rows[index].action.trim() !== '') {
        const newId = `temp-${Date.now()}`;
        setRows([...rows, { id: newId, action: '', logs: {}, goal: '', isBackend: false }]);
        
        setTimeout(() => {
          const nextInput = document.getElementById(`action-input-${newId}`);
          if (nextInput) nextInput.focus();
        }, 0);
      } else if (index < rows.length - 1) {
        const nextInput = document.getElementById(`action-input-${rows[index + 1].id}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:bg-slate-950 pb-16 md:pb-0">
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:bg-slate-950 pb-16 md:pb-0">
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Weekly Goals</p>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Weekly rhythm</h1>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Track actions and keep momentum visible.</p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  <span className="text-slate-400">—</span>
                  {endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-950">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Action</th>
                      {days.map(day => (
                        <th key={day} className="py-3 px-2 text-center text-xs font-semibold uppercase tracking-wider">{day}</th>
                      ))}
                      <th className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider">Achieved</th>
                      <th className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider">Goal</th>
                      <th className="py-3 px-3 text-center text-xs font-semibold uppercase tracking-wider">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((row, index) => {
                      const achieved = Object.values(row.logs).filter(l => l.completionStatus === 'Completed').length;
                      const parsedGoalNum = parseInt(row.goal) || 0;
                      const net = parsedGoalNum > 0 ? achieved - parsedGoalNum : 0;

                      return (
                        <tr key={row.id} className="group hover:bg-blue-50 dark:hover:bg-slate-900">
                          <td className="p-0 relative">
                            <div className="flex items-center w-full h-12">
                              <input
                                id={`action-input-${row.id}`}
                                type="text"
                                placeholder="Enter new action..."
                                value={row.action}
                                onChange={(e) => handleActionChange(row.id, e.target.value)}
                                onBlur={() => handleBlurRow(row.id)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className="w-full h-full px-4 outline-none bg-transparent text-slate-900 placeholder:text-slate-400 dark:text-white"
                              />
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Delete Action"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          {days.map((_, i) => (
                            <td key={i} className="p-0 border-l border-slate-100 dark:border-slate-800">
                              <label className="flex items-center justify-center w-full h-12 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={row.logs[i]?.completionStatus === 'Completed'}
                                  onChange={() => handleToggleDaily(row.id, i)}
                                />
                                <div className="w-4 h-4 rounded-sm border border-slate-300 bg-white dark:bg-slate-900 flex items-center justify-center transition-all peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 dark:peer-checked:bg-blue-600 dark:peer-checked:border-blue-600">
                                  <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                                </div>
                              </label>
                            </td>
                          ))}
                          <td className="p-0 border-l border-slate-100 dark:border-slate-800">
                            <div className="w-full h-12 flex items-center justify-center text-slate-900 dark:text-white font-semibold">
                              {achieved || 0}
                            </div>
                          </td>
                          <td className="p-0 border-l border-slate-100 dark:border-slate-800">
                            <input
                              type="text"
                              value={row.goal}
                              onChange={(e) => handleGoalChange(row.id, e.target.value)}
                              onBlur={() => handleBlurRow(row.id)}
                              placeholder="-"
                              className="w-full h-12 text-center outline-none bg-transparent text-slate-600 dark:text-slate-300"
                            />
                          </td>
                          <td className="p-0 border-l border-slate-100 dark:border-slate-800">
                            <div className={`w-full h-12 flex items-center justify-center font-semibold ${net > 0 ? 'text-emerald-600' : net < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                              {net > 0 ? `+${net}` : net}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <button
                  onClick={() => setRows([...rows, { id: `temp-${Date.now()}`, action: '', logs: {}, goal: '', isBackend: false }])}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>

                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                    <span className="uppercase tracking-[0.2em] text-slate-400">Summary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    Achieved: {Math.max(0, rows.reduce((acc, row) => acc + Object.values(row.logs).filter(l => l.completionStatus === 'Completed').length, 0))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5 text-slate-400" />
                    Goal: {rows.reduce((acc, row) => acc + (parseInt(row.goal) || 0), 0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    Net: {rows.reduce((acc, row) => acc + Object.values(row.logs).filter(l => l.completionStatus === 'Completed').length, 0) - rows.reduce((acc, row) => acc + (parseInt(row.goal) || 0), 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
