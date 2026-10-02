import { AlertTriangle, Database, FileCode, RefreshCw } from 'lucide-react';

export function MissingSupabaseConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-mystic-950 via-mystic-900 to-mystic-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold/10 border border-gold/25 mb-6">
            <AlertTriangle className="w-10 h-10 text-gold" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            Configuration Required
          </h1>
          <p className="text-mystic-300">
            The app needs Supabase credentials to connect to the database.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-mystic-800/50 rounded-card p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cosmic-blue/15 flex items-center justify-center">
                <FileCode className="w-4 h-4 text-cosmic-blue-ink" />
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

          <div className="bg-mystic-800/50 rounded-card p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white mb-1">
                  2. Add these variables
                </h3>
                <div className="bg-mystic-900/80 rounded-lg p-3 font-mono text-caption text-mystic-300 overflow-x-auto">
                  <div className="whitespace-nowrap">VITE_SUPABASE_URL=https://your-project.supabase.co</div>
                  <div className="whitespace-nowrap">VITE_SUPABASE_ANON_KEY=your-anon-key</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-mystic-800/50 rounded-card p-4 border border-mystic-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cosmic-violet/15 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-cosmic-violet-ink" />
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

        <div className="bg-gold/10 border border-gold/25 rounded-card p-4">
          <p className="text-sm text-mystic-300 text-center">
            Get your Supabase credentials from your{' '}
            <span className="text-gold font-medium">Supabase Dashboard</span>{' '}
            under Project Settings &rarr; API
          </p>
        </div>
      </div>
    </div>
  );
}
