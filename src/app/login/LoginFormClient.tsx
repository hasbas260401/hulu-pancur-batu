'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function LoginFormClient({ logoDesa }: { logoDesa?: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
      })

      // Penting: NextAuth mengembalikan HTTP 200 (ok: true) walaupun kredensial
      // salah. Pada kasus itu `error`/`code` tetap terisi dan `url` bernilai
      // null. Karena itu keberhasilan harus dicek dari `error`, bukan `ok`.
      if (result?.ok && !result?.error) {
        window.location.href = `${window.location.origin}/dashboard`
      } else {
        // auth.ts mengirim kode kesalahan yang spesifik lewat parameter `code`.
        // Jika kode tidak dikenali, tampilkan pesan umum yang jelas.
        const code = (result as { code?: string } | undefined)?.code
        const messages: Record<string, string> = {
          invalid_credentials: 'Password atau username salah.',
          account_inactive:
            'Akun Anda belum aktif. Hubungi Admin atau Kepala Dusun untuk proses verifikasi.',
          account_locked:
            'Akun dikunci sementara karena terlalu banyak percobaan. Coba lagi dalam 15 menit.',
          too_many_attempts:
            'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat lagi.',
          missing_fields: 'Username dan password wajib diisi.',
        }

        setError(messages[code ?? ''] ?? 'Password atau username salah.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kesalahan pada sistem.')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Background bersih sesuai pedoman DESIGN.md */}
      <div
        className="fixed inset-0 z-0 overflow-hidden bg-slate-50 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <div className="relative z-10 min-h-screen min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-geist-sans)]">
        <div className="w-full max-w-5xl">

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">

            {/* Panel Kiri */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">

              <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-3 relative z-10">
                <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold tracking-wider uppercase text-emerald-200">
                  Portal Resmi Desa
                </span>

                <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  SIDU Desa Hulu Pancur Batu
                </h2>
              </div>

              <div className="space-y-4 my-8 relative z-10">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-100">
                    Layanan Administrasi & Kependudukan
                  </p>

                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Sistem informasi terpadu untuk memudahkan warga dalam pengurusan surat dan layanan desa secara cepat dan transparan.
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-300/70 relative z-10">
                Pemerintah Desa Hulu Pancur Batu &copy; 2026
              </div>
            </div>

            {/* Panel Kanan */}
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
              <div className="w-full max-w-md mx-auto space-y-5">

                {/* Logo dan Judul */}
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto shadow-sm p-1.5 overflow-hidden">

                    {logoDesa ? (
                      <img
                        src={logoDesa}
                        alt="Logo Desa"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🏔️</span>
                    )}

                  </div>

                  <div className="space-y-0.5">
                    <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                      Masuk ke Akun
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                      Masukkan NIK dan password Anda untuk melanjutkan
                    </p>
                  </div>
                </div>

                {/* Pesan Error */}
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-start gap-3"
                  >
                    <span className="text-base leading-5 shrink-0">⚠️</span>
                    <span className="leading-5">{error}</span>
                  </div>
                )}

                {/* Form Login */}
                <form
                  onSubmit={handleSubmit}
                  suppressHydrationWarning
                  className="space-y-4"
                >

                  {/* Username */}
                  <div className="space-y-1">
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-slate-900"
                    >
                      Username / NIK
                    </label>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                      </span>

                      <input
                        id="username"
                        suppressHydrationWarning
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukkan username atau NIK"
                        className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-base sm:text-sm placeholder:text-slate-400 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-900"
                      >
                        Password
                      </label>

                      <Link
                        href="/forgot-password"
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition"
                      >
                        Lupa Password?
                      </Link>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="4" y="11" width="16" height="10" rx="2" />
                          <path d="M8 11V7a4 4 0 018 0v4" />
                        </svg>
                      </span>

                      <input
                        id="password"
                        suppressHydrationWarning
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 pl-11 pr-12 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-base sm:text-sm placeholder:text-slate-400 transition"
                      />

                      {/* Tombol tampilkan password */}
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showPassword ? (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
                            <path d="M1 1l22 22" />
                          </svg>
                        ) : (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tombol Login */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-sm transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Sedang Masuk...</span>
                      </>
                    ) : (
                      <span>Masuk ke Sistem</span>
                    )}
                  </button>
                </form>

                {/* Daftar Akun */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Belum punya akun warga?
                  </span>

                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl transition cursor-pointer shrink-0 text-center"
                  >
                    Daftar Akun
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}