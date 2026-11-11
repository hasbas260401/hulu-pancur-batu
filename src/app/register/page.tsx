'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAlert } from '@/components/ui/alert'

export default function RegisterPage() {
  const [nik, setNik] = useState('')
  const [nikStatus, setNikStatus] = useState<{ checked: boolean; valid: boolean; message: string; nama?: string; dusunNama?: string }>({ 
    checked: false, 
    valid: false, 
    message: '' 
  })
  
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState('')
  
  const [timeLeft, setTimeLeft] = useState(300)
  const [isTimerActive, setIsTimerActive] = useState(false)

  const [noWhatsapp, setNoWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [error, setError] = useState('')
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [loadingRegister, setLoadingRegister] = useState(false)
  const router = useRouter()
  const alert = useAlert()

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setIsTimerActive(false)
      setOtpError('Waktu OTP telah habis. Silakan kirim ulang kode.')
    }
    return () => clearInterval(timer)
  }, [isTimerActive, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleNikChange = async (val: string) => {
    setNik(val)
    if (val.length === 16) {
      try {
        const res = await fetch('/api/auth/check-nik', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: val }),
        })
        const data = await res.json()
        setNikStatus({ 
          checked: true, 
          valid: data.valid, 
          message: data.message, 
          nama: data.nama, 
          dusunNama: data.dusunNama 
        })
      } catch (err) {
        setNikStatus({ checked: true, valid: false, message: 'Gagal memverifikasi NIK.' })
      }
    } else {
      setNikStatus({ checked: false, valid: false, message: '' })
    }
  }

  const isPasswordStrong = (pass: string) => {
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return pass.length >= 8 && hasLetter && hasNumber
  }

  const handleSendOtp = async () => {
    if (!email) {
      setError('Masukkan email terlebih dahulu.')
      return
    }
    setError('')
    setLoadingOtp(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp', email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setOtpSent(true)
      setTimeLeft(300)
      setIsTimerActive(true)
      setOtpError('')
      setOtp('')
      setOtpVerified(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingOtp(false)
    }
  }

  const handleOtpChange = async (val: string) => {
    setOtp(val)
    setOtpError('')

    if (val.length === 6) {
      if (timeLeft === 0) {
        setOtpError('Waktu OTP telah habis.')
        return
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify-otp', email, otp: val }),
        })
        const data = await res.json()

        if (res.ok && data.valid) {
          setOtpVerified(true)
          setOtpError('')
        } else {
          setOtpVerified(false)
          setOtpError('Kode OTP tidak sesuai.')
        }
      } catch (err) {
        setOtpVerified(false)
        setOtpError('Gagal memverifikasi OTP.')
      }
    } else {
      setOtpVerified(false)
    }
  }

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nikStatus.valid) {
      setError('NIK belum valid atau belum terdaftar.')
      return
    }
    if (!otpVerified) {
      setError('Harap verifikasi kode OTP yang valid.')
      return
    }
    if (!isPasswordStrong(password)) {
      setError('Password harus gabungan huruf dan angka (minimal 8 karakter).')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }

    setLoadingRegister(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          nik,
          email,
          password,
          noWhatsapp,
          otp,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // --- RESET TOTAL SELURUH STATE FORM KE KOSONG ---
      setNik('')
      setNikStatus({ checked: false, valid: false, message: '' })
      setEmail('')
      setOtp('')
      setOtpSent(false)
      setOtpVerified(false)
      setIsTimerActive(false)
      setTimeLeft(300)
      setNoWhatsapp('')
      setPassword('')
      setConfirmPassword('')
      setOtpError('')

      // --- TAMPILKAN DIALOG SUKSES ---
      const lanjut = await alert.show({
        title: 'Pendaftaran Berhasil!',
        message:
          'Akun warga Anda berhasil didaftarkan dan saat ini sedang menunggu proses verifikasi oleh Admin atau Kepala Dusun.',
        type: 'success',
        confirmText: 'Masuk ke Halaman Login',
        persistent: true,
      })

      if (lanjut) {
        router.push('/login')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingRegister(false)
    }
  }

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
        <div className="w-full max-w-6xl">
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* PANEL KIRI: Branding */}
            <div className="lg:col-span-4 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-8 sm:p-10 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="space-y-3 relative z-10">
                <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold tracking-wider uppercase text-emerald-200">
                  Pendaftaran Warga
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">SIDU Desa Hulu Pancur Batu</h2>
              </div>

              <div className="space-y-4 my-8 relative z-10">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-100">Verifikasi NIK & Keamanan</p>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Daftarkan akun menggunakan NIK terdaftar dan verifikasi email untuk mengakses layanan desa.
                  </p>
                </div>
              </div>

              <div className="text-xs text-emerald-300/70 relative z-10">
                &copy; 2026 Desa Hulu Pancur Batu
              </div>
            </div>

            {/* PANEL KANAN: Form Pendaftaran */}
            <div className="lg:col-span-8 p-8 sm:p-12 flex flex-col justify-center bg-white">
              <div className="w-full max-w-3xl mx-auto space-y-5">
                
                <div className="text-center space-y-1">
                  <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                    Buat Akun Warga Baru
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Lengkapi formulir di bawah ini dengan data yang valid
                  </p>
                </div>

                {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl">⚠️ {error}</div>}

                <form onSubmit={handleSubmitRegister} className="space-y-4">
                  
                  {/* Grid 2 Kolom ke Samping */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* NIK */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">NIK (16 Digit)</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={nik}
                          onChange={(e) => handleNikChange(e.target.value)}
                          placeholder="Masukkan 16 digit NIK"
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                        />
                        {nikStatus.checked && (
                          <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                            {nikStatus.valid ? <CheckIcon /> : <CrossIcon />}
                          </span>
                        )}
                      </div>
                      {/* Pesan error NIK jika tidak valid */}
                      {nikStatus.checked && !nikStatus.valid && (
                        <p className="text-xs font-medium text-rose-600">
                          {nikStatus.message}
                        </p>
                      )}
                    </div>

                    {/* Kolom Khusus Disabled untuk Inisial Nama Warga */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">Inisial Nama Warga</label>
                      <input
                        type="text"
                        disabled
                        value={nikStatus.valid && nikStatus.nama ? `${nikStatus.nama} (${nikStatus.dusunNama || '-'})` : 'Otomatis terisi setelah NIK valid'}
                        className={`w-full h-11 px-3.5 border rounded-xl text-xs sm:text-sm font-medium cursor-not-allowed ${
                          nikStatus.valid 
                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' 
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      />
                    </div>

                  </div>

                  {/* Grid Kolom Email & Tombol OTP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Email Aktif */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">Email Aktif</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="contoh@email.com"
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          disabled={loadingOtp || !nikStatus.valid || (otpSent && timeLeft > 0)}
                          onClick={handleSendOtp}
                          className="px-5 h-11 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer transition disabled:opacity-50 flex items-center justify-center"
                        >
                          {loadingOtp ? '...' : (otpSent && timeLeft > 0 ? 'Kirim Ulang' : 'Kirim OTP')}
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">No. WhatsApp (Opsional)</label>
                      <input
                        type="text"
                        value={noWhatsapp}
                        onChange={(e) => setNoWhatsapp(e.target.value)}
                        placeholder="081234567890"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                      />
                    </div>

                  </div>

                  {/* OTP Input (Jika terkirim) */}
                  {otpSent && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs sm:text-sm font-medium text-slate-900">Kode OTP</label>
                        <span className="text-xs font-semibold text-emerald-700">Berlaku: {formatTime(timeLeft)}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          disabled={otpVerified || timeLeft === 0}
                          value={otp}
                          onChange={(e) => handleOtpChange(e.target.value)}
                          placeholder="Masukkan 6 digit OTP"
                          className={`w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm tracking-widest font-semibold ${otpVerified ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : ''}`}
                        />
                        {otp.length === 6 && (
                          <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                            {otpVerified ? <CheckIcon /> : <CrossIcon />}
                          </span>
                        )}
                      </div>
                      {otpError && <p className="text-xs text-rose-600">{otpError}</p>}
                    </div>
                  )}

                  {/* Grid Password & Konfirmasi Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Password Baru */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">Password Baru</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 karakter"
                          className="w-full h-11 px-3.5 pr-16 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
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
                      <p className={`text-[11px] ${isPasswordStrong(password) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        Harus gabungan huruf & angka, min. 8 karakter.
                      </p>
                    </div>

                    {/* Konfirmasi Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs sm:text-sm font-medium text-slate-900">Ulangi Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          className="w-full h-11 px-3.5 pr-16 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 focus:bg-white focus:outline-none text-slate-900 text-xs sm:text-sm"
                        />
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
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
                        <p className={`text-[11px] font-medium ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {password === confirmPassword ? '✓ Password sama dan cocok' : '✕ Password tidak sama'}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Tombol Submit */}
                  <button
                    type="submit"
                    disabled={loadingRegister || !nikStatus.valid || !otpVerified || !isPasswordStrong(password) || password !== confirmPassword}
                    className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer mt-2 flex items-center justify-center gap-2"
                  >
                    {loadingRegister ? 'Memproses Pendaftaran...' : 'Daftar Akun Warga'}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-100 text-center">
                  <p className="text-xs sm:text-sm text-slate-500">
                    Sudah punya akun?{' '}
                    <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800 transition">
                      Masuk di sini
                    </Link>
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  )
}