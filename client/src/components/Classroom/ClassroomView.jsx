import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  CalendarPlus,
  Loader2,
  Users,
  Video,
  Gamepad2,
  BookOpen,
  Info,
  Camera,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

const isClassroomGroup = (group) => {
  if (!group) return false;
  if (group.type === 'classroom') return true;
  const name = group.name?.toLowerCase() || '';
  const description = group.description?.toLowerCase() || '';
  const topics = Array.isArray(group.topics)
    ? group.topics.map((topic) => topic.toLowerCase())
    : [];
  return (
    topics.includes('classroom') ||
    topics.includes('workshop') ||
    name.includes('classroom') ||
    name.includes('workshop') ||
    description.includes('classroom session') ||
    description.includes('learning lab')
  );
};

const classroomToolkit = [
  {
    title: 'Live Video Lounge',
    description: 'Open a dedicated video room for pair programming or walk-throughs.',
    icon: Video,
  },
  {
    title: 'Interactive Tech Games',
    description: 'Kick off sessions with coding warmups, quizzes, or collaborative puzzles.',
    icon: Gamepad2,
  },
  {
    title: 'Resource Library',
    description: 'Share slide decks, textbooks, datasets, and project briefs in one place.',
    icon: BookOpen,
  },
  {
    title: 'Recording & Recaps',
    description: 'Capture the session, add highlights, and share replays in minutes.',
    icon: Camera,
  },
];

