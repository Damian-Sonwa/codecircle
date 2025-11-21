import React from 'react';
import { Video, Gamepad2, BookOpen, Users, Share2 } from 'lucide-react';

const ClassroomSessionBoard = ({ group }) => {
  if (!group) return null;

  return (
    <div className="relative z-10 mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_25px_60px_-45px_rgba(59,130,246,0.4)] backdrop-blur-xl md:grid-cols-[1.4fr,1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">{group.name}</h3>
            <p className="text-xs text-white/70">
              {group.description || 'Welcome to your classroom workspace.'}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
            <Users className="h-3.5 w-3.5" />
            Live
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 pt-[56.25%]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/70">
            <Video className="h-10 w-10 text-cyan-300" />
            <p>Connect a video room to start streaming this session.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
          Learning Toolkit
        </h4>
        <div className="space-y-3 text-xs text-white/70">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Gamepad2 className="h-4 w-4 text-emerald-300" />
            <div>
              <p className="font-semibold text-white/80">Tech games</p>
              <p>Launch collaborative puzzles or code golf warmups.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <BookOpen className="h-4 w-4 text-sky-300" />
            <div>
              <p className="font-semibold text-white/80">Resource shelf</p>
              <p>Drop textbooks, slide decks, notebooks, or repo links.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Share2 className="h-4 w-4 text-purple-300" />
            <div>
              <p className="font-semibold text-white/80">Stage updates</p>
              <p>Pin agenda notes, breakout tasks, and closing reflections.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomSessionBoard;


