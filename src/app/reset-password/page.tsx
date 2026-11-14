'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAlert } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const router = useRouter()
  const alert = useAlert()
  const [token, setToken] = useState('')
  const [nik, setNik] = useState('')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loadingToken, setLoadingToken] = useState(true)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) {
      setError('Token pemulihan tidak valid.')
      setLoadingToken(false)
      return
    }
    setToken(t)
    verifyToken(t)
  }, [])

  const verifyToken = async (t: string) => {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${t}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNik(data.nik)
    } catch (err: any) {
      setError(err.message || 'Token tidak valid atau kedaluwarsa.')
    } finally {
      setLoadingToken(false)
    }
  }

  const isPasswordStrong = (pass: string) => {
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return pass.length >= 8 && hasLetter && hasNumber
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordStrong(password)) {
      setError('Password harus gabungan huruf dan angka, minimal 8 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setLoadingSubmit(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const lanjut = await alert.show({
        title: 'Password Berhasil Diubah!',
        message:
          'Password akun Anda telah diperbarui. Silakan masuk kembali menggunakan password baru.',
        type: 'success',
        confirmText: 'Masuk ke Halaman Login',
        persistent: true,
      })

      if (lanjut) {
        router.push('/login?reset=success')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingSubmit(false)
    }
  }

  // Komponen Ikon Centang & Silang Profesional
  const CheckIcon = () => (
    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )

  const CrossIcon = () => (
    <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  const EyeIcon = () => (
    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  const EyeOffIcon = () => (
    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )

  return (
    <>
      <div className="fixed inset-0 z-0 overflow-hidden bg-slate-50 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <div className="relative z-10 min-h-screen min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-5xl">
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* PANEL KIRI: Branding */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-3 relative z-10">
                <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold tracking-wider uppercase text-emerald-200">
                  Keamanan Akun
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">SIDU Desa Hulu Pancur Batu</h2>
              </div>

              <div className="space-y-4 my-8 relative z-10">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-100">Perbarui Password Baru</p>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Masukkan password baru yang kuat untuk mengamankan kembali akun warga Anda pada sistem layanan desa.
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-300/70 relative z-10">
                &copy; 2026 Desa Hulu Pancur Batu
              </div>
            </div>

            {/* PANEL KANAN: Form Reset Password */}
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
              <div className="w-full max-w-md mx-auto space-y-5">
                
                <div className="space-y-1">
                  <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                    Buat Password Baru
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Desa Hulu Pancur Batu
                  </p>
                </div>

                {loadingToken ? (
                  <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center gap-2">
                    <svg className="animate-spin h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memvalidasi tautan pemulihan...</span>
                  </div>
                ) : error && !nik ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl text-center">⚠️ {error}</div>
                    <Link href="/login" className="block text-center w-full h-11 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl transition leading-[44px]">
                      Kembali ke Login
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl">
                        ⚠️ {error}
                      </div>
                    )}

                    {/* 1. NIK OTOMATIS & DISABLE */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-900">NIK (Terkunci)</label>
                      <input
                        type="text"
                        disabled
                        value={nik}
                        className="w-full h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed font-medium"
                      />
                    </div>

                    {/* 2. PASSWORD BARU DENGAN INDIKATOR KEKUATAN */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-900">Password Baru</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 karakter (Huruf & Angka)"
                          className="w-full h-11 px-4 pr-16 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                          {password && (
                            <span>{isPasswordStrong(password) ? <CheckIcon /> : <CrossIcon />}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs ${isPasswordStrong(password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        Harus gabungan huruf dan angka, minimal 8 karakter.
                      </p>
                    </div>

                    {/* 3. ULANGI PASSWORD DENGAN INDIKATOR KECOCOKAN */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-900">Ulangi Password Baru</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          className="w-full h-11 px-4 pr-16 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                          {confirmPassword && (
                            <span>{password === confirmPassword ? <CheckIcon /> : <CrossIcon />}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>
                      {confirmPassword && (
                        <p className={`text-xs font-medium ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {password === confirmPassword ? '✓ Password sama dan cocok' : '✕ Password tidak sama'}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loadingSubmit || !isPasswordStrong(password) || password !== confirmPassword}
                      className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {loadingSubmit ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}