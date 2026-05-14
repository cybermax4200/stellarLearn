export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  modules: Module[]
  price: number // in XLM
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface Module {
  id: string
  title: string
  order: number
  type: 'video' | 'quiz' | 'reading'
  durationMinutes: number
}

export interface Enrolment {
  learnerPublicKey: string
  courseId: string
  enrolledAt: string
  progress: Record<string, ModuleProgress>
}

export interface ModuleProgress {
  moduleId: string
  completed: boolean
  score?: number
  completedAt?: string
}

// Seed data — replace with PostgreSQL in production
export const COURSES: Course[] = [
  {
    id: 'stellar-fundamentals',
    title: 'Stellar Fundamentals',
    description: 'Learn the core concepts of the Stellar network: accounts, assets, transactions, and the Stellar Consensus Protocol.',
    instructor: 'StellarLearn Team',
    price: 10,
    category: 'blockchain',
    level: 'beginner',
    modules: [
      { id: 'intro-stellar', title: 'Introduction to Stellar', order: 1, type: 'video', durationMinutes: 15 },
      { id: 'accounts-assets', title: 'Accounts & Assets', order: 2, type: 'reading', durationMinutes: 20 },
      { id: 'quiz-basics', title: 'Basics Quiz', order: 3, type: 'quiz', durationMinutes: 10 },
    ],
  },
  {
    id: 'soroban-smart-contracts',
    title: 'Soroban Smart Contracts',
    description: 'Build and deploy Rust-based smart contracts on Stellar using the Soroban SDK.',
    instructor: 'StellarLearn Team',
    price: 25,
    category: 'blockchain',
    level: 'intermediate',
    modules: [
      { id: 'soroban-intro', title: 'Introduction to Soroban', order: 1, type: 'video', durationMinutes: 20 },
      { id: 'rust-basics', title: 'Rust for Soroban', order: 2, type: 'reading', durationMinutes: 30 },
      { id: 'first-contract', title: 'Your First Contract', order: 3, type: 'video', durationMinutes: 25 },
      { id: 'quiz-soroban', title: 'Soroban Quiz', order: 4, type: 'quiz', durationMinutes: 15 },
    ],
  },
  {
    id: 'defi-on-stellar',
    title: 'DeFi on Stellar',
    description: 'Explore decentralised finance primitives on Stellar: AMMs, liquidity pools, and cross-border payments.',
    instructor: 'StellarLearn Team',
    price: 20,
    category: 'defi',
    level: 'advanced',
    modules: [
      { id: 'defi-intro', title: 'DeFi Fundamentals', order: 1, type: 'video', durationMinutes: 20 },
      { id: 'amm-pools', title: 'AMMs & Liquidity Pools', order: 2, type: 'reading', durationMinutes: 25 },
      { id: 'quiz-defi', title: 'DeFi Quiz', order: 3, type: 'quiz', durationMinutes: 10 },
    ],
  },
]

// In-memory enrolment store (use PostgreSQL in production)
export const enrolments = new Map<string, Enrolment>()
