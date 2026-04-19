import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { habitApi, scorecardApi } from '../api/client';
import { Loader2, Trash2, Plus, GripVertical } from 'lucide-react';
import type { Habit, ScorecardLog } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type MonthlyHabitData = Habit & {
  logs: Record<string, ScorecardLog>;
  goalForMonth: number;
  completedThisMonth: number;
};

const CircularProgress = ({ percentage, colorClass }: { percentage: number, colorClass: string }) => (
  <div className="relative w-16 h-16 flex items-center justify-center">
    <svg className="w-full h-full transform -rotate-90">
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" className="text-slate-200 fill-transparent" />
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" strokeDasharray="175.9" strokeDashoffset={175.9 - (percentage / 100) * 175.9} className={`fill-transparent ${colorClass} transition-all duration-1000 ease-out`} />
    </svg>
    <span className="absolute text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-200">{percentage}%</span>
  </div>
);

function SortableHabitRow({ habit, displayedDays, getWeekData, isCurrentMonthYear, WEEK_BG_COLORS, viewMode, handleToggleLog, handleDeleteHabit }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative'
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-blue-100 dark:hover:bg-slate-800 ${isDragging ? 'bg-white shadow-xl dark:bg-slate-800' : ''}`}
    >
      <td className="py-3 px-6 text-slate-700 dark:text-slate-200 font-semibold sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center w-full min-w-40">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-move text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <span>{habit.name}</span>
          </div>
          <button
            onClick={() => handleDeleteHabit(habit.id)}
            className="rounded-lg p-1.5 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
            title="Delete Habit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
      {displayedDays.map((day: number) => {
        const checked = habit.logs[day]?.completionStatus === 'Completed';
        const { weekIdx, isEndOfWeek } = getWeekData(day);
        const isToday = new Date().getDate() === day && isCurrentMonthYear;
        return (
          <td key={day} className={`py-4 px-1 text-center ${isEndOfWeek ? 'border-r-2 border-slate-300' : 'border-r border-white dark:border-slate-800'} last:border-r-0 transition-colors cursor-pointer ${isToday ? 'bg-indigo-50 hover:bg-indigo-100' : WEEK_BG_COLORS[weekIdx]}`} onClick={() => handleToggleLog(habit.id, day)}>
            <div className="flex justify-center">
              <div className={`rounded-md border-2 flex items-center justify-center transition-all ${viewMode === 'weekly' ? 'w-8 h-8 rounded-xl' : 'w-5 h-5'} ${checked ? 'bg-blue-600 border-blue-600 scale-110 dark:bg-blue-600 dark:border-blue-600' : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500'}`}>
                {checked && <svg className={`${viewMode === 'weekly' ? 'w-5 h-5' : 'w-3 h-3'} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
            </div>
          </td>
        );
      })}
      <td className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-300 border-l border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800/80">{habit.goalForMonth}</td>
      <td className="py-3 px-6 border-l border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${(habit.completedThisMonth / habit.goalForMonth) * 100}%` }}></div>
          </div>
          <span className="text-xs font-semibold text-indigo-600 w-12 text-right">
            <span className="text-indigo-600 dark:text-indigo-400">{habit.completedThisMonth}</span> <span className="text-slate-400 dark:text-slate-300">/</span> <span className="text-slate-600 dark:text-slate-300">{habit.goalForMonth}</span>
          </span>
        </div>
      </td>
    </tr>
  );
}

