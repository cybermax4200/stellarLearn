'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Badge } from '@stellarlearn/ui-kit'
import { useWallet } from '@/contexts/WalletContext'
import Link from 'next/link'

interface CourseItem {
  id: string
  title: string
  description: string
  price: number
  level: string
  moduleCount: number
}

const COURSES_URL = process.env.NEXT_PUBLIC_COURSES_URL ?? 'http://localhost:3002'

export default function InstructorPage() {
  const { publicKey } = useWallet()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPrice, setNewPrice] = useState('15')
  const [newLevel, setNewLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((r) => r.json())
      .then((data) => setCourses(data as CourseItem[]))
      .catch(() => {})
  }, [])

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newId = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const coursePayload = {
      id: newId,
      title: newTitle,
      description: newDescription,
      instructor: publicKey ? `${publicKey.slice(0, 6)}...` : 'Instructor',
      price: parseFloat(newPrice) || 10,
      category: 'blockchain',
      level: newLevel,
      modules: [
        { id: `${newId}-1`, title: 'Introduction & Concepts', order: 1, type: 'video', durationMinutes: 15 },
        { id: `${newId}-2`, title: 'Deep Dive Architecture', order: 2, type: 'reading', durationMinutes: 25 },
        { id: `${newId}-3`, title: 'Mastery Assessment', order: 3, type: 'quiz', durationMinutes: 10 },
      ],
    }

    try {
      const res = await fetch(`${COURSES_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coursePayload),
      })
      if (res.ok) {
        setStatusMsg(`Course "${newTitle}" created successfully!`)
        setCourses((prev) => [
          ...prev,
          {
            id: newId,
            title: newTitle,
            description: newDescription,
            price: parseFloat(newPrice) || 10,
            level: newLevel,
            moduleCount: 3,
          },
        ])
        setShowCreateModal(false)
        setNewTitle('')
        setNewDescription('')
      }
    } catch {
      setStatusMsg('Created course locally.')
      setShowCreateModal(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instructor Studio</h1>
          <p className="text-gray-600 mt-1">
            Author courses, publish quizzes, track learner completions, and configure Soroban rewards.
          </p>
        </div>
        <Button size="md" onClick={() => setShowCreateModal(true)}>
          + Create New Course
        </Button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm mb-6 flex justify-between items-center">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card padding="md">
          <div className="text-sm font-semibold text-gray-500">Active Courses</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{courses.length}</div>
        </Card>
        <Card padding="md">
          <div className="text-sm font-semibold text-gray-500">Total Enrolled Learners</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">42</div>
        </Card>
        <Card padding="md">
          <div className="text-sm font-semibold text-gray-500">Credentials Issued</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">29</div>
        </Card>
        <Card padding="md">
          <div className="text-sm font-semibold text-gray-500">Total XLM Revenue</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">420 XLM</div>
        </Card>
      </div>

      {/* Courses List */}
      <Card padding="lg">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Managed Courses</h2>
        <div className="divide-y divide-gray-100">
          {courses.map((course) => (
            <div key={course.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{course.title}</h3>
                  <Badge variant="stellar">{course.level}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {course.moduleCount} modules • Course fee: {course.price} XLM
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/courses/${course.id}`}>
                  <Button size="sm" variant="secondary">View Learner View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Advanced Soroban DeFi Architectures"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the learning objectives and prerequisites..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Price (XLM)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty Level</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-600"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Publish Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
