'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAlert } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [nik, setNik] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [emailMasked, setEmailMasked] = useState('Masukkan NIK terlebih dahulu...')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const alert = useAlert()

  // Cek NIK dan Ambil Kisi-kisi Email secara Real-Time
  const handleNikChange = async (val: string) => {
    setNik(val)
    if (val.length === 16) {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-nik', nik: val }),
        })
        const data = await res.json()
        if (res.ok && data.maskedEmail) {
          setEmailMasked(data.maskedEmail)
          setError('')
        } else {
          setEmailMasked('NIK tidak ditemukan dalam sistem.')
          setError(data.error || 'NIK tidak terdaftar.')
        }
      } catch (err) {
        setEmailMasked('Gagal memuat data.')
      }
    } else {
      setEmailMasked('Masukkan 16 digit NIK...')
    }
  }

  // Kirim Link Reset Password ke Email dengan SweetAlert2
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nik.length !== 16 || !emailInput) {
      setError('Lengkapi NIK dan Email dengan benar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-link', nik, email: emailInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Reset Form
      setNik('')
      setEmailInput('')
      setEmailMasked('Masukkan NIK terlebih dahulu...')

      // Notifikasi sukses
      const lanjut = await alert.show({
        title: 'Berhasil Terkirim!',
        message:
          'Link reset password berhasil dikirim. Silakan periksa inbox atau folder spam email Anda.',
        type: 'success',
        confirmText: 'Kembali ke Login',
        persistent: true,
      })

      if (lanjut) {
        router.push('/login')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Background Bersih sesuai DESIGN.md */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-slate-50 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <div className="relative z-10 min-h-screen min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-5xl">
          
          {/* Kontainer Utama Split Screen */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* PANEL KIRI: Branding & Informasi */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-3 relative z-10">
                <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold tracking-wider uppercase text-emerald-200">
                  Pemulihan Akun
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">SIDU Desa Hulu Pancur Batu</h2>
              </div>

              <div className="space-y-4 my-8 relative z-10">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-100">Lupa Password Akun?</p>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Masukkan NIK terdaftar Anda untuk memverifikasi identitas, lalu kirimkan tautan pemulihan ke email aktif Anda.
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-300/70 relative z-10">
                &copy; 2026 Desa Hulu Pancur Batu
              </div>
            </div>

            {/* PANEL KANAN: Form Pemulihan Password */}
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
              <div className="w-full max-w-md mx-auto space-y-5">
                
                <div className="space-y-1">
                  <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mb-2 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Kembali ke Login
                  </Link>
                  <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                    Pemulihan Password
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Sistem Verifikasi & Reset Keamanan Warga
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetLink} className="space-y-4">
                  
                  {/* NIK Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium text-slate-900">NIK (16 Digit)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10" /><path d="M7 12h10" /><path d="M7 16h6" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        value={nik}
                        onChange={(e) => handleNikChange(e.target.value)}
                        placeholder="Masukkan 16 digit NIK"
                        className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Email Terdaftar Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-medium text-slate-900">Email Terdaftar</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={emailMasked}
                        className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Tombol Submit */}
                  <button
                    type="submit"
                    disabled={loading || nik.length !== 16 || !emailInput}
                    className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Mengirim Link...</span>
                      </>
                    ) : (
                      <span>Kirim Link Reset Password</span>
                    )}
                  </button>
                </form>

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}