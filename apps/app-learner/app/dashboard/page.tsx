'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import Link from 'next/link'
import { Button } from '@stellarlearn/ui-kit'
import { Badge } from '@stellarlearn/ui-kit'
import { Card } from '@stellarlearn/ui-kit'

interface EnrolmentItem {
  learnerPublicKey: string
  courseId: string
  enrolledAt: string
  completedModulesCount: number
  isCompleted: boolean
  progress: Record<string, { completed: boolean; score?: number }>
  course: {
    id: string
    title: string
    description: string
    price: number
    level: 'beginner' | 'intermediate' | 'advanced'
    modules: Array<{ id: string; title: string }>
  }
}

const COURSES_URL = process.env.NEXT_PUBLIC_COURSES_URL ?? 'http://localhost:3002'
const ADAPTIVE_URL = process.env.NEXT_PUBLIC_ADAPTIVE_URL ?? 'http://localhost:8002'

export default function DashboardPage() {
  const { publicKey, token, disconnect } = useWallet()
  const [enrolments, setEnrolments] = useState<EnrolmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<{ module_id?: string | null; message?: string } | null>(null)

  useEffect(() => {
    if (!publicKey || !token) return
    setLoading(true)

    // Attempt to load live enrolments with authenticated user JWT
    fetch(`${COURSES_URL}/enrolments/mine`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.enrolments) {
          setEnrolments(data.enrolments)
        }
      })
      .catch(() => {
        // Service offline or non-mocked; keep default state
      })
      .finally(() => setLoading(false))

    // Fetch AI adaptive learning path recommendation
    fetch(`${ADAPTIVE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learner_id: publicKey,
        completed_modules: [],
        performance_scores: {},
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rec) => {
        if (rec) setRecommendation(rec)
      })
      .catch(() => {})
  }, [publicKey, token])

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your wallet</h1>
        <p className="text-gray-600 mb-6">Connect your Freighter wallet to view your dashboard.</p>
        <Link href="/" className="text-indigo-600 hover:underline">← Back to home</Link>
      </div>
    )
  }

  const short = `${publicKey.slice(0, 8)}…${publicKey.slice(-8)}`
  const completedCount = enrolments.filter((e) => e.isCompleted).length
  const estimatedLearn = completedCount * 10 + enrolments.reduce((acc, e) => acc + (e.completedModulesCount * 1), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learner Dashboard</h1>
          <p className="text-gray-500 font-mono text-sm mt-1">{short}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Courses Enrolled', value: enrolments.length, icon: '📚' },
          { label: 'Estimated LEARN Earned', value: `${estimatedLearn} LEARN`, icon: '🪙' },
          { label: 'Credentials Earned', value: completedCount, icon: '🏆' },
        ].map((stat) => (
          <Card key={stat.label} padding="lg">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {recommendation?.module_id && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🧠</div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-indigo-700">AI Adaptive Path Recommendation</div>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">Next Recommended Concept: <span className="text-indigo-600 capitalize">{recommendation.module_id.replace('-', ' ')}</span></h3>
              <p className="text-sm text-gray-600 mt-1">
                Based on your knowledge mastery model, advancing this module optimizes your retention.
              </p>
            </div>
          </div>
          <Link href="/courses">
            <Button size="sm">Resume Learning</Button>
          </Link>
        </div>
      )}

      <Card padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900 text-lg">My Enrolled Courses</h2>
          <Link href="/courses" className="text-sm text-indigo-600 hover:underline">
            Browse Catalogue →
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading your enrolments...</div>
        ) : enrolments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm">You haven&apos;t enrolled in any courses yet.</p>
            <Link
              href="/courses"
              className="mt-4 inline-block text-indigo-600 hover:underline text-sm font-medium"
            >
              Browse the catalogue →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolments.map((item) => (
              <div
                key={item.courseId}
                className="border border-gray-100 rounded-xl p-5 bg-gray-50 hover:bg-white hover:border-indigo-100 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={item.isCompleted ? 'success' : 'stellar'}>
                    {item.isCompleted ? 'Completed' : 'In Progress'}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    {item.completedModulesCount} / {item.course.modules.length} modules
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">{item.course.title}</h3>
                <p className="text-xs text-gray-600 line-clamp-2 mb-4">{item.course.description}</p>
                <Link
                  href={`/courses/${item.courseId}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Continue Learning →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
