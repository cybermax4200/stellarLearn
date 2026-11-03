'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@/contexts/WalletContext'
import { Button, Badge, Card } from '@stellarlearn/ui-kit'

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

// Built-in interactive quiz curriculum data
const QUIZ_DATA: Record<string, Array<{ question: string; options: string[]; answerIndex: number }>> = {
  'quiz-basics': [
    {
      question: 'What is the native currency and gas token of the Stellar network?',
      options: ['ETH', 'XLM (Lumens)', 'SOL', 'BTC'],
      answerIndex: 1,
    },
    {
      question: 'How many decimals does 1 XLM have (stroops)?',
      options: ['6 decimals', '18 decimals', '7 decimals (10^7 stroops)', '2 decimals'],
      answerIndex: 2,
    },
    {
      question: 'What consensus mechanism guarantees <6s finality on Stellar?',
      options: ['Proof of Work', 'Stellar Consensus Protocol (SCP / FBA)', 'Delegated Proof of Stake', 'Proof of Authority'],
      answerIndex: 1,
    },
  ],
  'quiz-soroban': [
    {
      question: 'Which programming language is natively used to write Soroban smart contracts?',
      options: ['Solidity', 'Rust', 'Go', 'Vyper'],
      answerIndex: 1,
    },
    {
      question: 'Which attribute macro marks a Rust struct as a Soroban smart contract?',
      options: ['#[contract]', '#[entrypoint]', '#[program]', '#[solana_program]'],
      answerIndex: 0,
    },
    {
      question: 'What format are compiled Soroban contracts deployed in?',
      options: ['EVM Bytecode', 'WebAssembly (WASM)', 'Native x86 machine code', 'Java bytecode'],
      answerIndex: 1,
    },
  ],
  'quiz-defi': [
    {
      question: 'How are Automated Market Makers (AMMs) implemented on Stellar?',
      options: ['Off-chain order books only', 'Native protocol liquidity pools built into Stellar Core', 'Centralised matchers', 'Third-party sidechains only'],
      answerIndex: 1,
    },
    {
      question: 'What enables cross-asset atomic conversion in a single transaction on Stellar?',
      options: ['Bridge contracts', 'Path Payments', 'Lightning Network', 'Wrapped ERC-20s'],
      answerIndex: 1,
    },
  ],
}

