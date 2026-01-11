import { PenLine, Clock } from 'lucide-react';
import { Button } from '../ui';

interface PromptCardProps {
  prompt: string;
  onWrite: () => void;
}

export function PromptCard({ prompt, onWrite }: PromptCardProps) {
  return (
    <div className="bg-gradient-to-br from-mystic-800/80 to-mystic-900/80 backdrop-blur-sm rounded-2xl border border-mystic-700/50 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center flex-shrink-0">
          <PenLine className="w-5 h-5 text-gold" />
        </div>
        <div>
          <p className="text-xs text-mystic-500 uppercase tracking-wider">Your Prompt</p>
          <h3 className="font-display text-lg text-mystic-100">Reflection</h3>
        </div>
      </div>

      <p className="font-display text-xl text-mystic-100 leading-relaxed mb-6 italic">
        "{prompt}"
      </p>

      <div className="flex items-center justify-between">
        <Button variant="gold" onClick={onWrite} className="min-h-[44px]">
          <PenLine className="w-4 h-4" />
          Write
          <span className="flex items-center gap-1 text-xs opacity-80 ml-1">
            <Clock className="w-3 h-3" />
            2 min
          </span>
        </Button>
      </div>
    </div>
  );
}
