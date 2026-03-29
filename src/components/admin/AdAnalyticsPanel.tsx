import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface AdAnalytics {
  total_impressions: number;
  total_clicks: number;
  android_impressions: number;
  ios_impressions: number;
  reading_triggers: number;
  quiz_triggers: number;
  journal_triggers: number;
  estimated_revenue: number;
  date: string;
}

interface AdAnalyticsPanelProps {
  analytics: AdAnalytics | null;
}

export function AdAnalyticsPanel({ analytics }: AdAnalyticsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-medium text-mystic-100">Ad Revenue Analytics</h3>
            <p className="text-sm text-mystic-400">Today's performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analytics && (
            <span className="text-sm font-medium text-emerald-400">
              ${analytics.estimated_revenue.toFixed(2)}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-mystic-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-mystic-400" />
          )}
        </div>
      </button>

      {expanded && analytics && (
        <div className="border-t border-mystic-700/50 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-mystic-800/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-mystic-400" />
                <p className="text-xs text-mystic-400">Total Impressions</p>
              </div>
              <p className="text-xl font-semibold text-mystic-100">{analytics.total_impressions}</p>
            </div>

            <div className="bg-mystic-800/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-mystic-400" />
                <p className="text-xs text-mystic-400">Total Clicks</p>
              </div>
              <p className="text-xl font-semibold text-mystic-100">{analytics.total_clicks}</p>
            </div>

            <div className="bg-mystic-800/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-mystic-400">Est. Revenue</p>
              </div>
              <p className="text-xl font-semibold text-emerald-400">
                ${analytics.estimated_revenue.toFixed(2)}
              </p>
            </div>

            <div className="bg-mystic-800/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-mystic-400" />
                <p className="text-xs text-mystic-400">CTR</p>
              </div>
              <p className="text-xl font-semibold text-mystic-100">
                {analytics.total_impressions > 0
                  ? ((analytics.total_clicks / analytics.total_impressions) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-mystic-800/40 rounded-lg p-3">
              <p className="text-xs text-mystic-400 mb-2">Platform</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mystic-300">Android</span>
                  <span className="text-mystic-100 font-medium">{analytics.android_impressions}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mystic-300">iOS</span>
                  <span className="text-mystic-100 font-medium">{analytics.ios_impressions}</span>
                </div>
              </div>
            </div>

            <div className="bg-mystic-800/40 rounded-lg p-3">
              <p className="text-xs text-mystic-400 mb-2">Triggers</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mystic-300">Readings</span>
                  <span className="text-mystic-100 font-medium">{analytics.reading_triggers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mystic-300">Quizzes</span>
                  <span className="text-mystic-100 font-medium">{analytics.quiz_triggers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mystic-300">Journal</span>
                  <span className="text-mystic-100 font-medium">{analytics.journal_triggers}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-mystic-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last updated: {new Date(analytics.date).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