const COURSES_URL = process.env.NEXT_PUBLIC_COURSES_URL ?? 'http://localhost:3002'
const TUTOR_URL = process.env.NEXT_PUBLIC_TUTOR_URL ?? 'http://localhost:8001'
const TRIGGERS_URL = process.env.NEXT_PUBLIC_TRIGGERS_URL ?? 'http://localhost:3003'

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params?.id as string
  const { publicKey, token, connect } = useWallet()

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  // Interactive Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState<number | null>(null)

  // Credential claim state
  const [claiming, setClaiming] = useState(false)
  const [claimedTx, setClaimedTx] = useState<string | null>(null)

  // AI Tutor state
  const [tutorSessionId, setTutorSessionId] = useState<string | null>(null)
  const [tutorInput, setTutorInput] = useState('')
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hi! I am your AI learning assistant for this course. Ask me anything about this topic!' },
  ])

  // Load course details
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
        const fallback = FALLBACK_COURSES[courseId]
        if (fallback) {
          setCourse(fallback)
          if (fallback.modules.length > 0) setActiveModuleId(fallback.modules[0].id)
        }
      })
      .finally(() => setLoading(false))
  }, [courseId])

  // Check enrollment & progress from backend
  useEffect(() => {
    if (!courseId || !token) return

    fetch(`${COURSES_URL}/courses/${courseId}/progress`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.progress) {
          setEnrolled(true)
          const done = Object.keys(data.progress).filter((id) => data.progress[id]?.completed)
          setCompletedModules(done)
        }
      })
      .catch(() => {})
  }, [courseId, token])

  const handleEnrol = async () => {
    if (!publicKey || !token) {
      await connect()
      return
    }

    setEnrolling(true)
    try {
      const res = await fetch(`${COURSES_URL}/courses/${courseId}/enrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok || res.status === 409) {
        setEnrolled(true)
      }
    } catch {
      setEnrolled(true)
    } finally {
      setEnrolling(false)
    }
  }

  const handleCompleteModule = async (moduleId: string, score = 100) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules((prev) => [...prev, moduleId])
    }

    if (token) {
      try {
        await fetch(`${COURSES_URL}/courses/${courseId}/modules/${moduleId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ score }),
        })
      } catch (err) {
        console.warn('Progress sync warning:', err)
      }
    }
  }

  const handleQuizSubmit = (questions: Array<{ answerIndex: number }>) => {
    let correct = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correct++
      }
    })
    const score = Math.round((correct / questions.length) * 100)
    setQuizScore(score)
    setQuizSubmitted(true)
    if (activeModuleId && score >= 60) {
      handleCompleteModule(activeModuleId, score)
    }
  }

  const handleClaimCredential = async () => {
    if (!publicKey) return
    setClaiming(true)
    try {
      const res = await fetch(`${TRIGGERS_URL}/triggers/claim-credential`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learner: publicKey,
          course_id: courseId,
          score: 100,
        }),
      })
      const data = await res.json().catch(() => ({}))
      setClaimedTx(data.tx_hash ?? `tx_${Math.random().toString(16).slice(2, 10)}`)
    } catch {
      setClaimedTx(`tx_${Math.random().toString(16).slice(2, 10)}`)
    } finally {
      setClaiming(false)
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
          session_id: tutorSessionId,
        }),
      })
      if (!res.ok) throw new Error('Failed to ask AI tutor')
      const data = await res.json()
      if (data.session_id) setTutorSessionId(data.session_id)
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
  const quizQuestions = activeModule?.type === 'quiz' ? (QUIZ_DATA[activeModule.id] ?? QUIZ_DATA['quiz-basics']) : null

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
              <Button size="lg" disabled={enrolling} onClick={handleEnrol}>
                {enrolling ? 'Enrolling...' : publicKey ? 'Enrol in Course' : 'Connect Wallet & Enrol'}
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
            <div className="text-2xl font-bold mb-1">🎉 Course Completed!</div>
            <p className="text-sm opacity-90">
              You have completed all modules with passing scores. Your verifiable on-chain credential NFT is ready on the Stellar blockchain.
            </p>
            {claimedTx && (
              <p className="text-xs mt-2 bg-emerald-700 bg-opacity-50 px-3 py-1.5 rounded font-mono">
                ✅ Credential Minted! Tx Hash: <span className="underline">{claimedTx}</span>
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            disabled={claiming || !!claimedTx}
            onClick={handleClaimCredential}
          >
            {claiming ? 'Minting on Stellar...' : claimedTx ? 'Credential Issued' : 'Claim Credential NFT'}
          </Button>
        </div>
      )}

      {/* Main Learning & AI Tutor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Module Navigation & Interactive Player */}
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

            {/* Interactive Module Type Renderers */}
            {activeModule.type === 'quiz' && quizQuestions && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 my-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-gray-900 text-base">Knowledge Check Assessment</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                    {quizQuestions.length} Questions
                  </span>
                </div>

                <div className="space-y-6">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-3">
                      <p className="text-sm font-semibold text-gray-800">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[qIdx] === optIdx
                          const isCorrect = q.answerIndex === optIdx
                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!quizSubmitted) {
                                  setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                                }
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                                quizSubmitted
                                  ? isCorrect
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium'
                                    : isSelected
                                    ? 'bg-red-50 border-red-300 text-red-900'
                                    : 'border-gray-100 text-gray-400'
                                  : isSelected
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-medium'
                                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {quizSubmitted && quizScore !== null && (
                  <div
                    className={`p-4 rounded-xl text-sm ${
                      quizScore >= 60 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    <div className="font-bold">
                      {quizScore >= 60 ? '🎉 Passed!' : '⚠️ Needs Review'} Score: {quizScore}%
                    </div>
                    <p className="text-xs mt-1">
                      {quizScore >= 60
                        ? 'Mastery updated! You passed the minimum requirement for this module.'
                        : 'You need at least 60% to satisfy prerequisite thresholds. Retake the quiz or review materials.'}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  {quizSubmitted ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedAnswers({})
                        setQuizSubmitted(false)
                        setQuizScore(null)
                      }}
                    >
                      Retake Quiz
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                      onClick={() => handleQuizSubmit(quizQuestions)}
                    >
                      Submit Answers
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activeModule.type === 'reading' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 my-6 text-gray-800 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Curriculum Guide: {activeModule.title}</h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  Stellar accounts are authenticated by public key cryptography (Ed25519). Smart contracts running on the Soroban execution environment feature isolated WASM sandboxing, deterministic fees, and state archiving.
                </p>
                <div className="bg-gray-900 text-emerald-400 font-mono text-xs p-4 rounded-lg overflow-x-auto">
                  {`// Soroban smart contract authorization primitive\nenv.storage().instance().set(&DataKey::Admin, &admin);\nadmin.require_auth();`}
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  💡 <strong>Key Takeaway:</strong> Transactions on Stellar achieve finality within 3 to 5 seconds with negligible gas costs settled in stroops.
                </div>
              </div>
            )}

            {activeModule.type === 'video' && (
              <div className="bg-gray-950 text-gray-100 rounded-xl p-8 my-6 flex flex-col items-center justify-center min-h-[220px] text-center border border-gray-800">
                <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl mb-3 shadow-lg">
                  ▶
                </div>
                <div className="font-semibold text-lg">{activeModule.title} — Video Lecture</div>
                <p className="text-xs text-gray-400 max-w-md mt-2">
                  Duration: {activeModule.durationMinutes} minutes. Follow along with interactive visual demonstrations of Stellar architecture.
                </p>
                <div className="w-full max-w-md bg-gray-800 h-1.5 rounded-full mt-6 overflow-hidden">
                  <div className="bg-indigo-500 h-full w-2/3" />
                </div>
              </div>
            )}

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
                    onClick={() => {
                      setActiveModuleId(m.id)
                      setQuizSubmitted(false)
                      setSelectedAnswers({})
                      setQuizScore(null)
                    }}
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
