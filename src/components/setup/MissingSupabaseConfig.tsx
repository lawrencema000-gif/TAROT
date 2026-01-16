import { AlertTriangle, Database, FileCode, RefreshCw } from 'lucide-react';

export function MissingSupabaseConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-mystic-950 via-mystic-900 to-mystic-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Configuration Required
          </h1>
          <p className="text-mystic-300">
            The app needs Supabase credentials to connect to the database.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-mystic-800/50 rounded-xl p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <FileCode className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">
                  1. Create .env file
                </h3>
                <p className="text-sm text-mystic-400 mb-3">
                  In your project root folder, create a file named <code className="px-1.5 py-0.5 rounded bg-mystic-700 text-mystic-200">.env</code>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-mystic-800/50 rounded-xl p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white mb-1">
                  2. Add these variables
                </h3>
                <div className="bg-mystic-900/80 rounded-lg p-3 font-mono text-xs text-mystic-300 overflow-x-auto">
                  <div className="whitespace-nowrap">VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                  <div className="whitespace-nowrap">VITE_SUPABASE_ANON_KEY=your-anon-key</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-mystic-800/50 rounded-xl p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">
                  3. Rebuild the app
                </h3>
                <p className="text-sm text-mystic-400">
                  Run <code className="px-1.5 py-0.5 rounded bg-mystic-700 text-mystic-200">npm run build</code> then sync with Android using <code className="px-1.5 py-0.5 rounded bg-mystic-700 text-mystic-200">npx cap sync</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <p className="text-sm text-amber-200/80 text-center">
            Get your Supabase credentials from your{' '}
            <span className="text-amber-300 font-medium">Supabase Dashboard</span>{' '}
            under Project Settings &rarr; API
          </p>
        </div>
      </div>
    </div>
  );
}
