import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import FormUserManagement from './FormUserManagement'
import Link from 'next/link'
import DeleteUserButton from './DeleteUserButton'
import { requireAdmin } from '@/lib/require-admin'
import { createUserAction, updatePermissionsAction, deleteUserAction } from './actions'
import { 
  UserPlus, 
  Pencil, 
  Trash2, 
  Check, 
  MapPin, 
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

const prisma = new PrismaClient()

// Pesan hasil aksi (kode pendek di URL, teksnya ditentukan di sini)
const NOTICES: Record<string, { type: 'success' | 'error'; text: string }> = {
  dibuat: { type: 'success', text: 'Akun baru berhasil dibuat.' },
  tersimpan: { type: 'success', text: 'Perubahan akun disimpan. Pengguna tersebut harus login ulang agar perubahan berlaku.' },
  dihapus: { type: 'success', text: 'Akun berhasil dihapus.' },
  'username-dipakai': { type: 'error', text: 'Username sudah dipakai akun lain.' },
  'username-tidak-valid': { type: 'error', text: 'Username 3-50 karakter dan hanya boleh huruf, angka, titik, strip, atau garis bawah.' },
  'password-lemah': { type: 'error', text: 'Password harus 8 sampai 72 karakter.' },
  'peran-tidak-valid': { type: 'error', text: 'Peran tidak valid.' },
  'status-tidak-valid': { type: 'error', text: 'Status akun tidak valid.' },
  'wa-tidak-valid': { type: 'error', text: 'Nomor WhatsApp tidak valid (8-15 angka).' },
  'dusun-wajib': { type: 'error', text: 'Kepala Dusun wajib memiliki wilayah dusun penugasan.' },
  'dusun-tidak-ada': { type: 'error', text: 'Dusun yang dipilih tidak ditemukan.' },
  'tidak-ditemukan': { type: 'error', text: 'Akun tidak ditemukan.' },
  'ubah-diri-sendiri': { type: 'error', text: 'Anda tidak dapat menurunkan peran atau menonaktifkan akun Anda sendiri.' },
  'admin-terakhir': { type: 'error', text: 'Tidak dapat dilakukan: harus tersisa minimal satu admin yang aktif.' },
  'hapus-diri-sendiri': { type: 'error', text: 'Anda tidak dapat menghapus akun Anda sendiri.' },
  'hapus-admin': { type: 'error', text: 'Akun admin tidak dapat dihapus. Ubah perannya terlebih dahulu.' },
  'bukan-admin': { type: 'error', text: 'Hanya admin yang dapat mengelola akun.' },
  gagal: { type: 'error', text: 'Terjadi kesalahan. Silakan coba lagi.' },
}

// --- MAIN PAGE COMPONENT ---

export default function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    editId?: string;
    page?: string;
    msg?: string;
  }>
}) {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] w-full">
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-lg">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Memuat data...</span>
          </div>
        </div>
      }
    >
      <UsersContent searchParams={searchParams} />
    </Suspense>
  )
}

