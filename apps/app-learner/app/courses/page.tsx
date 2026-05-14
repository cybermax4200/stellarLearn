'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  instructor: string
  price: number
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  moduleCount: number
}

const levelColour = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
}

const COURSES_URL = process.env.NEXT_PUBLIC_COURSES_URL ?? 'http://localhost:3002'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${COURSES_URL}/courses`)
      .then((r) => r.json())
      .then((data) => setCourses(data as Course[]))
      .catch(() => setError('Could not load courses. Is service-courses running?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Course Catalogue</h1>
        <p className="text-gray-600 mt-2">
          Earn LEARN tokens and on-chain credentials as you complete each course.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColour[course.level]}`}
                >
                  {course.level}
                </span>
                <span className="text-sm font-semibold text-indigo-600">{course.price} XLM</span>
              </div>
              <h2 className="font-semibold text-gray-900 text-lg mb-2">{course.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed flex-1">{course.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{course.moduleCount} modules</span>
                <span>{course.category}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
