import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {CalendarDays, Video, ClipboardList} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {type Classroom, type LiveSessionApplication} from '@/types';
import {useNotificationStore} from '@/store/notificationStore';
import {LiveSessionApplicationForm} from '@/components/Classroom/LiveSessionApplicationForm';
import {ApplicationStatusDisplay} from '@/components/Classroom/ApplicationStatusDisplay';
import {ClassroomEnvironment} from '@/components/Classroom/ClassroomEnvironment';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';

export const ClassroomPage = () => {
  const {appReady} = useAppReady();
  const queryClient = useQueryClient();
  const pushNotification = useNotificationStore((state) => state.push);
  
  // Check application status - only when app is ready
  const {data: applicationStatus} = useQuery<{status: string; application: LiveSessionApplication | null}>({
    queryKey: ['live-session-application-status'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.liveSessions.applicationStatus);
      return data;
    },
    enabled: appReady, // CRITICAL: Wait for appReady
  });

  const {data: classes = [], isLoading: isLoadingClasses, error: classesError} = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      try {
        console.log('[Classroom] Fetching classrooms...');
        const {data} = await api.get<Classroom[]>(endpoints.classrooms.root);
        console.log('[Classroom] Received classrooms:', data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error('[Classroom] Error fetching classrooms:', err);
        const errorMessage = err.userMessage || err.response?.data?.message || err.message || 'Failed to load classrooms';
        throw new Error(errorMessage);
      }
    },
    enabled: appReady, // CRITICAL: Wait for appReady
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (!appReady) {
    return <AppLoader message="Loading classroom..." />;
  }

  const registerMutation = useMutation({
    mutationFn: async ({classroomId, sessionId}: {classroomId: string; sessionId: string}) => {
      await api.post(endpoints.classrooms.register(classroomId, sessionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['classrooms']});
      pushNotification({id: `class-${Date.now()}`, title: 'Registered', message: 'You are in! Check your inbox for calendar invites.'});
    }
  });

  // Determine what to show based on application status
  const showApplicationForm = !applicationStatus || applicationStatus.status === 'none' || !applicationStatus.application;
  const showApplicationStatus = applicationStatus?.application && applicationStatus.application.status !== 'accepted';
  const showClassroom = applicationStatus?.application?.status === 'accepted' && applicationStatus.application.roomId;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-8 pt-12 sm:pt-16">
      <header className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-glass">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Classroom</p>
        <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-semibold text-white">Live sessions & resources</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-300">
          {showClassroom
            ? 'Join interactive live sessions with instructors and peers'
            : 'Apply for live sessions to join interactive classes with instructors and peers'}
        </p>
      </header>

      {/* Show Classroom Environment if accepted */}
      {showClassroom && applicationStatus.application && (
        <div className="mt-4 sm:mt-6">
          <ClassroomEnvironment application={applicationStatus.application} />
        </div>
      )}

      {/* Show Application Status if pending/rejected */}
      {showApplicationStatus && (
        <div className="mt-4 sm:mt-6">
          <ApplicationStatusDisplay />
        </div>
      )}

      {/* Show Application Form if no application */}
      {showApplicationForm && (
        <div className="mt-4 sm:mt-6">
          <LiveSessionApplicationForm />
        </div>
      )}

      {/* Show regular classroom sessions below */}
      {!showClassroom && (
        <div className="mt-4 sm:mt-6 space-y-4">
          {isLoadingClasses && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent mb-4"></div>
                <p className="text-base text-slate-400">Loading classrooms...</p>
              </div>
            </div>
          )}
          {classesError && (
            <div className="flex items-center justify-center py-12">
              <EmptyState
                icon={GraduationCap}
                title="Failed to load classrooms"
                description={classesError instanceof Error ? classesError.message : 'Unable to load classroom sessions. Please try again.'}
                action={{
                  label: 'Retry',
                  onClick: () => window.location.reload(),
                }}
              />
            </div>
          )}
          {!isLoadingClasses && !classesError && classes.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <EmptyState
                icon={GraduationCap}
                title="No classrooms available"
                description="Classroom sessions will appear here once they are created. Check back later!"
              />
            </div>
          )}
          {!isLoadingClasses && !classesError && classes.length > 0 && classes.map((classroom) => (
            <article key={classroom._id} className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{classroom.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{classroom.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Instructor • {classroom.instructor?.username ?? 'TBA'}</p>
                </div>
                <button className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:border-sky-600 hover:text-sky-600">
                  Add materials
                </button>
              </div>
              <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 lg:grid-cols-2">
                {classroom.schedule.map((session) => (
                  <div key={session._id} className="rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 p-3 sm:p-4 md:p-5">
                    <div className="flex items-center gap-3 text-slate-200">
                      <CalendarDays className="h-5 w-5 text-sky-500" />
                      <div>
                        <p className="text-sm font-semibold">{session.title}</p>
                        <p className="text-xs text-slate-400">{new Date(session.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{session.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      {session.link && (
                        <a
                          href={session.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 transition hover:text-sky-600"
                        >
                          <Video className="h-3 w-3" /> Join live
                        </a>
                      )}
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                        <ClipboardList className="h-3 w-3" /> Attending {session.participants.length}
                      </span>
                    </div>
                    <button
                      onClick={() => registerMutation.mutate({classroomId: classroom._id, sessionId: session._id})}
                      className="mt-4 rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lift transition hover:bg-sky-600"
                    >
                      Register + Chat
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