async function UsersContent({
  searchParams,
}: {
  searchParams?: Promise<{
    editId?: string;
    page?: string;
    msg?: string;
  }>
}) {
  // Hanya ADMIN yang boleh membuka halaman ini (sebelumnya siapa pun bisa melihat daftar akun)
  const admin = await requireAdmin()
  if (!admin.ok) {
    if (admin.status === 401) redirect('/login')
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Akses ditolak</h1>
        <p className="mt-1 text-sm text-slate-500">Halaman ini hanya untuk Administrator.</p>
      </div>
    )
  }

  const resolvedParams = await searchParams
  const editId = resolvedParams?.editId
  const notice =
    resolvedParams?.msg && Object.prototype.hasOwnProperty.call(NOTICES, resolvedParams.msg)
      ? NOTICES[resolvedParams.msg]
      : null

  // --- PAGINATION CONFIG (Dibatasi 8 item per halaman) ---
  const PAGE_SIZE = 8
  const currentPage = Math.min(100000, Math.max(1, Math.floor(Number(resolvedParams?.page)) || 1))
  const skip = (currentPage - 1) * PAGE_SIZE

  // Hitung total data user di database
  const totalUsers = await prisma.user.count()
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

  // Ambil data user sejumlah PAGE_SIZE
  const listUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      statusAkun: true,
      noWhatsapp: true,
      permissions: true,
      dusun: { select: { nama: true, nomor: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    skip: skip,
  })

  // Ambil data dusun untuk pilihan Kadus
  const dusuns = await prisma.dusun.findMany({
    orderBy: { id: 'asc' },
  })

  // Jika sedang mode edit
  const userToEdit = editId
    ? await prisma.user.findUnique({
        where: { id: editId },
        // userToEdit dikirim ke browser: hanya kolom yang dibutuhkan formulir (tanpa passwordHash/OTP)
        select: { id: true, username: true, role: true, statusAkun: true, dusunId: true, noWhatsapp: true, permissions: true },
      })
    : null

  // Helper URL untuk tombol pagination
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams()
    if (editId) params.set('editId', editId)
    params.set('page', pageNumber.toString())
    return `/dashboard/users?${params.toString()}`
  }

  return (
    <div className="space-y-6 pb-12">
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen User & Kadus</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola akun warga, Kepala Dusun (Kadus), serta atur hak akses menu sistem secara terpusat.</p>
        </div>
      </div>

      {/* Grid Layout Proporsional */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Form Input (4 Kolom) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-4 sticky top-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              {userToEdit ? (
                <>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                    <Pencil className="w-3.5 h-3.5" />
                  </div>
                  <span>Edit Hak Akses & Dusun</span>
                </>
              ) : (
                <>
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <span>Tambah User Baru</span>
                </>
              )}
            </h2>
            {userToEdit && (
              <a
                href="/dashboard/users"
                className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100"
              >
                <UserPlus className="w-3 h-3" /> Buat Baru
              </a>
            )}
          </div>
          <FormUserManagement 
            key={editId || 'new'}
            userToEdit={userToEdit} 
            dusuns={dusuns}
            createUserAction={createUserAction} 
            updatePermissionsAction={updatePermissionsAction} 
          />
        </div>

        {/* Kolom Kanan: Tabel Daftar Akun (8 Kolom) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:col-span-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daftar Akun & Hak Akses Menu</h2>
              <p className="text-[11px] text-slate-400">Total keseluruhan: {totalUsers} akun terdaftar di database</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[11px] font-extrabold rounded-full border border-blue-100">
              Kontrol Keamanan Desa
            </span>
          </div>

          {listUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs space-y-2">
              <p className="font-semibold">Belum ada akun terdaftar di sistem.</p>
              <p className="text-[11px]">Silakan buat akun baru melalui formulir di sebelah kiri.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Username & Status</th>
                    <th className="px-4 py-3.5">No. WhatsApp</th>
                    <th className="px-4 py-3.5">Hak Akses Menu</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listUsers.map((user) => {
                    const status = user.statusAkun || 'ACTIVE'
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition align-top">
                        <td className="px-4 py-3.5 space-y-1.5">
                          <div className="font-bold text-slate-900 text-sm">{user.username}</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-md ${
                              user.role === 'ADMIN' 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : user.role === 'KADUS' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {user.role}
                            </span>

                            {user.role === 'KADUS' && (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {user.dusun?.nama || `Dusun ${user.dusun?.nomor || '-'}`}
                              </span>
                            )}

                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              status === 'ACTIVE' || status === 'AKTIF'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : status === 'PENDING' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : status === 'REJECTED' 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {status === 'ACTIVE' || status === 'AKTIF' ? '🟢 Aktif' : status === 'PENDING' ? '🟡 Pending' : status === 'REJECTED' ? '🔴 Ditolak' : '⚪ Nonaktif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {user.noWhatsapp || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(!user.permissions || user.permissions.length === 0) ? (
                              <span className="text-slate-400 italic text-[11px]">Tidak ada akses menu</span>
                            ) : (
                              // 👇 Dibungkus Array.from(new Set(...)) agar tidak ada key duplikat
                              Array.from(new Set(user.permissions)).map((p) => (
                                <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px] border border-slate-200 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" /> {p}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center space-y-1.5 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/dashboard/users?editId=${user.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition border border-amber-200 text-xs"
                              title="Edit hak akses"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </a>
                            
                            {user.role !== 'ADMIN' && (
                              <DeleteUserButton id={user.id} username={user.username} action={deleteUserAction} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Navigasi Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Menampilkan halaman <span className="font-bold text-slate-800">{currentPage}</span> dari{' '}
                <span className="font-bold text-slate-800">{totalPages}</span> (Total {totalUsers} akun)
              </div>

              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={createPageUrl(currentPage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={createPageUrl(currentPage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                  >
                    Selanjutnya <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed">
                    Selanjutnya <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}