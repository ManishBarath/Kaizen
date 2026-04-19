import { useState, useEffect } from 'react';
import { journalApi } from '../api/client';
import { Sidebar } from '../components/Sidebar';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';

export const DailyJournal = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalText, setJournalText] = useState('');
  const [savedStatus, setSavedStatus] = useState('');

  // Format date to YYYY-MM-DD for storage keys
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // Load journal for selected date
    const dateStr = formatDateKey(selectedDate);
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;

    journalApi.getEntry(userId, dateStr)
      .then(res => {
        setJournalText(res.data?.content || '');
        setSavedStatus('');
      })
      .catch((err) => {
        console.error('Failed to fetch journal entry', err);
        setJournalText('');
        setSavedStatus('');
      });
  }, [selectedDate]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJournalText(e.target.value);
    setSavedStatus('Unsaved changes');
  };

  const handleSave = () => {
    const dateStr = formatDateKey(selectedDate);
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;

    setSavedStatus('Saving...');
    journalApi.saveEntry({
      userId: userId,
      logDate: dateStr,
      content: journalText
    })
    .then(() => {
      setSavedStatus('Saved');
      setTimeout(() => setSavedStatus(''), 2000);
    })
    .catch((err) => {
      console.error('Failed to save journal', err);
      setSavedStatus('Error saving');
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Calendar Helpers
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Mon = 0
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - startOffset + 1;
    if (day > 0 && day <= daysInMonthCount) return day;
    return null;
  });

  const weekDayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:bg-slate-950 pb-16 md:pb-0">
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Daily Journal</p>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reflect with intention</h1>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-sm">
                  <button
                    onClick={() => navigateDay('prev')}
                    className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-45 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigateDay('next')}
                    className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-950 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {selectedDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => setSelectedDate(new Date())}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-200"
                      >
                        Today
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-2 border-b border-slate-100 pb-3 text-center text-xs font-semibold uppercase text-slate-400 dark:border-slate-800">
                      {weekDayNames.map((day, i) => (
                        <div key={i}>{day}</div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-2">
                      {calendarDays.map((day, i) => {
                        if (!day) return <div key={i} className="h-10" />;

                        const isSelected = day === selectedDate.getDate();
                        const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                            className={`h-10 rounded-xl text-sm font-semibold transition ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 dark:bg-blue-600'
                                : isToday
                                  ? 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-200'
                                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  <div className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-sky-50 dark:bg-slate-950 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reflection</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Write your thoughts</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {savedStatus || 'Reading...'}
                        </span>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 flex-1 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <textarea
                        value={journalText}
                        onChange={handleTextChange}
                        placeholder="How was your day? What did you accomplish? Any thoughts or reflections?"
                        className="h-full w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-black outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                      />
                    </div>
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
