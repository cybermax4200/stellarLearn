import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = { sm: 'p-3', md: 'p-5', lg: 'p-8' }

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  )
}
