import { GeneralCategory, PsychologicalCategory } from '@/types';

// ===== 一般費目カテゴリ =====

export const GENERAL_CATEGORIES: Record<GeneralCategory, string> = {
  food: '食費',
  daily_necessities: '日用品',
  transportation: '交通費',
  entertainment: '娯楽',
  clothing: '衣服',
  healthcare: '医療・健康',
  education: '教育',
  housing: '住居',
  utility: '光熱費',
  communication: '通信費',
  hobby: '趣味',
  social: '交際費',
  other: 'その他',
};

// ===== 心理要因カテゴリ =====

export const PSYCHOLOGICAL_CATEGORIES: Record<PsychologicalCategory, { label: string; emoji: string; color: string }> = {
  stress_relief: { label: 'ストレス発散', emoji: '😤', color: '#ef4444' },
  vanity: { label: '見栄・承認欲求', emoji: '✨', color: '#f59e0b' },
  habit: { label: '習慣・惰性', emoji: '🔄', color: '#8b5cf6' },
  reward: { label: 'ご褒美', emoji: '🎁', color: '#ec4899' },
  self_investment: { label: '自己投資', emoji: '📚', color: '#3b82f6' },
  necessity: { label: '必要経費', emoji: '🏠', color: '#22c55e' },
};

// ===== デフォルト設定 =====

export const DEFAULT_BILLING_START_DAY = 25;
export const DEFAULT_MONTHLY_BUDGET = 200000;
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
