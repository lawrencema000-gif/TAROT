import { useState, useEffect } from 'react';
import {
  Brain,
  Heart,
  Smile,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Clock,
  Sparkles,
  RefreshCw,
  Calendar,
  Zap,
  Users,
  Focus,
  Battery,
  Bookmark,
  Share2,
  AlertTriangle,
  Briefcase,
  Target,
  HeartHandshake,
  XCircle,
  ListChecks,
  Lock,
  ChevronDown,
  ChevronUp,
  Pentagon,
  Link,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { Card, Button, Progress, toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { adsService } from '../services/ads';
import {
  mbtiQuiz,
  loveLanguageQuiz,
  moodCheckQuiz,
  calculateMBTI,
  calculateLoveLanguage,
  calculateMoodCheck,
  mbtiDescriptions,
  loveLanguageDescriptions,
  moodDescriptions,
  quizMetadata,
} from '../data/quizzes';
import { bigFiveQuiz, calculateBigFive, bigFiveDescriptions } from '../data/bigFiveQuiz';
import { enneagramQuiz, calculateEnneagram, enneagramDescriptions } from '../data/enneagramQuiz';
import { attachmentQuiz, calculateAttachment, attachmentDescriptions } from '../data/attachmentQuiz';
import { cognitiveFunctions, mbtiCognitiveStacks, mbtiExtendedDescriptions } from '../data/mbtiCognitiveFunctions';
import type { QuizDefinition } from '../types';

type QuizState = 'list' | 'taking' | 'results';

interface QuizProgress {
  quiz: QuizDefinition;
  currentQuestion: number;
  answers: Record<string, number>;
}

interface QuizResultData {
  id: string;
  quiz_type: string;
  result: string;
  scores: Record<string, number>;
  completed_at: string;
  label?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  heart: Heart,
  smile: Smile,
  pentagon: Pentagon,
  target: Target,
  link: Link,
};

const encouragementMessages = [
  "You're doing great, keep going!",
  "Trust your instincts on these.",
  "There are no wrong answers here.",
  "Almost halfway there!",
  "You're making excellent progress.",
  "Stay with your first instinct.",
  "These insights will be valuable.",
  "You've got this!",
  "Your honesty leads to better results.",
  "Keep up the momentum!",
];

export function QuizzesPage() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<QuizState>('list');
  const [progress, setProgress] = useState<QuizProgress | null>(null);
  const [result, setResult] = useState<{ quiz: QuizDefinition; result: unknown } | null>(null);
  const [pastResults, setPastResults] = useState<QuizResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPastResults();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPastResults = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (data) {
      setPastResults(data as QuizResultData[]);
    }
    setLoading(false);
  };

  const getLastResult = (quizType: string): QuizResultData | undefined => {
    return pastResults.find(r => r.quiz_type === quizType);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const quizzes = [
    {
      quiz: moodCheckQuiz,
      type: 'mood-check',
      metadata: quizMetadata['mood-check'],
    },
    {
      quiz: mbtiQuiz,
      type: 'mbti',
      metadata: quizMetadata.mbti,
    },
    {
      quiz: loveLanguageQuiz,
      type: 'love-language',
      metadata: quizMetadata['love-language'],
    },
    {
      quiz: bigFiveQuiz,
      type: 'big-five',
      metadata: quizMetadata['big-five'],
    },
    {
      quiz: enneagramQuiz,
      type: 'enneagram',
      metadata: quizMetadata.enneagram,
    },
    {
      quiz: attachmentQuiz,
      type: 'attachment',
      metadata: quizMetadata.attachment,
    },
  ];

  const startQuiz = (quiz: QuizDefinition) => {
    setProgress({ quiz, currentQuestion: 0, answers: {} });
    setState('taking');
  };

  const saveToProfile = async (type: string, resultLabel: string, additionalData?: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);

    const fieldMap: Record<string, string> = {
      mbti: 'mbti_type',
      'love-language': 'love_language',
      enneagram: 'enneagram_type',
      attachment: 'attachment_style',
    };

    const field = fieldMap[type];
    const updateData: Record<string, unknown> = {};

    if (field) {
      updateData[field] = resultLabel;
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      toast('Saved to your profile!', 'success');
    }
    setSaving(false);
  };

  const shareResult = async (type: string, resultLabel: string) => {
    const shareText = type === 'mbti'
      ? `I just discovered I'm an ${resultLabel} personality type! Take the quiz to find yours.`
      : `My primary love language is ${resultLabel}! Discover yours too.`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
        toast('Copied to clipboard!', 'success');
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast('Copied to clipboard!', 'success');
    }
  };

  const answerQuestion = async (questionId: string, value: number) => {
    if (!progress) return;

    const newAnswers = { ...progress.answers, [questionId]: value };
    const nextQuestion = progress.currentQuestion + 1;

    if (nextQuestion >= progress.quiz.questions.length) {
      let calculatedResult;
      let resultLabel = '';

      if (progress.quiz.type === 'mbti') {
        calculatedResult = calculateMBTI(newAnswers);
        resultLabel = calculatedResult.type;
      } else if (progress.quiz.type === 'love-language') {
        calculatedResult = calculateLoveLanguage(newAnswers);
        resultLabel = calculatedResult.primary;
      } else if (progress.quiz.type === 'big-five') {
        if (progress.quiz.id === 'mood-check-v1') {
          calculatedResult = calculateMoodCheck(newAnswers);
          resultLabel = calculatedResult.overallMood;
        } else if (progress.quiz.id === 'attachment-v1') {
          calculatedResult = calculateAttachment(newAnswers);
          resultLabel = calculatedResult.style;
        } else {
          calculatedResult = calculateBigFive(newAnswers);
          resultLabel = 'Big Five Profile';
        }
      } else if (progress.quiz.type === 'enneagram') {
        calculatedResult = calculateEnneagram(newAnswers);
        resultLabel = `Type ${calculatedResult.primaryType}${calculatedResult.wing ? `w${calculatedResult.wing}` : ''}`;
      } else {
        calculatedResult = calculateMoodCheck(newAnswers);
        resultLabel = calculatedResult.overallMood;
      }

      if (user) {
        const quizType = progress.quiz.id === 'mood-check-v1' ? 'mood-check' :
                         progress.quiz.id === 'attachment-v1' ? 'attachment' :
                         progress.quiz.type;
        await supabase.from('quiz_results').insert({
          user_id: user.id,
          quiz_type: quizType,
          quiz_id: progress.quiz.id,
          result: resultLabel,
          scores: calculatedResult,
          label: resultLabel,
        });
        loadPastResults();

        await adsService.checkAndShowAd(profile?.isPremium || profile?.isAdFree || false, 'quiz');
      }

      setResult({ quiz: progress.quiz, result: calculatedResult });
      setState('results');
    } else {
      setProgress({ ...progress, currentQuestion: nextQuestion, answers: newAnswers });
    }
  };

  const resetQuiz = () => {
    setProgress(null);
    setResult(null);
    setState('list');
    setExpandedSections({});
  };

  if (state === 'taking' && progress) {
    const question = progress.quiz.questions[progress.currentQuestion];
    const totalQuestions = progress.quiz.questions.length;
    const currentQ = progress.currentQuestion + 1;
    const progressPercent = (currentQ / totalQuestions) * 100;
    const isMoodCheck = progress.quiz.id === 'mood-check-v1';
    const isMBTI = progress.quiz.type === 'mbti';

    const showEncouragement = isMBTI && currentQ % 6 === 0 && currentQ < totalQuestions;
    const encouragement = encouragementMessages[Math.floor(currentQ / 6) % encouragementMessages.length];

    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={resetQuiz} className="p-2 -ml-2 hover:bg-mystic-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-mystic-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-mystic-200">{currentQ} / {totalQuestions}</p>
              <p className="text-xs text-mystic-500">{Math.round(progressPercent)}%</p>
            </div>
            <Progress value={progressPercent} variant="gold" size="sm" />
          </div>
        </div>

        {showEncouragement && (
          <div className="text-center py-2">
            <p className="text-sm text-gold/80 italic">{encouragement}</p>
          </div>
        )}

        <Card variant="glow" padding="lg">
          <h2 className="font-display text-xl text-mystic-100 mb-8 leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map(option => (
              <button
                key={option.value}
                onClick={() => answerQuestion(question.id, option.value)}
                className={`w-full p-4 text-left border rounded-xl transition-all active:scale-[0.98] ${
                  isMoodCheck
                    ? 'bg-mystic-800/30 hover:bg-gold/10 border-mystic-700 hover:border-gold/30'
                    : 'bg-mystic-800/50 hover:bg-mystic-700/50 border-mystic-600/50 hover:border-gold/30'
                }`}
              >
                <span className="text-mystic-200">{option.label}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (state === 'results' && result) {
    if (result.quiz.id === 'mood-check-v1') {
      const moodResult = result.result as ReturnType<typeof calculateMoodCheck>;
      const moodInfo = moodDescriptions[moodResult.overallMood];

      return (
        <div className="space-y-6 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-full bg-mystic-800 flex items-center justify-center ${moodInfo.color}`}>
              <Smile className="w-10 h-10" />
            </div>
            <h2 className="font-display text-2xl text-mystic-100 mb-2">{moodResult.overallMood}</h2>
            <p className="text-mystic-300">{moodInfo.message}</p>

            <div className="mt-6 flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-mystic-800" />
                  <circle
                    cx="64" cy="64" r="56" fill="none" stroke="url(#moodGradient)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(moodResult.moodScore / 100) * 352} 352`}
                  />
                  <defs>
                    <linearGradient id="moodGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d4af37" />
                      <stop offset="100%" stopColor="#f5d67b" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-display text-gold">{moodResult.moodScore}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(moodResult.dimensions).map(([dim, value]) => {
                const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                  energy: Battery,
                  emotion: Heart,
                  connection: Users,
                  clarity: Focus,
                };
                const Icon = icons[dim] || Sparkles;
                return (
                  <div key={dim} className="flex items-center gap-3 p-3 bg-mystic-800/30 rounded-xl">
                    <Icon className="w-5 h-5 text-gold" />
                    <div className="flex-1">
                      <p className="text-xs text-mystic-500 capitalize">{dim}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(value / 5) * 100} variant="gold" size="sm" className="flex-1" />
                        <span className="text-sm text-mystic-300">{value}/5</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <h3 className="font-medium text-gold mb-2">Suggestion for You</h3>
            <p className="text-mystic-300">{moodResult.suggestion}</p>
          </Card>

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            Take Another Quiz
          </Button>
        </div>
      );
    }

    if (result.quiz.type === 'mbti') {
      const mbtiResult = result.result as { type: string; dimensions: Record<string, number> };
      const typeInfo = mbtiDescriptions[mbtiResult.type];

      const CollapsibleSection = ({
        title,
        icon: Icon,
        sectionKey,
        children,
      }: {
        title: string;
        icon: React.ComponentType<{ className?: string }>;
        sectionKey: string;
        children: React.ReactNode;
      }) => {
        const isExpanded = expandedSections[sectionKey] ?? true;
        return (
          <Card padding="lg">
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gold" />
                <h3 className="font-medium text-mystic-200">{title}</h3>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-mystic-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-mystic-500" />
              )}
            </button>
            {isExpanded && <div className="mt-4">{children}</div>}
          </Card>
        );
      };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/30 to-mystic-800 flex items-center justify-center border-2 border-gold/30">
              <span className="font-display text-3xl text-gold">{mbtiResult.type}</span>
            </div>
            <h2 className="font-display text-2xl text-mystic-100">{typeInfo?.title}</h2>
            <p className="text-gold/80 text-sm mb-3">{typeInfo?.subtitle}</p>
            <p className="text-mystic-300 leading-relaxed">{typeInfo?.description}</p>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('mbti', mbtiResult.type)}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save to Profile
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('mbti', mbtiResult.type)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <CollapsibleSection title="Strengths" icon={Sparkles} sectionKey="strengths">
            <ul className="space-y-2">
              {typeInfo?.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Blind Spots" icon={AlertTriangle} sectionKey="blindspots">
            <ul className="space-y-2">
              {typeInfo?.blindSpots.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Under Stress" icon={Zap} sectionKey="stress">
            <ul className="space-y-2">
              {typeInfo?.underStress.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="In Relationships" icon={HeartHandshake} sectionKey="relationships">
            <ul className="space-y-2">
              {typeInfo?.inRelationships.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-cosmic-rose flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="At Work" icon={Briefcase} sectionKey="work">
            <ul className="space-y-2">
              {typeInfo?.atWork.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-cosmic-blue/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cosmic-blue" />
                  </div>
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Growth Quests" icon={Target} sectionKey="growth">
            <div className="space-y-4">
              {typeInfo?.growthQuests.map((quest, i) => (
                <div key={i} className="p-4 bg-gold/5 border border-gold/20 rounded-xl">
                  <h4 className="font-medium text-gold text-sm mb-1">{quest.title}</h4>
                  <p className="text-mystic-400 text-sm">{quest.description}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-mystic-200">Compatible Types</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeInfo?.compatibility.map((type, i) => (
                <span key={i} className="px-4 py-2 bg-cosmic-blue/20 text-cosmic-blue rounded-full text-sm font-medium">
                  {type}
                </span>
              ))}
            </div>
          </Card>

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            Take Another Quiz
          </Button>
        </div>
      );
    }

    if (result.quiz.id === 'big-five-v1') {
      const bfResult = result.result as ReturnType<typeof calculateBigFive>;
      const dimensions = [
        { key: 'openness', label: 'Openness', color: 'cosmic-blue' },
        { key: 'conscientiousness', label: 'Conscientiousness', color: 'emerald-400' },
        { key: 'extraversion', label: 'Extraversion', color: 'gold' },
        { key: 'agreeableness', label: 'Agreeableness', color: 'cosmic-rose' },
        { key: 'neuroticism', label: 'Emotional Stability', color: 'mystic-300' },
      ];

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <Pentagon className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-mystic-100 mb-2">Your Big Five Profile</h2>
            <p className="text-mystic-400 text-sm">Five dimensions that define your personality</p>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Trait Scores</h3>
            <div className="space-y-4">
              {dimensions.map(({ key, label, color }) => {
                const score = bfResult[key as keyof typeof bfResult] as number;
                const isHigh = score >= 60;
                const isLow = score <= 40;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mystic-300">{label}</span>
                      <span className={`text-${color}`}>{score}%</span>
                    </div>
                    <Progress value={score} variant={score >= 50 ? 'gold' : 'default'} size="sm" />
                    <p className="text-xs text-mystic-500 mt-1">
                      {isHigh ? 'Higher than average' : isLow ? 'Lower than average' : 'Average range'}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {dimensions.map(({ key, label }) => {
            const score = bfResult[key as keyof typeof bfResult] as number;
            const info = bigFiveDescriptions[key];
            const isHigh = score >= 50;
            return (
              <Card key={key} padding="lg">
                <div className="flex items-center gap-3 mb-3">
                  {isHigh ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-cosmic-blue" />}
                  <h3 className="font-medium text-mystic-200">{label}</h3>
                </div>
                <p className="text-mystic-400 text-sm mb-4">
                  {isHigh ? info.highDescription : info.lowDescription}
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-mystic-500 uppercase">Growth Tips</p>
                  {(isHigh ? info.growthTips.high : info.growthTips.low).slice(0, 2).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                      <span className="text-mystic-300 text-sm">{tip}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            Take Another Quiz
          </Button>
        </div>
      );
    }

    if (result.quiz.type === 'enneagram') {
      const enResult = result.result as ReturnType<typeof calculateEnneagram>;
      const typeInfo = enneagramDescriptions[enResult.primaryType];
      const wingInfo = enResult.wing ? enneagramDescriptions[enResult.wing] : null;

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gold/30 to-mystic-800 flex items-center justify-center border-2 border-gold/30">
              <span className="font-display text-4xl text-gold">{enResult.primaryType}</span>
            </div>
            <h2 className="font-display text-2xl text-mystic-100">{typeInfo.name}</h2>
            <p className="text-gold/80 text-sm mb-2">{typeInfo.title}</p>
            {enResult.wing && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-mystic-800/50 rounded-full">
                <span className="text-xs text-mystic-500">Wing:</span>
                <span className="text-sm text-mystic-300">{enResult.wing} - {wingInfo?.name}</span>
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('enneagram', String(enResult.primaryType), { enneagram_wing: enResult.wing })}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('enneagram', `Type ${enResult.primaryType} (${typeInfo.name})`)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">Core Pattern</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-gold flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Motivation</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreMotivation}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Fear</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreFear}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-cosmic-rose flex-shrink-0" />
                <div>
                  <p className="text-xs text-mystic-500">Core Desire</p>
                  <p className="text-mystic-300 text-sm">{typeInfo.coreDesire}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <p className="text-mystic-300 leading-relaxed">{typeInfo.description}</p>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-medium text-mystic-200">Growth Direction</h3>
            </div>
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mystic-400">Type {enResult.primaryType}</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Type {typeInfo.growthPath.direction}</span>
              </div>
              <p className="text-mystic-300 text-sm">{typeInfo.growthPath.description}</p>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <TrendingDown className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium text-mystic-200">Stress Direction</h3>
            </div>
            <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-mystic-400">Type {enResult.primaryType}</span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-medium">Type {typeInfo.stressPath.direction}</span>
              </div>
              <p className="text-mystic-300 text-sm">{typeInfo.stressPath.description}</p>
            </div>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-gold">Growth Practices</h3>
            </div>
            <ul className="space-y-2">
              {typeInfo.growthPractices.map((practice, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{practice}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            Take Another Quiz
          </Button>
        </div>
      );
    }

    if (result.quiz.id === 'attachment-v1') {
      const atResult = result.result as ReturnType<typeof calculateAttachment>;
      const styleInfo = attachmentDescriptions[atResult.style];

      const styleColors: Record<string, string> = {
        secure: 'emerald-400',
        anxious: 'cosmic-rose',
        avoidant: 'cosmic-blue',
        'fearful-avoidant': 'orange-400',
      };

      return (
        <div className="space-y-4 pb-6">
          <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Quizzes
          </button>

          <Card variant="glow" padding="lg" className="text-center">
            <Shield className={`w-16 h-16 text-${styleColors[atResult.style]} mx-auto mb-4`} />
            <p className="text-sm text-mystic-500 mb-1">Your Attachment Style</p>
            <h2 className="font-display text-2xl text-mystic-100 mb-2">{styleInfo.name}</h2>
            <p className="text-mystic-400 text-sm">{styleInfo.subtitle}</p>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => saveToProfile('attachment', atResult.style)}
              disabled={saving}
              className="min-h-[44px]"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => shareResult('attachment', styleInfo.name)}
              className="min-h-[44px]"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-4">Your Dimensions</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-mystic-300">Anxiety</span>
                  <span className="text-cosmic-rose">{atResult.anxiety}%</span>
                </div>
                <Progress value={atResult.anxiety} variant="default" size="sm" />
                <p className="text-xs text-mystic-500 mt-1">Fear of abandonment and need for reassurance</p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-mystic-300">Avoidance</span>
                  <span className="text-cosmic-blue">{atResult.avoidance}%</span>
                </div>
                <Progress value={atResult.avoidance} variant="default" size="sm" />
                <p className="text-xs text-mystic-500 mt-1">Discomfort with closeness and dependence</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="font-medium text-mystic-200 mb-3">What This Means</h3>
            <p className="text-mystic-400 text-sm leading-relaxed">{styleInfo.description}</p>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <HeartHandshake className="w-5 h-5 text-cosmic-rose" />
              <h3 className="font-medium text-mystic-200">In Relationships</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.inRelationships.slice(0, 4).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-cosmic-rose flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h3 className="font-medium text-mystic-200">Common Triggers</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.triggers.map((trigger, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                  <span className="text-mystic-300 text-sm">{trigger}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg" className="bg-gold/5 border-gold/20">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-5 h-5 text-gold" />
              <h3 className="font-medium text-gold">Healing Practices</h3>
            </div>
            <ul className="space-y-2">
              {styleInfo.healingPractices.map((practice, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-mystic-300 text-sm">{practice}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <div className="flex items-center gap-3 mb-4">
              <Focus className="w-5 h-5 text-mystic-400" />
              <h3 className="font-medium text-mystic-200">Journal Prompts</h3>
            </div>
            <div className="space-y-3">
              {styleInfo.journalPrompts.slice(0, 3).map((prompt, i) => (
                <div key={i} className="p-3 bg-mystic-800/50 rounded-lg">
                  <p className="text-mystic-300 text-sm italic">{prompt}</p>
                </div>
              ))}
            </div>
          </Card>

          <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
            Take Another Quiz
          </Button>
        </div>
      );
    }

    const llResult = result.result as { primary: string; scores: Record<string, number> };
    const sortedLanguages = Object.entries(llResult.scores).sort((a, b) => b[1] - a[1]);
    const primaryLang = sortedLanguages[0][0];
    const secondaryLang = sortedLanguages[1][0];
    const primaryInfo = loveLanguageDescriptions[primaryLang];
    const secondaryInfo = loveLanguageDescriptions[secondaryLang];

    return (
      <div className="space-y-4 pb-6">
        <button onClick={resetQuiz} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>

        <Card variant="glow" padding="lg" className="text-center">
          <Heart className="w-16 h-16 text-cosmic-rose mx-auto mb-4" />
          <p className="text-sm text-mystic-500 mb-1">Your Primary Love Language</p>
          <h2 className="font-display text-2xl text-mystic-100 mb-4">{primaryInfo?.title}</h2>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-mystic-800/50 rounded-full">
            <span className="text-xs text-mystic-500">Secondary:</span>
            <span className="text-sm text-mystic-300">{secondaryInfo?.title}</span>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => saveToProfile('love-language', primaryLang)}
            disabled={saving}
            className="min-h-[44px]"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => shareResult('love-language', primaryInfo?.title || primaryLang)}
            className="min-h-[44px]"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="min-h-[44px] opacity-60"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Compare
          </Button>
        </div>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-4">Your Scores</h3>
          <div className="space-y-4">
            {sortedLanguages.map(([lang, score], index) => {
              const info = loveLanguageDescriptions[lang];
              const isPrimary = index === 0;
              return (
                <div key={lang}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={isPrimary ? 'text-gold font-medium' : 'text-mystic-300'}>
                      {info?.title || lang}
                      {isPrimary && ' (Primary)'}
                      {index === 1 && ' (Secondary)'}
                    </span>
                    <span className="text-gold">{score}</span>
                  </div>
                  <Progress value={score} max={15} variant={isPrimary ? 'gold' : 'default'} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">What It Means</h3>
          <p className="text-mystic-400 text-sm leading-relaxed">{primaryInfo?.whatItMeans}</p>
        </Card>

        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium text-mystic-200">What You Need</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo?.whatYouNeed.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                <span className="text-mystic-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-mystic-200">What to Avoid</h3>
          </div>
          <ul className="space-y-2">
            {primaryInfo?.whatToAvoid.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />
                <span className="text-mystic-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg" className="bg-gold/5 border-gold/20">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-5 h-5 text-gold" />
            <h3 className="font-medium text-gold">Try This Week</h3>
          </div>
          <div className="space-y-3">
            {primaryInfo?.weeklyChecklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-mystic-900/50 rounded-lg">
                <span className="text-mystic-300 text-sm flex-1">{item.task}</span>
                <span className="text-xs text-gold/70 ml-3 whitespace-nowrap">{item.frequency}</span>
              </div>
            ))}
          </div>
        </Card>

        <Button variant="outline" fullWidth onClick={resetQuiz} className="min-h-[48px]">
          Take Another Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="font-display text-2xl text-mystic-100">Personality Quizzes</h1>
        <p className="text-mystic-400 mt-1">Discover more about yourself</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="loading-constellation mx-auto mb-4" />
          <p className="text-mystic-400">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(({ quiz, type, metadata }) => {
            const Icon = iconMap[metadata.icon] || Sparkles;
            const lastResult = getLastResult(type);
            const hasResult = !!lastResult;

            return (
              <Card
                key={quiz.id}
                interactive
                padding="lg"
                onClick={() => startQuiz(quiz)}
                className="active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-mystic-800 flex items-center justify-center flex-shrink-0 text-${metadata.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-mystic-100">{quiz.title}</h3>
                      {hasResult ? (
                        <RefreshCw className="w-4 h-4 text-mystic-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-mystic-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-mystic-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {metadata.timeEstimate}
                      </span>
                      {hasResult && lastResult.completed_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(lastResult.completed_at)}
                        </span>
                      )}
                    </div>

                    {hasResult && lastResult.label && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold">
                          <Zap className="w-3 h-3" />
                          {lastResult.label}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {metadata.whatYouGet.slice(0, 3).map((item, i) => (
                        <span key={i} className="px-2 py-0.5 bg-mystic-800/50 rounded text-xs text-mystic-400">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

        </div>
      )}
    </div>
  );
}
