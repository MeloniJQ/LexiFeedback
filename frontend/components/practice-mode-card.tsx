'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface PracticeModeCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  color: string
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: '#E6EFF7', text: '#2C5AA0', border: '#2C5AA0' },
  success: { bg: '#D1F5E8', text: '#10B981', border: '#10B981' },
  warning: { bg: '#FEF0D5', text: '#F59E0B', border: '#F59E0B' },
  danger: { bg: '#FEE3E3', text: '#EF4444', border: '#EF4444' },
}

export function PracticeModeCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: PracticeModeCardProps) {
  const colorStyle = colorMap[color] || colorMap.primary

  return (
    <Link href={href}>
      <div 
        className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-lg transition-all cursor-pointer group bg-white dark:bg-[#1F2937]"
        style={{ borderColor: colorStyle.border }}
      >
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
          style={{ backgroundColor: colorStyle.bg }}
        >
          <Icon className="w-6 h-6" style={{ color: colorStyle.text }} />
        </div>
        <h3 className="font-semibold text-lg text-[#1F2937] dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-[#6B7280] dark:text-gray-400 text-sm">
          {description}
        </p>
      </div>
    </Link>
  )
}
