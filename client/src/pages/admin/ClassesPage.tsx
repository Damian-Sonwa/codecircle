import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api} from '@/services/api';
import {GraduationCap, Calendar, Users, Lock, Archive} from 'lucide-react';
import {motion} from 'framer-motion';

export const ClassesPage = () => {
  const queryClient = useQueryClient();

  const {data: classes, isLoading} = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => {
      const {data} = await api.get('/admin/classes');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Class Management</h1>
        <p className="text-sm sm:text-base text-slate-400">Manage classes, sessions, and attendance</p>
      </div>

      <div className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6">
        <div className="flex items-center justify-center h-48 sm:h-64 text-slate-400">
          <div className="text-center px-4">
            <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2" />
            <p className="text-sm sm:text-base">Class management interface coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

