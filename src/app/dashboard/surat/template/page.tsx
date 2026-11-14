import { prisma } from '@/lib/prisma'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import CopyPlaceholderClient from './CopyPlaceholderClient'
import TemplateManager from './TemplateManager'
import { getSessionUser } from '@/lib/require-admin'
import { Zap, ClipboardList, FileText } from 'lucide-react'

const PAGE_SIZE = 3

export default function TemplateSuratPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <TemplateContent />
    </Suspense>
  )
}

async function TemplateContent() {
  await connection()

  const user = await getSessionUser()
  if (!user) redirect('/login')
  const canManage = user.role === 'ADMIN'

  const [totalTemplates, daftarTemplate] = await Promise.all([
    prisma.templateSurat.count(),
    prisma.templateSurat.findMany({
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: 0,
      select: { id: true, kode: true, nama: true, kodeKlasifikasi: true, filePath: true },
    }),
  ])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">Manajemen Template Surat</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Upload dan kelola master template surat desa (.docx) untuk generate otomatis.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/surat/buat"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" /> Buat / Generate Surat
          </Link>
          <Link
            href="/dashboard/surat/riwayat"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" /> Riwayat Cetak
          </Link>
        </div>
      </div>

      {/* Form upload + panel placeholder + tabel: satu komponen agar daftar bisa langsung diperbarui */}
      <TemplateManager
        initialData={daftarTemplate}
        initialTotal={totalTemplates}
        canManage={canManage}
        sidePanel={
          canManage ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-full">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Tag Placeholder Word (.docx)
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Klik ikon salin di samping tag untuk menyalin langsung ke master Word Anda:
            </p>

            <CopyPlaceholderClient />
          </div>
          ) : null
        }
      />
    </div>
  )
}