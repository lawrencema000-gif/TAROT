import {
  Award,
  Badge,
  BookOpen,
  Bookmark,
  Brain,
  Building2,
  Cake,
  Calendar,
  Circle,
  CircleDot,
  Club,
  Coins,
  Compass,
  Crown,
  Diamond,
  Eye,
  Flag,
  Flame,
  Footprints,
  Gem,
  GraduationCap,
  Heart,
  Infinity,
  Layers,
  LayoutGrid,
  Leaf,
  Library,
  Moon,
  MoonStar,
  Mountain,
  PenTool,
  Rocket,
  Scroll,
  Search,
  Shield,
  Smile,
  Spade,
  Sparkles,
  Square,
  Star,
  Sun,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * The icons the achievements table names, resolved by hand.
 *
 * `achievements.icon_name` is a lucide kebab-case name written by the seed
 * migrations (20260127070447_seed_achievement_definitions.sql, 40 names) and
 * the five category icons in services/achievements.ts. Three components
 * resolved them with `import * as LucideIcons from 'lucide-react'` indexed
 * by PascalCase, which made the whole icon set (1,437 modules, 112 KB gz)
 * unshakeable — and because AchievementUnlockModal is in the entry graph via
 * GlobalAchievementCelebration, every visitor downloaded every icon.
 *
 * This map is the explicit, typed version: one import per name the data
 * actually uses, plus the four suit marks for the cartomancy achievements.
 * A name not listed here falls back to the component's default (Award or
 * Circle), exactly as the dynamic lookup did for a typo. When a migration
 * adds an icon, add it here — a missing entry shows the fallback, never a
 * crash.
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  award: Award,
  badge: Badge,
  'book-open': BookOpen,
  bookmark: Bookmark,
  brain: Brain,
  'building-2': Building2,
  cake: Cake,
  calendar: Calendar,
  circle: Circle,
  'circle-dot': CircleDot,
  club: Club,
  coins: Coins,
  compass: Compass,
  crown: Crown,
  diamond: Diamond,
  eye: Eye,
  flag: Flag,
  flame: Flame,
  footprints: Footprints,
  gem: Gem,
  'graduation-cap': GraduationCap,
  heart: Heart,
  infinity: Infinity,
  layers: Layers,
  'layout-grid': LayoutGrid,
  leaf: Leaf,
  library: Library,
  moon: Moon,
  'moon-star': MoonStar,
  mountain: Mountain,
  'pen-tool': PenTool,
  rocket: Rocket,
  scroll: Scroll,
  search: Search,
  shield: Shield,
  smile: Smile,
  spade: Spade,
  sparkles: Sparkles,
  square: Square,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  target: Target,
  'trending-up': TrendingUp,
  trophy: Trophy,
  'wand-2': Wand2,
  zap: Zap,
};

/** Resolve an `icon_name` from the achievements table; unknown names take `fallback`. */
export function achievementIcon(name: string | null | undefined, fallback: LucideIcon = Award): LucideIcon {
  if (!name) return fallback;
  return ACHIEVEMENT_ICONS[name.trim().toLowerCase()] ?? fallback;
}