const ClassroomView = ({
  groups = [],
  onCreateSession,
  onSelectGroup,
  requests = [],
  feedback,
  onDismissFeedback,
}) => {
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [interestTrack, setInterestTrack] = useState('');
  const [interestGoals, setInterestGoals] = useState('');
  const [requestType, setRequestType] = useState('teach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const classroomGroups = useMemo(
    () => groups.filter((group) => isClassroomGroup(group)),
    [groups]
  );

  const groupLookup = useMemo(() => {
    const map = new Map();
    classroomGroups.forEach((group) => map.set(group.groupId, group));
    return map;
  }, [classroomGroups]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests]
  );
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === 'approved'),
    [requests]
  );
  const declinedRequests = useMemo(
    () => requests.filter((request) => request.status === 'declined'),
    [requests]
  );

  const handleCreateSession = async (event) => {
    event.preventDefault();
    if (!onCreateSession) return;
    if (requestType === 'teach' && !sessionName.trim()) return;
    if (requestType === 'join' && !interestTrack.trim()) return;

    setIsSubmitting(true);
    setError('');
    setLocalSuccess('');

    try {
      if (requestType === 'teach') {
        await onCreateSession({
          name: sessionName.trim(),
          description: sessionDescription.trim(),
        });
        setSessionName('');
        setSessionDescription('');
        setLocalSuccess(
          'Teaching request submitted. Please hold on while an admin reviews and approves it.'
        );
      } else {
        await onCreateSession({
          name: `Join request: ${interestTrack.trim()}`,
          description:
            interestGoals.trim() ||
            'Learner is interested in participating in this classroom session.',
        });
        setInterestTrack('');
        setInterestGoals('');
        setLocalSuccess(
          'Join request submitted. You will be notified once an admin confirms your seat.'
        );
      }
    } catch (creationError) {
      console.error('Failed to submit classroom request', creationError);
      setError(
        creationError?.response?.data?.error ||
          'Unable to submit a classroom request right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTone = feedback?.type || (localSuccess ? 'success' : 'info');
  const feedbackStyles = {
    success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    pending: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
    error: 'border-red-400/40 bg-red-500/10 text-red-100',
    info: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100',
  };
  const feedbackMessage = feedback?.message || localSuccess;

  const renderRequestCard = (request) => {
    const statusColors = {
      pending: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
      approved: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
      declined: 'border-red-400/40 bg-red-500/10 text-red-100',
    };
    const linkedGroup = request.groupId ? groupLookup.get(request.groupId) : null;
    return (
      <div
        key={request.requestId}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white">{request.name}</span>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${statusColors[request.status]}`}
          >
            {request.status}
          </span>
        </div>
        {request.description && (
          <p className="mt-2 text-xs text-white/60 leading-relaxed">{request.description}</p>
        )}
        {request.systemMessage && (
          <p className="mt-2 text-xs text-white/65 leading-relaxed">
            {request.systemMessage.message}
          </p>
        )}
        {request.status === 'approved' && linkedGroup && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                onSelectGroup?.({
                  type: 'group',
                  id: linkedGroup.groupId,
                  name: linkedGroup.name,
                  groupType: linkedGroup.type,
                  meta: { group: linkedGroup },
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-100 hover:bg-emerald-500/20"
            >
              <Layers className="h-3.5 w-3.5" />
              Enter classroom
            </button>
            <button
              onClick={() => window.open(`https://meet.jit.si/${linkedGroup.groupId}`, '_blank')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-100 hover:bg-cyan-500/20"
            >
              <Camera className="h-3.5 w-3.5" />
              Launch video
            </button>
            <button
              onClick={() =>
                window.open('https://zoom.us/wc/join', '_blank', 'noopener,noreferrer')
              }
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70 hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Zoom room
            </button>
          </div>
        )}
        {request.status === 'declined' && request.adminNotes && (
          <p className="mt-2 text-[11px] text-red-200/80">
            Admin note: {request.adminNotes}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gradient-to-br from-[#040b17] via-[#0c1524] to-[#152238]">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#22d3ee1a,transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'url(https://grainy-gradient.vercel.app/noise.svg)' }}
        />
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-[32px] border border-white/10 bg-white/10 backdrop-blur-xl px-5 sm:px-6 md:px-10 py-6 sm:py-7 shadow-[0_35px_80px_-45px_rgba(14,165,233,0.45)] text-white"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                <GraduationCap className="h-4 w-4" />
                Classroom Sessions
              </div>
              <h2 className="text-3xl font-semibold">Host learning labs with your peers</h2>
              <p className="text-sm text-white/80 max-w-2xl leading-relaxed">
                Launch focused workshops, peer-to-peer classes, or accountability sprints. Each
                session spins up a dedicated space for resources, discussions, and follow-ups once
                approved by an admin.
              </p>
            </div>
          </div>
        </motion.section>

        {feedbackMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm flex items-start gap-3 ${
              feedbackStyles[feedbackTone] || feedbackStyles.info
            }`}
          >
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{feedbackMessage}</p>
            </div>
            {(onDismissFeedback || localSuccess) && (
              <button
                onClick={() => {
                  onDismissFeedback?.();
                  setLocalSuccess('');
                }}
                className="text-xs uppercase tracking-[0.25em] text-white/80 hover:text-white"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="space-y-6 rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-5 sm:px-6 py-6 shadow-[0_25px_60px_-45px_rgba(14,165,233,0.3)]"
          >
            <div className="flex items-center justify-between gap-3 text-white/80">
              <div>
                <h3 className="text-lg font-semibold text-white">Upcoming & active sessions</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Join a classroom you facilitate or follow
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                {classroomGroups.length} sessions
              </span>
            </div>

            <div className="space-y-4">
              {classroomGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-8 text-center text-sm text-white/70">
                  No classroom sessions yet. Submit a new learning lab request to get started.
                </div>
              ) : (
                classroomGroups.map((group) => (
                  <motion.div
                    key={group.groupId}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="space-y-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-5 transition hover:border-cyan-300/50 hover:bg-cyan-500/10"
                  >
                    <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xl font-semibold text-white">{group.name}</h4>
                        <p className="mt-1 text-sm text-white/70 leading-relaxed">
                          {group.description || 'A collaborative classroom session for live training and peer learning.'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/60">
                            <Users className="h-3.5 w-3.5" />
                            {group.memberCount ?? group.members?.length ?? 0} participants
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-cyan-200">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Live Classroom
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full"
                          onClick={() =>
                            onSelectGroup?.({
                              type: 'group',
                              id: group.groupId,
                              name: group.name,
                              groupType: group.type,
                              meta: { group },
                            })
                          }
                        >
                          Open chat & resources
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10"
                          onClick={() => window.open(`https://meet.jit.si/${group.groupId}`, '_blank')}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Launch camera
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 space-y-2 text-sm text-white/70">
                        <div className="inline-flex items-center gap-2 text-white">
                          <Video className="h-4 w-4 text-cyan-300" />
                          Live Training Hub
                        </div>
                        <p>Use the video lounge for live coding, demos, or guest lectures. Share your screen, record the session, and keep collaborators engaged.</p>
                        <button
                          onClick={() => window.open('https://zoom.us/wc/join', '_blank')}
                          className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-cyan-200 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open Zoom template
                        </button>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 space-y-2 text-sm text-white/70">
                        <div className="inline-flex items-center gap-2 text-white">
                          <BookOpen className="h-4 w-4 text-emerald-300" />
                          Materials & Library
                        </div>
                        <p>Drop lesson notes, slides, datasets, and recap summaries in the classroom chat. Pin the essentials so everyone stays aligned.</p>
                        <button
                          onClick={() =>
                            onSelectGroup?.({
                              type: 'group',
                              id: group.groupId,
                              name: group.name,
                              groupType: group.type,
                              meta: { group },
                            })
                          }
                          className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-200 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open resource board
                        </button>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4 space-y-2 text-sm text-white/70">
                        <div className="inline-flex items-center gap-2 text-white">
                          <Gamepad2 className="h-4 w-4 text-purple-300" />
                          Tech Games & Warmups
                        </div>
                        <p>Break the ice with quizzes, pair challenges, or speed-solving puzzles. Great for energizing the classroom before deep dives.</p>
                        <button
                          onClick={() => window.open('https://techgames.app/?ref=chaturway', '_blank')}
                          className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-purple-200 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Launch games
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: 'Resource Hub',
                  icon: BookOpen,
                  accent: 'text-emerald-300',
                  cta: () =>
                    onSelectGroup?.({
                      type: 'group',
                      id: group.groupId,
                      name: group.name,
                      groupType: group.type,
                      meta: { group },
                    }),
                  ctaLabel: 'View materials',
                },
                {
                  title: 'Tech Games',
                  icon: Gamepad2,
                  accent: 'text-purple-300',
                  cta: () => window.open('https://techgames.app/?ref=chaturway', '_blank'),
                  ctaLabel: 'Launch game',
                },
                {
                  title: 'Request Support',
                  icon: Users,
                  accent: 'text-cyan-300',
                  cta: () => window.open('mailto:classrooms@chaturway.com'),
                  ctaLabel: 'Contact admin',
                },
              ].map(({ title, icon: Icon, accent, cta, ctaLabel }) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70 shadow-sm"
                >
                  <div className="inline-flex items-center gap-2 text-white">
                    <Icon className={`h-4 w-4 ${accent}`} />
                    <span className="font-semibold text-white/85">{title}</span>
                  </div>
                  <button
                    onClick={cta}
                    className="mt-3 inline-flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/70 hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {ctaLabel}
                  </button>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="space-y-5 rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-6 shadow-[0_25px_60px_-45px_rgba(14,165,233,0.3)] text-white"
          >
            <div className="flex flex-col gap-2 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                <CalendarPlus className="h-4 w-4 text-cyan-300" />
                Submit a classroom request
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                  Choose request type
                </label>
                <select
                  value={requestType}
                  onChange={(event) => {
                    setRequestType(event.target.value);
                    setError('');
                    setLocalSuccess('');
                  }}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                >
                  <option value="teach">Request to teach</option>
                  <option value="join">Request to join</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-white/60">
              {requestType === 'teach'
                ? 'Pitch a classroom you want to facilitate. Tell the community what you’ll cover, the tools required, and the outcomes you’re targeting.'
                : 'Request a seat in an upcoming classroom. Share what you want to learn so the facilitator can tailor the experience.'}
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              {requestType === 'teach' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Session title
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(event) => setSessionName(event.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                      placeholder="e.g. React Performance Lab"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Overview (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={sessionDescription}
                      onChange={(event) => setSessionDescription(event.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                      placeholder="Share goals, resources, or prep materials"
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                      What do you want to learn?
                    </label>
                    <input
                      type="text"
                      value={interestTrack}
                      onChange={(event) => setInterestTrack(event.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                      placeholder="e.g. Advanced DevOps pipelines"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                      Learning goals (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={interestGoals}
                      onChange={(event) => setInterestGoals(event.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/70"
                      placeholder="Tell the facilitator how you plan to apply the lessons."
                      disabled={isSubmitting}
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (requestType === 'teach' ? !sessionName.trim() : !interestTrack.trim())
                }
                className="w-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-sm font-semibold uppercase tracking-[0.3em]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit for approval'
                )}
              </Button>
            </form>

            {pendingRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Pending approval
                </p>
                {pendingRequests.map(renderRequestCard)}
              </div>
            )}

            {approvedRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Approved sessions
                </p>
                {approvedRequests.map(renderRequestCard)}
              </div>
            )}

            {declinedRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Declined requests
                </p>
                {declinedRequests.map(renderRequestCard)}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
};

export default ClassroomView;


