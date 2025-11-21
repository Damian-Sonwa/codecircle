import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSkillProfile } from '../../hooks/useUserSkillProfile';
import { TECH_SKILLS, SKILL_LEVELS } from '../../constants/techSkills';
import { techGroupsAPI } from '../../lib/api';

const skillGroupName = (skillName, level) => `${skillName} ${level} Circle`;

const ExploreTechSkills = ({
  isOpen,
  onClose,
  onComplete,
  groups = [],
  onGroupCreated,
  onGroupUpdated,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { profile, updateProfile, isUpdating } = useUserSkillProfile();

  const [selectedSkillId, setSelectedSkillId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGroups, setCurrentGroups] = useState(groups);
  const [errorMessage, setErrorMessage] = useState('');
  const [completion, setCompletion] = useState(null);

  const selectedSkill = useMemo(
    () => TECH_SKILLS.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId]
  );

  const questionSet = useMemo(() => {
    if (!selectedSkill || !selectedLevel) return [];
    return selectedSkill.levels[selectedLevel] ?? [];
  }, [selectedLevel, selectedSkill]);

  const currentQuestion = questionSet[currentQuestionIndex] ?? null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedSkillId(null);
      setSelectedLevel(null);
      setCurrentQuestionIndex(0);
      setResponses({});
      setErrorMessage('');
      setCompletion(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentGroups(groups);
    }
  }, [groups, isOpen]);

  const handleSkillSelect = (skillId) => {
    setSelectedSkillId(skillId);
    setSelectedLevel(null);
    setCurrentQuestionIndex(0);
    setResponses({});
    setErrorMessage('');
    setCompletion(null);
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setCurrentQuestionIndex(0);
    setResponses({});
    setErrorMessage('');
    setCompletion(null);
  };

  const handleAnswerSelect = (questionId, option) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const goToNextQuestion = () => {
    if (!currentQuestion) return;
    if (!responses[currentQuestion.id]) {
      setErrorMessage('Select an answer to continue.');
      return;
    }
    setErrorMessage('');

    setCurrentQuestionIndex((prev) => {
      const nextIndex = Math.min(prev + 1, questionSet.length - 1);
      if (prev === nextIndex && prev < questionSet.length - 1) {
        const unanswered = questionSet.findIndex((item) => !responses[item.id]);
        return unanswered !== -1 ? unanswered : nextIndex;
      }
      return nextIndex;
    });
  };

  const goToPreviousQuestion = () => {
    setErrorMessage('');
    if (questionSet.length === 0) return;
    setCurrentQuestionIndex((prev) => {
      if (prev > 0) return prev - 1;
      const unanswered = [...questionSet]
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !responses[item.id]);
      return unanswered.length > 0 ? unanswered[0].index : 0;
    });
  };

  const ensureGroup = async (groupName) => {
    if (!user) {
      throw new Error('You need to be signed in to join a tech group.');
    }

    let group =
      currentGroups.find(
        (item) => item.name.toLowerCase() === groupName.toLowerCase()
      ) ?? null;
    let existing = true;

    if (!group) {
      group = await techGroupsAPI.create({
        name: groupName,
        createdBy: user.userId,
        description: `Skill circle for ${groupName}.`,
      });
      setCurrentGroups((prev) => [group, ...prev]);
      onGroupCreated?.(group);
      existing = false;
    }

    return { group, existing };
  };

  const handleSubmitResponses = async () => {
    if (!selectedSkill || !selectedLevel) return;
    if (!user) {
      setErrorMessage('Please sign in again to complete verification.');
      return;
    }

    const unanswered = questionSet.filter((item) => !responses[item.id]);

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { group, existing } = await ensureGroup(
        skillGroupName(selectedSkill.name, selectedLevel)
      );

      const filledResponses = { ...responses };
      unanswered.forEach((item) => {
        filledResponses[item.id] = 'Not answered';
      });

      const score = Math.round(
        (Object.keys(responses).length / questionSet.length) * 100
      );

      const payload = {
        level: selectedLevel,
        answers: {
          skillId: selectedSkill.id,
          skillName: selectedSkill.name,
          responses: filledResponses,
          summary: questionSet.map((item) => ({
            id: item.id,
            question: item.question,
            answer: filledResponses[item.id],
          })),
        },
      };

      await techGroupsAPI.submitJoinRequest(group.groupId, payload);

      const joinedGroup = await techGroupsAPI.join(group.groupId, user.userId);
      if (joinedGroup) {
        group = joinedGroup;
        setCurrentGroups((prev) =>
          prev.map((item) => (item.groupId === joinedGroup.groupId ? joinedGroup : item))
        );
        onGroupUpdated?.(joinedGroup);
      }

      socket?.emit('group:join', { groupId: group.groupId, userId: user.userId });

      updateProfile({
        interests: Array.from(
          new Set([...(profile.interests ?? []), selectedSkill.id])
        ),
        lastCompletedSkillId: selectedSkill.id,
        levelHistory: {
          ...(profile.levelHistory ?? {}),
          [selectedSkill.id]: selectedLevel,
        },
        assessments: {
          ...(profile.assessments ?? {}),
          [selectedSkill.id]: {
            level: selectedLevel,
            responses: filledResponses,
            score,
            total: questionSet.length,
            completedAt: new Date().toISOString(),
          },
        },
      });

      setCompletion({
        group,
        existing,
        score,
        total: questionSet.length,
        skillName: selectedSkill.name,
        level: selectedLevel,
        status: 'approved',
        unanswered: unanswered.length,
      });
    } catch (error) {
      console.error('Failed to complete skill verification', error);
      setErrorMessage(
        error.response?.data?.error || 'Unable to join the skill group right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterCommunity = () => {
    if (!completion) return;
    onComplete?.({
      group: completion.group,
      summary: {
        score: completion.score,
        total: completion.total,
        skillName: completion.skillName,
        level: completion.level,
        existing: completion.existing,
        status: completion.status,
      },
      status: completion.status,
    });
    onClose?.();
    setCompletion(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="relative w-full max-w-6xl rounded-[32px] bg-slate-900/50 border border-slate-700/60 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.75)] backdrop-blur-2xl overflow-hidden"
      >
        <div className="grid md:grid-cols-[280px,1fr] min-h-[640px]">
          {/* Skill list panel */}
          <div className="border-r border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950/60 p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-300/90 text-sm font-semibold uppercase tracking-wide">
                <Sparkles className="h-4 w-4" />
                Join Tech Group
              </div>
              <p className="text-xs text-slate-400">
                Select a track to answer a quick check and join the right community instantly.
              </p>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {TECH_SKILLS.map((skill) => {
                const isActive = skill.id === selectedSkillId;
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleSkillSelect(skill.id)}
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 text-white'
                        : 'border-slate-700/60 bg-slate-900/40 hover:border-blue-400/60 hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wide">
                        {skill.name}
                      </span>
                      {profile.assessments?.[skill.id] && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {skill.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/60 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Detail panel */}
          <div className="relative overflow-hidden bg-slate-950/40">
            {completion ? (
              <div className="flex h-full flex-col items-center justify-center px-10 py-12 text-center space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-xl space-y-4 text-slate-200"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                    Verification Complete
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    {completion.status === 'approved'
                      ? `Welcome to the ${completion.group.name}`
                      : `Request received for ${completion.group.name}`}
                  </h3>
                  <p className="text-sm text-slate-300/90">
                    You scored <span className="font-semibold text-emerald-300">{completion.score}%</span> on the {completion.skillName} assessment at the {completion.level} level.
                    {completion.status === 'approved'
                      ? completion.existing
                        ? ' We found an active circle that matches your focus—jump in and introduce yourself!'
                        : ' A fresh circle has been spun up just for this pathway. Lead the conversation and invite others to join you.'
                      : ' Your request has been shared with the circle admins. You will receive a notification once they approve or decline.'}
                  </p>
                  {completion.unanswered > 0 && (
                    <p className="text-xs text-amber-200/80">
                      Heads-up: you skipped {completion.unanswered} question
                      {completion.unanswered > 1 ? 's' : ''}. You can update your answers anytime before approval by reopening this flow.
                    </p>
                  )}
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-left text-sm text-slate-200/90 shadow-lg">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-2">
                      Community Guidelines
                    </p>
                    <p className="text-sm">
                      Remember to respect community guidelines. Violations may result in suspension. Keep discussions collaborative, cite sources when you can, and support every builder in the space.
                    </p>
                  </div>
                </motion.div>
                <button
                  onClick={handleEnterCommunity}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_15px_40px_-20px_rgba(56,189,248,0.6)] hover:shadow-[0_20px_45px_-20px_rgba(56,189,248,0.8)]"
                >
                  Enter Community Space
                </button>
              </div>
            ) : (
              <>
                {!selectedSkill && (
                  <div className="flex h-full items-center justify-center p-10 text-center">
                    <div className="max-w-md space-y-4 text-slate-300">
                      <h3 className="text-2xl font-semibold text-white">
                        Choose your focus area
                      </h3>
                      <p className="text-sm text-slate-400">
                        We will tailor a short verification for the skill and level you select,
                        then route you to the best community.
                      </p>
                    </div>
                  </div>
                )}

                {selectedSkill && !selectedLevel && (
                  <div className="p-10 space-y-8">
                    <div className="space-y-3">
                      <h3 className="text-3xl font-bold text-white">
                        Select your proficiency level
                      </h3>
                      <p className="text-sm text-slate-400 max-w-xl">
                        Pick the option that reflects your experience. We will ask ten scenario-based
                        questions to verify your placement and add you to the right circle.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {SKILL_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => handleLevelSelect(level)}
                          className="rounded-3xl border border-slate-700/70 bg-slate-900/60 px-5 py-6 text-left transition-all hover:border-blue-400/70 hover:bg-slate-800/80"
                        >
                          <div className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                            {level}
                          </div>
                          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                            {level === 'Beginner' &&
                              'I am new to this track and building foundational knowledge.'}
                            {level === 'Intermediate' &&
                              'I have hands-on experience and want to deepen my practice.'}
                            {level === 'Professional' &&
                              'I lead initiatives, mentor others, or operate at an advanced level.'}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSkill && selectedLevel && currentQuestion && (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-800/80 bg-slate-900/40 px-8 py-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                            {selectedSkill.name} · {selectedLevel} Path
                          </div>
                          <h3 className="text-2xl font-bold text-white mt-1">
                            Question {currentQuestionIndex + 1} of {questionSet.length}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{Object.keys(responses).length} answered</span>
                          <span>•</span>
                          <span>{questionSet.length - Object.keys(responses).length} remaining</span>
                        </div>
                      </div>
                      <div className="mt-4 h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 transition-all duration-300"
                          style={{
                            width: `${((currentQuestionIndex + 1) / questionSet.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 py-10">
                      <div className="mx-auto max-w-2xl space-y-8">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-6"
                          >
                            <h4 className="text-xl font-semibold text-white leading-relaxed">
                              {currentQuestion.question}
                            </h4>
                            <div className="grid gap-3">
                              {currentQuestion.options.map((option) => {
                                const isSelected = responses[currentQuestion.id] === option;
                                return (
                                  <button
                                    key={option}
                                    onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                    className={`rounded-3xl border px-5 py-4 text-left transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/20'
                                        : 'border-slate-700/60 bg-slate-900/50 text-slate-200 hover:border-blue-400/60 hover:bg-slate-800/60'
                                    }`}
                                  >
                                    <span className="text-sm font-medium">{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 bg-slate-900/40 px-8 py-6">
                      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={goToPreviousQuestion}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-2.5 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={currentQuestionIndex === 0 || isSubmitting}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Back
                        </button>
                        {currentQuestionIndex < questionSet.length - 1 ? (
                          <button
                            type="button"
                            onClick={goToNextQuestion}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 py-2.5 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-500/50"
                            disabled={isSubmitting}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSubmitResponses}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 py-2.5 px-6 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
                            disabled={isSubmitting || isUpdating}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Joining group...
                              </>
                            ) : (
                              <>
                                Finish & Join Group
                                <CheckCircle2 className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {errorMessage && (
              <div className="absolute bottom-6 right-6 max-w-md rounded-2xl border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-md shadow-lg">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExploreTechSkills;


