import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {BarChart3, Users, UserCheck, TrendingUp, BookOpen, MessageSquare} from 'lucide-react';
import {motion} from 'framer-motion';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newSignups: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  activeSessions: number;
  assessmentCompletionRate: number;
  classAttendance: number;
  groupParticipation: number;
  roleDistribution: {
    admin: number;
    user: number;
    instructor: number;
  };
  growthData: Array<{date: string; users: number}>;
}

export const AnalyticsPage = () => {
  const {data: analytics, isLoading} = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.admin.analytics);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Active Users',
      value: analytics?.activeUsers || 0,
      icon: UserCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'New Signups (30d)',
      value: analytics?.newSignups?.monthly || 0,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Active Sessions',
      value: analytics?.activeSessions || 0,
      icon: MessageSquare,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Assessment Completion',
      value: `${analytics?.assessmentCompletionRate || 0}%`,
      icon: BookOpen,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Group Participation',
      value: analytics?.groupParticipation || 0,
      icon: BarChart3,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-400">System-wide metrics and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: index * 0.1}}
              className={`${stat.bgColor} rounded-xl p-6 border border-white/5`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Role Distribution */}
      {analytics?.roleDistribution && (
        <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-white/5 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Role Distribution</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{analytics.roleDistribution.admin}</p>
              <p className="text-sm text-slate-400">Admins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{analytics.roleDistribution.user}</p>
              <p className="text-sm text-slate-400">Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{analytics.roleDistribution.instructor}</p>
              <p className="text-sm text-slate-400">Instructors</p>
            </div>
          </div>
        </div>
      )}

      {/* Growth Chart Placeholder */}
      <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-white/5">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">User Growth</h2>
        <div className="h-48 sm:h-64 flex items-center justify-center text-slate-500">
          <div className="text-center px-4">
            <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2" />
            <p className="text-sm sm:text-base">Chart visualization coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

