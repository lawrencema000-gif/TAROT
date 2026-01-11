import { useState } from 'react';
import { Heart, Briefcase, Sparkles, ArrowUp, ArrowDown, BookOpen, X, Star } from 'lucide-react';
import { Card, Button } from '../ui';
import type { TarotCard } from '../../types';

interface TarotCardDetailProps {
  card: TarotCard;
  reversed?: boolean;
  onClose: () => void;
}

type DetailTab = 'meaning' | 'love' | 'career' | 'reflect';

export function TarotCardDetail({ card, reversed = false, onClose }: TarotCardDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('meaning');

  const tabs: { id: DetailTab; label: string; icon: typeof Heart }[] = [
    { id: 'meaning', label: 'Meaning', icon: BookOpen },
    { id: 'love', label: 'Love', icon: Heart },
    { id: 'career', label: 'Career', icon: Briefcase },
    { id: 'reflect', label: 'Reflect', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 pb-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-mystic-800/50 hover:bg-mystic-700 transition-colors z-10"
      >
        <X className="w-5 h-5 text-mystic-300" />
      </button>

      <div className="relative">
        {card.imageUrl ? (
          <div className="relative mx-auto w-56 sm:w-64">
            <div className={`relative transition-transform duration-500 ${reversed ? 'rotate-180' : ''}`}>
              <img
                src={card.imageUrl}
                alt={card.name}
                className="w-full h-auto rounded-2xl shadow-2xl border-2 border-gold/30"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-mystic-900/40 to-transparent pointer-events-none" />
            </div>
            {reversed && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-mystic-800 border border-mystic-600 rounded-full">
                <span className="text-xs text-mystic-300 flex items-center gap-1">
                  <ArrowDown className="w-3 h-3" /> Reversed
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-48 h-72 mx-auto bg-gradient-to-br from-mystic-700 to-mystic-900 rounded-2xl border-2 border-gold/30 shadow-glow flex items-center justify-center ${reversed ? 'rotate-180' : ''}`}>
            <Sparkles className="w-16 h-16 text-gold" />
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-gold/70 uppercase tracking-widest font-medium">
          {card.arcana === 'major' ? 'Major Arcana' : `${card.suit?.charAt(0).toUpperCase()}${card.suit?.slice(1)} - Minor Arcana`}
        </p>
        <h2 className="font-display text-3xl text-mystic-100">{card.name}</h2>
        {card.arcana === 'major' && (
          <p className="text-mystic-400 text-sm">Card {card.id} of the Major Arcana</p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 px-2">
        {card.keywords.map((keyword, i) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-gold/10 border border-gold/25 rounded-full text-sm text-gold font-medium"
          >
            {keyword}
          </span>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-mystic-800/50 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gold/20 text-gold'
                : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'meaning' && (
          <div className="space-y-6 animate-fade-in">
            <Card padding="md" className="bg-mystic-800/30 border-mystic-700">
              <p className="text-mystic-300 text-sm leading-relaxed italic">
                "{card.description}"
              </p>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20">
                    <ArrowUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-medium text-emerald-400 uppercase tracking-wide text-sm">Upright</h4>
                </div>
                <p className="text-mystic-200 text-sm leading-relaxed pl-8">
                  {card.meaningUpright}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <ArrowDown className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-medium text-amber-400 uppercase tracking-wide text-sm">Reversed</h4>
                </div>
                <p className="text-mystic-300 text-sm leading-relaxed pl-8">
                  {card.meaningReversed}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'love' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-pink-500/20">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h4 className="font-medium text-pink-400">Love & Relationships</h4>
                <p className="text-xs text-mystic-500">Matters of the heart</p>
              </div>
            </div>
            <p className="text-mystic-200 leading-relaxed">
              {card.loveMeaning || 'Trust your intuition in matters of the heart. This card brings energy of emotional depth and connection to your romantic life.'}
            </p>
            <Card padding="sm" className="bg-pink-500/10 border-pink-500/20">
              <p className="text-sm text-pink-300">
                <Star className="w-4 h-4 inline mr-2" />
                {reversed
                  ? 'In reversal, examine what blocks emotional openness in your relationships.'
                  : 'Embrace vulnerability and openness in your connections today.'}
              </p>
            </Card>
          </div>
        )}

        {activeTab === 'career' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Briefcase className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-blue-400">Career & Finance</h4>
                <p className="text-xs text-mystic-500">Professional guidance</p>
              </div>
            </div>
            <p className="text-mystic-200 leading-relaxed">
              {card.careerMeaning || 'Professional insights await your discovery. This card highlights growth opportunities and strategic decisions in your work life.'}
            </p>
            <Card padding="sm" className="bg-blue-500/10 border-blue-500/20">
              <p className="text-sm text-blue-300">
                <Star className="w-4 h-4 inline mr-2" />
                {reversed
                  ? 'Consider what fears may be limiting your professional growth.'
                  : 'Take inspired action toward your professional goals today.'}
              </p>
            </Card>
          </div>
        )}

        {activeTab === 'reflect' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gold/20">
                <Sparkles className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h4 className="font-medium text-gold">Personal Reflection</h4>
                <p className="text-xs text-mystic-500">Questions for deeper insight</p>
              </div>
            </div>
            <Card padding="md" className="bg-gold/5 border-gold/20">
              <p className="text-mystic-200 leading-relaxed italic">
                "{card.reflectionPrompt || 'What message does this card hold for your journey? How does its energy resonate with your current situation?'}"
              </p>
            </Card>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-mystic-400">Journal prompts:</p>
              <ul className="space-y-2 text-sm text-mystic-300">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">1.</span>
                  How does the imagery of this card speak to me today?
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">2.</span>
                  What aspect of this card's meaning challenges me most?
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-1">3.</span>
                  What small action can I take today to honor this card's guidance?
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <Card padding="md" className="bg-gradient-to-r from-gold/10 to-mystic-800/50 border-gold/20">
        <h4 className="text-sm font-medium text-gold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Today's Action
        </h4>
        <p className="text-sm text-mystic-300">
          Pick one small action that aligns with {card.name}'s energy. Make it easy enough to do in 10 minutes.
        </p>
      </Card>
    </div>
  );
}
