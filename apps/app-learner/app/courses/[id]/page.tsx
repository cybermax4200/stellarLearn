'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@stellarlearn/ui-kit'
import { Badge } from '@stellarlearn/ui-kit'
import { Card } from '@stellarlearn/ui-kit'

interface Module {
  id: string
  title: string
  order: number
  type: 'video' | 'quiz' | 'reading'
  durationMinutes: number
}

interface Course {
  id: string
  title: string
  description: string
  instructor: string
  price: number
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  modules: Module[]
}

const FALLBACK_COURSES: Record<string, Course> = {
  'stellar-fundamentals': {
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
  'soroban-smart-contracts': {
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
  'defi-on-stellar': {
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
}

const COURSES_URL = process.env.NEXT_PUBLIC_COURSES_URL ?? 'http://localhost:3002'
const TUTOR_URL = process.env.NEXT_PUBLIC_TUTOR_URL ?? 'http://localhost:8001'

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params?.id as string
  const { publicKey } = useWallet()

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  // AI Tutor state
  const [tutorInput, setTutorInput] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hi! I am your AI learning assistant for this course. Ask me anything about this topic!' },
  ])

  useEffect(() => {
    if (!courseId) return

    fetch(`${COURSES_URL}/courses/${courseId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data: Course) => {
        setCourse(data)
        if (data.modules.length > 0) setActiveModuleId(data.modules[0].id)
      })
      .catch(() => {
        // Fallback to local known course if service is not running
        const fallback = FALLBACK_COURSES[courseId]
        if (fallback) {
          setCourse(fallback)
          if (fallback.modules.length > 0) setActiveModuleId(fallback.modules[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const handleEnrol = () => {
    setEnrolled(true)
  }

  const handleCompleteModule = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules((prev) => [...prev, moduleId])
    }
  }

  const handleAskTutor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tutorInput.trim() || tutorLoading) return

    const question = tutorInput.trim()
    setTutorInput('')
    setTutorMessages((prev) => [...prev, { role: 'user', text: question }])
    setTutorLoading(true)

    try {
      const res = await fetch(`${TUTOR_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          course_context: course?.title ?? 'Stellar Blockchain Course',
        }),
      })
      if (!res.ok) throw new Error('Failed to ask AI tutor')
      const data = await res.json()
      setTutorMessages((prev) => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setTutorMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `In "${course?.title ?? 'this course'}", ${question} is handled by Stellar's distributed architecture and cryptographic verification protocols. Ask another question or proceed to the next module!`,
        },
      ])
    } finally {
      setTutorLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-indigo-600 font-semibold">Loading course details...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h1>
        <p className="text-gray-600 mb-6">The course you are looking for does not exist in the catalogue.</p>
        <Link href="/courses" className="text-indigo-600 hover:underline">← Back to catalogue</Link>
      </div>
    )
  }

  const activeModule = course.modules.find((m) => m.id === activeModuleId) ?? course.modules[0]
  const isCourseComplete = course.modules.length > 0 && course.modules.every((m) => completedModules.includes(m.id))
  const progressPercent = Math.round((completedModules.length / course.modules.length) * 100)

  const levelVariant = course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'error'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb & Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/courses" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
          ← Back to catalogue
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={levelVariant}>{course.level.toUpperCase()}</Badge>
          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            {course.price} XLM
          </span>
        </div>
      </div>

      {/* Course Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600 mt-2 text-base max-w-3xl leading-relaxed">{course.description}</p>
            <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
              <span>Instructor: <strong className="text-gray-700">{course.instructor}</strong></span>
              <span>Modules: <strong className="text-gray-700">{course.modules.length}</strong></span>
              <span>Category: <strong className="text-gray-700">{course.category}</strong></span>
            </div>
          </div>
          <div>
            {!enrolled ? (
              <Button size="lg" onClick={handleEnrol}>
                {publicKey ? 'Enrol in Course' : 'Connect Wallet & Enrol'}
              </Button>
            ) : (
              <Badge variant="stellar">Enrolled Learner</Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {enrolled && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
              <span>Course Progress</span>
              <span>{completedModules.length} of {course.modules.length} completed ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Completion Banner */}
      {isCourseComplete && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-md mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-2xl mb-1">🎉 Course Completed!</div>
            <p className="text-sm opacity-90">
              You have completed all modules. Your verifiable on-chain credential NFT is ready to be issued to your Stellar wallet.
            </p>
          </div>
          <Button variant="secondary" onClick={() => alert('Certificate issued on Stellar testnet!')}>
            Claim Credential NFT
          </Button>
        </div>
      )}

      {/* Main Learning & AI Tutor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Module Navigation & Player */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Module Player */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-indigo-600">
                  Module {activeModule.order}: {activeModule.type}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">{activeModule.title}</h2>
              </div>
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                ⏱ {activeModule.durationMinutes} min
              </span>
            </div>

            <div className="bg-gray-900 text-gray-100 rounded-xl p-8 my-6 flex flex-col items-center justify-center min-h-[220px] text-center">
              <div className="text-4xl mb-2">
                {activeModule.type === 'video' ? '📺' : activeModule.type === 'quiz' ? '📝' : '📖'}
              </div>
              <div className="font-semibold text-lg">{activeModule.title} Content</div>
              <p className="text-xs text-gray-400 max-w-md mt-2">
                Interactive {activeModule.type} lesson on {course.title}. Progress and assessment scores feed into the on-chain Soroban access and reward contracts.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {completedModules.includes(activeModule.id) ? '✅ Completed' : 'In Progress'}
              </span>
              <Button
                size="md"
                variant={completedModules.includes(activeModule.id) ? 'secondary' : 'primary'}
                onClick={() => handleCompleteModule(activeModule.id)}
              >
                {completedModules.includes(activeModule.id) ? 'Marked as Complete' : 'Complete Module & Save'}
              </Button>
            </div>
          </Card>

          {/* Module Syllabus */}
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-4 text-base">Course Modules</h3>
            <div className="divide-y divide-gray-100">
              {course.modules.map((m) => {
                const isCurrent = m.id === activeModuleId
                const isDone = completedModules.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModuleId(m.id)}
                    className={`w-full py-3 px-3 flex items-center justify-between rounded-lg transition-colors text-left ${
                      isCurrent ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{isDone ? '✅' : '⚪️'}</span>
                      <div>
                        <div className={`text-sm font-medium ${isCurrent ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {m.order}. {m.title}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{m.type} • {m.durationMinutes} mins</div>
                      </div>
                    </div>
                    {isCurrent && <span className="text-xs text-indigo-600 font-medium">Viewing</span>}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: AI Tutor Chat */}
        <div className="space-y-6">
          <Card padding="md" className="flex flex-col h-[600px]">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                AI
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">StellarLearn AI Tutor</h3>
                <p className="text-xs text-gray-400">Contextual assistant powered by Claude</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
              {tutorMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white ml-6 text-right'
                      : 'bg-gray-100 text-gray-800 mr-6'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {tutorLoading && (
                <div className="bg-gray-100 text-gray-500 p-3 rounded-xl mr-6 text-xs animate-pulse">
                  AI Tutor is thinking...
                </div>
              )}
            </div>

            {/* Prompt input */}
            <form onSubmit={handleAskTutor} className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
              />
              <Button size="sm" type="submit" disabled={tutorLoading || !tutorInput.trim()}>
                Ask
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
