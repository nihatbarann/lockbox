import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Key, 
  FileText, 
  CreditCard, 
  User, 
  Shield, 
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import clsx from 'clsx';

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await settingsAPI.getStats();
      return response.data;
    },
  });

  const typeIcons: Record<string, React.ReactNode> = {
    password: <Key className="w-5 h-5" />,
    note: <FileText className="w-5 h-5" />,
    card: <CreditCard className="w-5 h-5" />,
    identity: <User className="w-5 h-5" />,
  };

  const typeColors: Record<string, string> = {
    password: 'from-primary-500 to-primary-600',
    note: 'from-green-500 to-green-600',
    card: 'from-amber-500 to-amber-600',
    identity: 'from-pink-500 to-pink-600',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 mt-1">Overview of your vault security</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Items</p>
              <p className="text-3xl font-bold text-white mt-1">
                {isLoading ? '...' : stats?.totalItems || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20">
              <Shield className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>

        {/* Items by Type */}
        {['password', 'note', 'card', 'identity'].map((type) => {
          const count = stats?.itemsByType?.find((t: any) => t.type === type)?.count || 0;
          return (
            <div key={type} className="card card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm capitalize">{type}s</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {isLoading ? '...' : count}
                  </p>
                </div>
                <div className={clsx(
                  "p-3 rounded-xl bg-gradient-to-br",
                  typeColors[type]?.replace('from-', 'from-').replace('to-', 'to-') + '/20'
                )}>
                  {typeIcons[type]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Categories */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          Items by Category
        </h2>
        <div className="space-y-3">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-dark-700 rounded-lg" />
              ))}
            </div>
          ) : stats?.itemsByCategory?.length ? (
            stats.itemsByCategory.map((cat: any) => (
              <div 
                key={cat.name}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-700/50"
              >
                <span className="text-dark-200">{cat.name}</span>
                <span className="text-primary-400 font-medium">{cat.count} items</span>
              </div>
            ))
          ) : (
            <p className="text-dark-400 text-center py-4">No categories yet</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          Recent Activity (7 days)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="animate-pulse col-span-4 h-20 bg-dark-700 rounded-lg" />
          ) : stats?.recentActivity?.length ? (
            stats.recentActivity.map((activity: any) => (
              <div 
                key={activity.action}
                className="p-4 rounded-lg bg-dark-700/50 text-center"
              >
                <p className="text-2xl font-bold text-white">{activity.count}</p>
                <p className="text-dark-400 text-sm mt-1 capitalize">
                  {activity.action.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            ))
          ) : (
            <p className="text-dark-400 text-center py-4 col-span-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="card bg-gradient-to-br from-primary-900/50 to-cyber-purple/10 border-primary-500/30">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-400" />
          Security Tips
        </h2>
        <ul className="space-y-2 text-dark-300">
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Use unique passwords for each account
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Enable two-factor authentication where available
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Regularly update passwords for sensitive accounts
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400">✓</span>
            Never share your master password with anyone
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
