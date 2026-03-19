// ===== Database Types =====

export interface User {
  id: string;
  email: string;
  monthly_budget: number;
  billing_start_day: number;
  plan_type: 'free' | 'premium' | 'coaching';
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  item_name: string;
  general_category: GeneralCategory;
  user_memo: string;
  ai_psychological_category: PsychologicalCategory | null;
  ai_reason: string | null;
  created_at: string;
}

// ===== Category Types =====

export type GeneralCategory =
  | 'food'
  | 'daily_necessities'
  | 'transportation'
  | 'entertainment'
  | 'clothing'
  | 'healthcare'
  | 'education'
  | 'housing'
  | 'utility'
  | 'communication'
  | 'hobby'
  | 'social'
  | 'other';

export type PsychologicalCategory =
  | 'stress_relief'
  | 'vanity'
  | 'habit'
  | 'reward'
  | 'self_investment'
  | 'necessity';

// ===== Form Types =====

export interface TransactionFormData {
  transaction_date: string;
  amount: number;
  item_name: string;
  general_category: GeneralCategory;
  user_memo: string;
}

// ===== Budget Types =====

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
}

export interface BudgetSummary {
  monthlyBudget: number;
  totalSpent: number;
  remainingBudget: number;
  remainingDays: number;
  dailyBudget: number;
}
