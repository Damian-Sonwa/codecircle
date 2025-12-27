import {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {X, CheckCircle2, XCircle, Loader2, GraduationCap, ArrowRight} from 'lucide-react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {techGroupsAPI} from '@/lib/api';
import {useNotificationStore} from '@/store/notificationStore';
import {useNavigate} from 'react-router-dom';
import {cn} from '@/utils/styles';

interface Question {
  questionId: string;
  question: string;
  options: string[];
}

interface Props {
  groupId: string;
  groupName: string;
  techSkill: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SkillAssessmentModal = ({groupId, groupName, techSkill, isOpen, onClose, onSuccess}: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);

  // Fetch assessment status
  const {data: statusData} = useQuery({
    queryKey: ['assessment-status', groupId],
    queryFn: () => techGroupsAPI.getAssessmentStatus(groupId),
    enabled: isOpen,
  });

  // Fetch questions
  const {data: questionsData, isLoading: isLoadingQuestions} = useQuery<{questions: Question[]; techSkill: string; totalQuestions: number}>({
    queryKey: ['assessment-questions', groupId],
    queryFn: () => techGroupsAPI.getAssessmentQuestions(groupId, 7),
    enabled: isOpen && statusData?.canAttempt !== false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!questionsData?.questions) throw new Error('Questions not loaded');
      return techGroupsAPI.submitAssessment(groupId, answers, questionsData.questions);
    },
    onSuccess: (data) => {
      setAssessmentResult(data);
      setShowResults(true);
      queryClient.invalidateQueries({queryKey: ['assessment-status', groupId]});
      queryClient.invalidateQueries({queryKey: ['tech-groups-explore']});
      
      if (data.passed) {
        pushNotification({
          id: `assessment-passed-${Date.now()}`,
          title: 'Congratulations!',
          message: `You passed with ${data.score}%! Welcome to ${groupName}.`,
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
          // Navigate to group feed or explore page
          navigate(`/explore?groupId=${groupId}`);
        }, 3000);
      } else {
        pushNotification({
          id: `assessment-failed-${Date.now()}`,
          title: 'Assessment incomplete',
          message: data.message || 'You need at least 20% to pass.',
          type: 'error',
        });
      }
    },
    onError: (error: any) => {
      pushNotification({
        id: `assessment-error-${Date.now()}`,
        title: 'Submission failed',
        message: error.response?.data?.error || 'Failed to submit assessment. Please try again.',
        type: 'error',
      });
    },
  });

  const questions = questionsData?.questions || [];
  const totalQuestions = questionsData?.totalQuestions || questions.length || 0;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  
  // Handle empty questions case
  const hasQuestions = questions.length > 0 && totalQuestions > 0;

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowResults(false);
      setAssessmentResult(null);
    }
  }, [isOpen]);

  // Handle already passed or max attempts
  useEffect(() => {
    if (statusData && !statusData.canAttempt) {
      if (statusData.status === 'passed') {
        pushNotification({
          id: `assessment-already-passed-${Date.now()}`,
          title: 'Already passed',
          message: 'You have already passed this assessment and are a member of this group.',
        });
        onClose();
      } else if (statusData.status === 'failed') {
        // Show classroom prompt
        setShowResults(true);
        setAssessmentResult({
          passed: false,
          maxAttemptsReached: true,
          message: statusData.message,
        });
      }
    }
  }, [statusData, onClose, pushNotification]);

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Submit on last question
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (questions.length === 0) return;
    
    // Check if all questions are answered
    const unanswered = questions.filter((q) => !answers[q.questionId]);
    if (unanswered.length > 0) {
      pushNotification({
        id: `assessment-incomplete-${Date.now()}`,
        title: 'Incomplete assessment',
        message: `Please answer all ${unanswered.length} remaining question(s).`,
        type: 'error',
      });
      return;
    }

    submitMutation.mutate();
  };

  const handleClose = () => {
    if (currentQuestionIndex > 0 && !showResults) {
      const confirmed = window.confirm('Are you sure you want to exit? Your progress will be lost.');
      if (!confirmed) return;
    }
    onClose();
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
    setAssessmentResult(null);
    queryClient.invalidateQueries({queryKey: ['assessment-questions', groupId]});
  };

  const handleGoToClassroom = () => {
    onClose();
    navigate('/classroom');
  };

  if (!isOpen) return null;

  // Show loading state
  if (isLoadingQuestions && !showResults) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="glass-card rounded-2xl sm:rounded-3xl p-8 text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primaryTo mx-auto mb-4" />
          <p className="text-sm text-slate-300">Loading assessment questions...</p>
        </motion.div>
      </div>
    );
  }

  // Show max attempts reached
  if (assessmentResult?.maxAttemptsReached) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-6">
            <XCircle className="h-16 w-16 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Maximum Attempts Reached</h2>
            <p className="text-sm text-slate-400">
              {assessmentResult.message || 'You have reached the maximum number of attempts for this assessment.'}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4 mb-6 bg-slate-900/60">
            <p className="text-sm text-slate-300 mb-4">
              It looks like this tech might need some guided learning. Enroll in our live classes to build your skills and try again.
            </p>
          </div>

          <button
            onClick={handleGoToClassroom}
            className="w-full rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:scale-105 flex items-center justify-center gap-2"
          >
            <GraduationCap className="h-4 w-4" />
            Go to Classroom Page
          </button>
        </motion.div>
      </div>
    );
  }

  // Show results
  if (showResults && assessmentResult) {
    const passed = assessmentResult.passed;
    const Icon = passed ? CheckCircle2 : XCircle;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}
          className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div
              className={cn(
                'h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center',
                passed ? 'bg-emerald-500/20' : 'bg-rose-500/20'
              )}
            >
              <Icon className={cn('h-8 w-8', passed ? 'text-emerald-400' : 'text-rose-400')} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {passed ? 'Congratulations!' : 'Assessment Incomplete'}
            </h2>
            <p className="text-lg font-semibold text-primaryTo mb-2">
              Score: {assessmentResult.score}%
            </p>
            <p className="text-sm text-slate-400">{assessmentResult.message}</p>
          </div>

          {passed ? (
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className="text-center"
            >
              <p className="text-sm text-slate-300 mb-4">You're being added to {groupName}...</p>
            </motion.div>
          ) : assessmentResult.canRetry ? (
            <button
              onClick={handleRetry}
              className="w-full rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:scale-105"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={handleGoToClassroom}
              className="w-full rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:scale-105 flex items-center justify-center gap-2"
            >
              <GraduationCap className="h-4 w-4" />
              Go to Classroom Page
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Show questions
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-1">Skill Assessment</h2>
            <p className="text-sm text-slate-400">{groupName} • {techSkill}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions || questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900/60 overflow-hidden">
            <motion.div
              initial={{width: 0}}
              animate={{width: `${progress}%`}}
              className="h-full bg-gradient-to-r from-primaryFrom to-primaryTo"
            />
          </div>
        </div>

        {/* Question */}
        {currentQuestion && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{opacity: 0, x: 20}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -20}}
              className="mb-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">{currentQuestion.question}</h3>
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.questionId] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(option)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border transition',
                        isSelected
                          ? 'border-primaryTo bg-primaryTo/20 text-white'
                          : 'border-white/10 bg-slate-900/60 text-slate-200 hover:border-primaryTo/40'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            isSelected ? 'border-primaryTo bg-primaryTo' : 'border-slate-400'
                          )}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 rounded-full border border-white/10 bg-slate-900/60 text-slate-300 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed hover:border-primaryTo/40"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion?.questionId]}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo text-white text-sm font-semibold shadow-lift transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {currentQuestionIndex === questions.length - 1 ? (
              <>
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Assessment'
                )}
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