export const MonthlyTracker = () => {
  const [habitsData, setHabitsData] = useState<MonthlyHabitData[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Habit State
  const [newHabitName, setNewHabitName] = useState('');
  const [monthlyNotes, setMonthlyNotes] = useState('');

  // Month and Year State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');

  // Dynamic calculations based on state
  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  
  // Calculate real calendar weeks (Monday as first day of week)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth; // 1(Mon) - 7(Sun)
  
  const weeks: [string, number][] = [];
  let currentDay = 1;
  let weekNum = 1;
  
  const daysInFirstWeek = 8 - adjustedFirstDay; // If Wed(3), 8-3 = 5 days
  if (daysInFirstWeek > 0 && daysInFirstWeek <= 7) {
    weeks.push(['WEEK-1', daysInFirstWeek]);
    currentDay += daysInFirstWeek;
    weekNum++;
  }
  
  while (currentDay <= daysInMonthCount) {
    const remainingDays = daysInMonthCount - currentDay + 1;
    const span = remainingDays >= 7 ? 7 : remainingDays;
    weeks.push([`WEEK-${weekNum}`, span]);
    currentDay += span;
    weekNum++;
  }

  // Handle Weekly / Monthly bounds
  const today = new Date();
  const isCurrentMonthYear = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  
  let displayedDays = daysInMonth;
  let displayedWeeks = weeks;
  
  if (viewMode === 'weekly') {
    const targetDay = isCurrentMonthYear ? today.getDate() : 1;
    let startDayIdx = 1;
    for (let i = 0; i < weeks.length; i++) {
      const span = weeks[i][1];
      if (targetDay >= startDayIdx && targetDay < startDayIdx + span) {
        displayedDays = Array.from({ length: span }, (_, j) => startDayIdx + j);
        displayedWeeks = [weeks[i]];
        break;
      }
      startDayIdx += span;
    }
  }

  const getWeekData = (day: number) => {
    let curr = 1;
    for (let i = 0; i < weeks.length; i++) {
      const span = weeks[i][1];
      if (day >= curr && day < curr + span) {
        return { weekIdx: Math.min(4, i), isEndOfWeek: day === curr + span - 1 };
      }
      curr += span;
    }
    return { weekIdx: 0, isEndOfWeek: false };
  };
  
  const WEEK_BG_COLORS = [
    'bg-red-50 hover:bg-red-100 dark:bg-rose-500/5 dark:hover:bg-rose-500/10',
    'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/5 dark:hover:bg-amber-500/10',
    'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10',
    'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/5 dark:hover:bg-blue-500/10',
    'bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/5 dark:hover:bg-purple-500/10'
  ];

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentYear(Number(e.target.value));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(Number(e.target.value));
  };

  useEffect(() => {
    const savedNotes = localStorage.getItem(`NOTES_${currentYear}_${currentMonth}`);
    if (savedNotes) {
      setMonthlyNotes(savedNotes);
    }
  }, [currentYear, currentMonth]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMonthlyNotes(val);
    localStorage.setItem(`NOTES_${currentYear}_${currentMonth}`, val);
  };

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem('USER_ID');
      if (!userId) return;
      
      const { data: userHabits } = await habitApi.getUserHabits(userId);
      const dailyHabits = userHabits.filter((h: Habit) => h.frequency === 'Daily');
      const enrichedHabits: MonthlyHabitData[] = [];
      
      // Fetch scorecard concurrently for all habits
      const logPromises = dailyHabits.map((h: Habit) => scorecardApi.getHabitScorecard(h.id));
      const logResponses = await Promise.all(logPromises);
      
      dailyHabits.forEach((habit: Habit, idx: number) => {
        const logsArray = logResponses[idx].data || [];
        const logsMap: Record<string, ScorecardLog> = {};
        let completedThisMonth = 0;
        
        logsArray.forEach((log: ScorecardLog) => {
          const logDate = new Date(log.logDate);
          if (logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth) {
            logsMap[logDate.getDate()] = log;
            if (log.completionStatus === 'Completed') completedThisMonth++;
          }
        });
        
        enrichedHabits.push({ ...habit, logs: logsMap, goalForMonth: daysInMonthCount, completedThisMonth });
      });

      const savedOrderStr = localStorage.getItem('HABITS_ORDER');
      if (savedOrderStr) {
        try {
          const savedOrder = JSON.parse(savedOrderStr) as string[];
          enrichedHabits.sort((a, b) => {
            const indexA = savedOrder.indexOf(a.id);
            const indexB = savedOrder.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        } catch (e) {
          console.error('Failed to parse habits order', e);
        }
      }

      setHabitsData(enrichedHabits);
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonthCount]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleToggleLog = async (habitId: string, day: number) => {
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;
    
    const dateStr = new Date(currentYear, currentMonth, day).toISOString();
    
    // Find current status
    const habit = habitsData.find(h => h.id === habitId);
    if (!habit) return;
    const currentLog = habit.logs[day];
    const newStatus = currentLog?.completionStatus === 'Completed' ? 'Failed' : 'Completed';
    
    // Optimistic UI updates
    setHabitsData(prev => prev.map(h => {
      if (h.id === habitId) {
        const logCopy = { ...h.logs };
        if (newStatus === 'Completed') {
          logCopy[day] = { id: 'temp', logDate: dateStr, completionStatus: 'Completed', metricValue: null, contextNotes: null };
          return { ...h, logs: logCopy, completedThisMonth: h.completedThisMonth + 1 };
        } else {
          logCopy[day] = { id: 'temp', logDate: dateStr, completionStatus: 'Failed', metricValue: null, contextNotes: null };
          return { ...h, logs: logCopy, completedThisMonth: h.completedThisMonth - 1 };
        }
      }
      return h;
    }));

    try {
      await scorecardApi.logScorecard({ habitId, userId, logDate: dateStr, completionStatus: newStatus });
      // we can optionally re-fetch here if needed
    } catch (error) {
      console.error('Error saving scorecard:', error);
      void fetchData(); // Rollback on error
    }
  };

  // Generate chart data dynamic to month
  const handleAddNewHabit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem('USER_ID');
    if (!userId || !newHabitName.trim()) return;

    try {
      await habitApi.createHabit({
        name: newHabitName,
        description: '',
        frequency: 'Daily',
        type: 'Good',
        userId: userId
      });
      setNewHabitName('');
      void fetchData(); // Refresh table
    } catch (error) {
      console.error('Failed to create new habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await habitApi.deleteHabit(habitId);
      void fetchData(); // Refresh
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setHabitsData((items) => {
        const oldIndex = items.findIndex(h => h.id === active.id);
        const newIndex = items.findIndex(h => h.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('HABITS_ORDER', JSON.stringify(newItems.map(h => h.id)));
        return newItems;
      });
    }
  };

  const chartData = daysInMonth.map(day => {
    let completedCount = 0;
    habitsData.forEach(h => {
      if (h.logs[day]?.completionStatus === 'Completed') completedCount++;
    });
    return { name: day.toString(), completed: completedCount };
  });

  const totalGoals = habitsData.length * daysInMonthCount;
  const totalCompleted = habitsData.reduce((acc, h) => acc + h.completedThisMonth, 0);
  const overallScoreScore = totalGoals === 0 ? 0 : Math.round((totalCompleted / totalGoals) * 100);

  let currentStartDayForScore = 1;
  const weeklyScores = weeks.map(([name, span]) => {
    const weekDays = Number(span);
    const startDay = currentStartDayForScore;
    currentStartDayForScore += weekDays;

    if (habitsData.length === 0) return { name, score: 0 };

    let completedThisWeek = 0;
    for (let day = startDay; day < startDay + weekDays; day++) {
      habitsData.forEach(h => {
        if (h.logs[day]?.completionStatus === 'Completed') completedThisWeek++;
      });
    }

    const maxWeekGoals = habitsData.length * weekDays;
    return {
      name: String(name),
      score: Math.round((completedThisWeek / maxWeekGoals) * 100)
    };
  });

  if (loading) return (
    <div className="flex flex-col md:flex-row bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 min-h-screen pb-16 md:pb-0">
      <Sidebar />
      <div className="flex-1 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:bg-slate-950 pb-16 md:pb-0">
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 overflow-x-hidden">
          <div className="mx-auto max-w-[95%] space-y-8">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-3 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">Monthly Tracker</p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Habit overview</h1>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={currentMonth}
                      onChange={handleMonthChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900/40"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                          {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={currentYear}
                      onChange={handleYearChange}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900/40"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return (
                          <option key={year} value={year} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                            {year}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-slate-600 shadow-inner dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <button
                        onClick={() => setViewMode('monthly')}
                        className={`flex-1 rounded-xl px-3 py-2 uppercase tracking-[0.2em] transition ${viewMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setViewMode('weekly')}
                        className={`flex-1 rounded-xl px-3 py-2 uppercase tracking-[0.2em] transition ${viewMode === 'weekly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                      >
                        Weekly
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-blue-100 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">Daily Progress</p>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion trend</span>
                  </div>
                  <div className="mt-4 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="completed" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-blue-100 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">Score</p>
                  <div className="mt-4 flex items-center justify-center">
                    <CircularProgress percentage={overallScoreScore} colorClass="text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-blue-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-4 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300 sticky left-0 bg-blue-100 dark:bg-slate-800 z-20 border-r border-slate-200 dark:border-slate-800">Daily Habits</th>
                      {displayedWeeks.map(([name, span]) => (
                        <th key={name} colSpan={Number(span)} className={`py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 border-r border-slate-200 last:border-r-0 ${WEEK_BG_COLORS[Math.min(4, weeks.findIndex(w => w[0] === name))]}`}>
                          {name}
                        </th>
                      ))}
                      <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">Goal</th>
                      <th className="py-4 px-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">Progress</th>
                    </tr>
                    <tr className="border-t border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800/80">
                      <td className="py-2 px-6 text-[10px] font-semibold text-slate-700 dark:text-slate-400 sticky left-0 bg-blue-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-800 tracking-[0.3em]">
                        {displayedDays.length} / {daysInMonthCount} DAYS
                      </td>
                      {displayedDays.map(day => {
                        const { weekIdx, isEndOfWeek } = getWeekData(day);
                        const isToday = new Date().getDate() === day && isCurrentMonthYear;
                        return (
                          <td key={day} className={`py-3 px-1 text-center text-xs font-semibold ${isEndOfWeek ? 'border-r-2 border-slate-300' : 'border-r border-white dark:border-slate-800'} last:border-r-0 ${WEEK_BG_COLORS[weekIdx]} ${isToday ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 dark:text-slate-300'}`}>
                            <div className="flex flex-col items-center gap-1">
                              {viewMode === 'weekly' && (
                                <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                                  {new Date(currentYear, currentMonth, day).toLocaleString('default', { weekday: 'short' })}
                                </span>
                              )}
                              <span className={`${isToday ? 'bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{day}</span>
                            </div>
                          </td>
                          );
                        })}
                        <td className="border-l border-slate-200 dark:border-slate-800"></td>
                        <td className="border-l border-slate-200 dark:border-slate-800 py-2 px-6 text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-right tracking-[0.3em]">COMPLETED</td>
                    </tr>
                  </thead>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={habitsData.map(h => h.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
                        {habitsData.length === 0 && (
                          <tr>
                              <td colSpan={displayedDays.length + 3} className="py-12 text-center text-slate-700 font-semibold bg-blue-50 dark:bg-slate-800/80">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center">
                                  <Plus className="w-6 h-6" />
                                </div>
                                No habits found. Start adding some below.
                              </div>
                            </td>
                          </tr>
                        )}
                        {habitsData.map((habit, index) => (
                           <SortableHabitRow 
                            key={habit.id}
                            habit={habit}
                            index={index}
                            displayedDays={displayedDays}
                            getWeekData={getWeekData}
                            isCurrentMonthYear={isCurrentMonthYear}
                            WEEK_BG_COLORS={WEEK_BG_COLORS}
                            viewMode={viewMode}
                            handleToggleLog={handleToggleLog}
                            handleDeleteHabit={handleDeleteHabit}
                          />
                        ))}
                        <tr className="bg-blue-50 dark:bg-slate-800/80">
                          <td className="sticky left-0 bg-blue-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-800 p-0 h-14">
                            <form onSubmit={handleAddNewHabit} className="flex items-center w-full h-full">
                              <input
                                type="text"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                                placeholder="Press enter to add new habit..."
                                className="w-full h-full px-6 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                              />
                            </form>
                          </td>
                          {displayedDays.map((day: number) => {
                            const { weekIdx, isEndOfWeek } = getWeekData(day);
                            const isToday = new Date().getDate() === day && isCurrentMonthYear;
                            return (
                              <td key={`add-${day}`} className={`py-4 p-0 h-14 ${isEndOfWeek ? 'border-r-2 border-slate-300' : 'border-r border-white dark:border-slate-800'} ${isToday ? 'bg-indigo-50' : WEEK_BG_COLORS[weekIdx]}`}>
                                <div className="flex items-center justify-center w-full h-full opacity-60">
                                  <div className={`${viewMode === 'weekly' ? 'w-8 h-8 rounded-xl' : 'w-5 h-5 rounded-md'} border-2 border-slate-200 bg-white dark:bg-slate-800`}></div>
                                </div>
                              </td>
                            );
                          })}
                          <td className="border-r border-slate-100 dark:border-slate-800 p-0 h-14 bg-blue-50 dark:bg-slate-800/80">
                            <input type="text" className="w-full h-full text-center outline-none bg-transparent font-semibold text-slate-500 dark:text-slate-400 opacity-60" readOnly value="-" />
                          </td>
                          <td className="p-0 h-14">
                            <input type="text" className="w-full h-full text-center outline-none bg-transparent font-semibold text-slate-500 dark:text-slate-400 opacity-60" readOnly value="-" />
                          </td>
                        </tr>
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-blue-100 dark:bg-slate-800 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">Weekly Progress</p>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-300">Scores by week</span>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-between gap-6">
                    {weeklyScores.map((week, idx) => {
                      const colors = ['text-teal-400', 'text-emerald-400', 'text-pink-400', 'text-amber-400', 'text-lime-500'];
                      return (
                        <div key={week.name} className="flex flex-col items-center gap-3">
                          <CircularProgress percentage={week.score} colorClass={colors[idx % colors.length]} />
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{String(week.name).replace('-', ' ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


              <div className="lg:col-span-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-blue-100 dark:bg-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden min-h-64">
                <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 text-center">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">Notes</h3>
                </div>
                <div className="p-1 flex-1">
                  <textarea
                    value={monthlyNotes}
                    onChange={handleNotesChange}
                    placeholder="Add some notes for this month..."
                    className="h-full w-full resize-none bg-transparent p-4 text-sm font-semibold text-black outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
