'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const PLACEHOLDERS = [
  '[[nama]]', '[[nik]]', '[[no_kk]]', '[[jenis_kelamin]]',
  '[[tempat_lahir]]', '[[tanggal_lahir]]', '[[agama]]', '[[pekerjaan]]',
  '[[alamat]]', '[[dusun]]', '[[keperluan]]', '[[nomor_surat]]', '[[tanggal_surat]]'
]

export default function CopyPlaceholderClient() {
  const [copiedTag, setCopiedTag] = useState<string | null>(null)

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopiedTag(tag)
    setTimeout(() => setCopiedTag(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
      {PLACEHOLDERS.map((tag) => (
        <div 
          key={tag}
          className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition text-xs font-mono"
        >
          <span className="text-emerald-700 font-bold">{tag}</span>
          <button
            type="button"
            onClick={() => handleCopy(tag)}
            className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-white transition cursor-pointer"
            title="Salin tag"
          >
            {copiedTag === tag ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  )
}