import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {Users, GraduationCap, MessageSquare, CheckCircle, Users2, TrendingUp} from 'lucide-react';
import {motion} from 'framer-motion';
import {Link} from 'react-router-dom';

interface AdminStats {
  totalUsers: number;
  totalMentors: number;
  activeSessions: number;
  totalCommunities: number;
  pendingApprovals: number;
  newSignupsToday: number;
  activeUsersToday: number;
}

export const OverviewPage = () => {
  const {data: stats, isLoading} = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.admin.analytics);
      // Transform analytics data to stats format
      return {
        totalUsers: data.totalUsers || 0,
        totalMentors: data.roleDistribution?.instructor || 0,
        activeSessions: data.activeSessions || 0,
        totalCommunities: data.groupParticipation || 0,
        pendingApprovals: 0, // Will be fetched from approvals endpoint
        newSignupsToday: data.newSignups?.daily || 0,
        activeUsersToday: data.activeUsers || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      link: '/admin/users',
    },
    {
      label: 'Total Mentors',
      value: stats?.totalMentors || 0,
      icon: GraduationCap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      link: '/admin/mentors',
    },
    {
      label: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: MessageSquare,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      link: '/admin/classes',
    },
    {
      label: 'Total Communities',
      value: stats?.totalCommunities || 0,
      icon: Users2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      link: '/admin/tech-groups',
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: CheckCircle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      link: '/admin/approvals',
    },
    {
      label: 'New Signups (Today)',
      value: stats?.newSignupsToday || 0,
      icon: TrendingUp,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
      link: '/admin/users',
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Overview</h1>
        <p className="text-sm sm:text-base text-slate-400">Platform management and control center</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const CardContent = (
            <motion.div
              key={stat.label}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: index * 0.1}}
              className={`${stat.bgColor} rounded-xl p-6 border ${stat.borderColor} hover:border-opacity-40 transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <TrendingUp className="h-4 w-4 text-slate-500 group-hover:text-slate-400 transition" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </motion.div>
          );

          return stat.link ? (
            <Link key={stat.label} to={stat.link}>
              {CardContent}
            </Link>
          ) : (
            CardContent
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900 rounded-xl border border-white/5 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-sky-500/30 transition text-white"
          >
            <Users className="h-5 w-5 text-sky-500" />
            <span className="text-sm font-medium">Manage Users</span>
          </Link>
          <Link
            to="/admin/approvals"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-orange-500/30 transition text-white"
          >
            <CheckCircle className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Review Approvals</span>
          </Link>
          <Link
            to="/admin/analytics"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-purple-500/30 transition text-white"
          >
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">View Analytics</span>
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-slate-500/30 transition text-white"
          >
            <GraduationCap className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

