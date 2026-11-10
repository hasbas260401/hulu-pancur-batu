'use client'

import { useEffect, useState } from 'react'

interface CounterCardProps {
  endValue: number
  label: string
  colorClass: string
}

export default function CounterCard({ endValue, label, colorClass }: CounterCardProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (endValue <= 0) return

    let startTime: number | null = null
    const duration = 1500 // Durasi animasi dalam milidetik (1.5 detik)

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = timestamp - startTime
      const percentage = Math.min(progress / duration, 1)
      
      // Efek easing (easeOutExpo agar mulus di akhir)
      const currentCount = Math.floor(percentage === 1 ? endValue : endValue * (1 - Math.pow(2, -10 * percentage)))

      setCount(currentCount)

      if (progress < duration) {
        requestAnimationFrame(animateCount)
      }
    }

    requestAnimationFrame(animateCount)
  }, [endValue])

  return (
    <div className="bg-white/10 border border-white/10 backdrop-blur-md px-4 py-3 sm:p-5 rounded-2xl flex sm:block items-center justify-between gap-4 sm:space-y-1">
      <div className={`text-2xl sm:text-3xl font-extrabold ${colorClass} order-2 sm:order-none`}>
        {count.toLocaleString('id-ID')}
      </div>
      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{label}</div>
    </div>
  )
}