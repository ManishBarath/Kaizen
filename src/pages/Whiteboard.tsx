import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Plus, Trash2, GripHorizontal } from 'lucide-react';
import { whiteboardApi } from '../api/client';

type StickyNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

const NOTE_COLORS = [
  'bg-sky-100',
  'bg-blue-100',
  'bg-indigo-100',
  'bg-cyan-100',
  'bg-blue-50',
  'bg-sky-50'
];

export const Whiteboard = () => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;
    
    whiteboardApi.getNotes(userId)
      .then(res => {
        setNotes(res.data || []);
        setIsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load notes', err);
        setIsLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const userId = localStorage.getItem('USER_ID');
    if (!userId) return;

    const timer = setTimeout(() => {
      whiteboardApi.syncNotes({ userId, notes }).catch(err => {
        console.error('Failed to sync whiteboard', err);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, isLoaded]);

  const addNote = () => {
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      text: '',
      x: -pan.x + window.innerWidth / 2 - 100,
      y: -pan.y + window.innerHeight / 2 - 100,
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
    };
    setNotes([...notes, newNote]);
  };

  const updateNote = (id: string, text: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If middle click or space+click (often used for panning), or directly clicking the background
    if ((e.target as HTMLElement).id === 'whiteboard-canvas') {
      setIsPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    } else if (draggedNote) {
      setNotes(notes.map(n => 
        n.id === draggedNote 
          ? { ...n, x: n.x + e.movementX, y: n.y + e.movementY } 
          : n
      ));
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setDraggedNote(null);
  };

  const handleNoteDragStart = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setDraggedNote(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-50 via-blue-50 to-indigo-100 dark:bg-slate-950 pb-16 md:pb-0">
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="flex-1 relative">
          <div className="absolute top-6 left-6 z-20">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Whiteboard</p>
                <h1 className="text-lg font-semibold">Ideas and sticky notes</h1>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
              <button
                onClick={addNote}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New sticky
              </button>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 z-20">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Tip: drag the background to pan
            </div>
          </div>

          <div
            id="whiteboard-canvas"
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          >
            <div
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            >
              {notes.map(note => (
                <div
                  key={note.id}
                    className={`absolute pointer-events-auto rounded-2xl shadow-[0_12px_20px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden resize min-w-52 min-h-52 ${note.color} transition-shadow hover:shadow-[0_16px_30px_rgba(15,23,42,0.18)] focus-within:shadow-[0_16px_30px_rgba(15,23,42,0.18)]`}
                  style={{
                    transform: `translate(${note.x}px, ${note.y}px)`,
                    zIndex: draggedNote === note.id ? 50 : 10
                  }}
                >
                  <div
                    onPointerDown={(e) => handleNoteDragStart(e, note.id)}
                    className="h-9 bg-white/40 dark:bg-slate-900/40 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing border-b border-slate-200 dark:border-slate-700"
                  >
                    <GripHorizontal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <button
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    value={note.text}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    placeholder="Capture an idea..."
                    className="flex-1 w-full bg-transparent resize-none p-4 text-slate-800 placeholder-slate-800/50 outline-none leading-relaxed font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
