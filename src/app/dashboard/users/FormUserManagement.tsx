'use client'

import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  HandHeart, 
  Coins, 
  Globe, 
  Home,
  UserCheck,
  Mail,
  Settings,
  ShieldCheck,
  Lock,
  User,
  PhoneCall,
  MapPin,
  Check
} from 'lucide-react'

interface Dusun {
  id: number;
  nomor: string;
  nama?: string;
}

interface FormProps {
  userToEdit: any;
  dusuns: Dusun[];
  createUserAction: (formData: FormData) => Promise<void>;
  updatePermissionsAction: (formData: FormData) => Promise<void>;
}

const ADMIN_MENU_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
  { id: 'warga', label: 'Data Kependudukan', icon: Users },
  { id: 'surat', label: 'Surat-Menyurat', icon: FileText },
  { id: 'bansos', label: 'Bantuan Sosial', icon: HandHeart },
  { id: 'transparansi', label: 'Transparansi Dana', icon: Coins },
  { id: 'konten', label: 'Kelola Konten Web', icon: Globe },
  { id: 'settings', label: 'Pengaturan Akun', icon: Settings },
]

const WARGA_MENU_OPTIONS = [
  { id: 'warga-home', label: 'Beranda Utama Warga', icon: Home },
  { id: 'warga-profil', label: 'Profil & Keluarga', icon: UserCheck },
  { id: 'warga-surat', label: 'Layanan Surat Warga', icon: Mail },
  { id: 'settings', label: 'Pengaturan Akun', icon: Settings },
]

export default function FormUserManagement({ userToEdit, dusuns, createUserAction, updatePermissionsAction }: FormProps) {
  const [role, setRole] = useState(userToEdit?.role || 'WARGA')
  const [statusAkun, setStatusAkun] = useState(userToEdit?.statusAkun || 'ACTIVE')
  const [dusunId, setDusunId] = useState(userToEdit?.dusunId ? String(userToEdit.dusunId) : '')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    userToEdit?.permissions || []
  )

  useEffect(() => {
    if (userToEdit) {
      setRole(userToEdit.role || 'WARGA')
      setStatusAkun(userToEdit.statusAkun || 'ACTIVE')
      setDusunId(userToEdit.dusunId ? String(userToEdit.dusunId) : '')
      setSelectedPermissions(userToEdit.permissions || [])
    } else {
      setRole('WARGA')
      setStatusAkun('ACTIVE')
      setDusunId('')
      setSelectedPermissions([])
    }
  }, [userToEdit])

  const handleRoleChange = (newRole: string) => {
    setRole(newRole)
  }

  const handleCheckboxChange = (menuId: string) => {
    if (selectedPermissions.includes(menuId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== menuId))
    } else {
      setSelectedPermissions([...selectedPermissions, menuId])
    }
  }

  return (
    <form action={userToEdit ? updatePermissionsAction : createUserAction} className="space-y-4 text-xs">
      {userToEdit && <input type="hidden" name="id" value={userToEdit.id} />}

      {/* Username / NIK */}
      <div className="space-y-1.5">
        <label className="block font-semibold text-slate-700">Username / NIK Login</label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">
            <User className="w-4 h-4" />
          </span>
          <input
            type="text"
            name="username"
            defaultValue={userToEdit?.username || ''}
            placeholder="Contoh: kadus2 atau NIK Warga"
            required
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition outline-none font-semibold text-slate-800 text-xs"
          />
        </div>
      </div>

      {/* Password */}
      {!userToEdit && (
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700">Password Akun</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              name="password"
              placeholder="Minimal 8 karakter"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition outline-none text-xs"
            />
          </div>
        </div>
      )}

      {/* Peran & Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700">Peran (Role)</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 pointer-events-none">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <select
              name="role"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 transition outline-none cursor-pointer text-xs appearance-none"
            >
              <option value="WARGA">Warga Mandiri</option>
              <option value="KADUS">Kepala Dusun</option>
              <option value="ADMIN">Admin Desa</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block font-semibold text-slate-700">Status Akun</label>
          <select
            name="statusAkun"
            value={statusAkun}
            onChange={(e) => setStatusAkun(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-700 transition outline-none cursor-pointer text-xs"
          >
            <option value="ACTIVE">🟢 Aktif</option>
            <option value="PENDING">🟡 Pending</option>
            <option value="REJECTED">🔴 Ditolak</option>
            <option value="SUSPENDED">⚪ Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Wilayah Tugas Dusun */}
      {role === 'KADUS' && (
        <div className="space-y-1.5">
          <label className="block font-semibold text-blue-800">Wilayah Tugas Dusun</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-blue-500 pointer-events-none">
              <MapPin className="w-4 h-4" />
            </span>
            <select
              name="dusunId"
              value={dusunId}
              onChange={(e) => setDusunId(e.target.value)}
              required={role === 'KADUS'}
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-blue-200 bg-blue-50/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-900 transition outline-none cursor-pointer text-xs appearance-none"
            >
              <option value="">-- Pilih Dusun Penugasan --</option>
              {dusuns.map((dusun) => (
                <option key={dusun.id} value={dusun.id}>
                  {dusun.nama || `Dusun ${dusun.nomor}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* No. WhatsApp */}
      <div className="space-y-1.5">
        <label className="block font-semibold text-slate-700">No. WhatsApp (Opsional)</label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">
            <PhoneCall className="w-4 h-4" />
          </span>
          <input
            type="text"
            name="noWhatsapp"
            defaultValue={userToEdit?.noWhatsapp || ''}
            placeholder="081234567890"
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition outline-none text-xs"
          />
        </div>
      </div>

      {/* HAK AKSES MENU */}
      <div className="pt-2 border-t border-slate-100 space-y-3">
        <label className="block font-bold text-slate-800 uppercase text-[11px] tracking-wider">Hak Akses Menu Sistem</label>
        
        {/* Kategori 1: Menu Operasional Desa */}
        <div className="space-y-1.5">
          <div className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase">
            Menu Operasional Desa
          </div>
          <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200">
            {ADMIN_MENU_OPTIONS.map((menu) => {
              const IconComponent = menu.icon
              const isChecked = selectedPermissions.includes(menu.id)
              return (
                <label 
                  key={menu.id} 
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition cursor-pointer ${
                    isChecked ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-100/80 text-slate-700 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <IconComponent className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                    {menu.label}
                  </span>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={menu.id}
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(menu.id)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600"
                  />
                </label>
              )
            })}
          </div>
        </div>

        {/* Kategori 2: Menu Portal Warga */}
        <div className="space-y-1.5">
          <div className="px-2 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-700 uppercase border border-emerald-100">
            Menu Portal Warga
          </div>
          <div className="space-y-1 bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100">
            {WARGA_MENU_OPTIONS.map((menu) => {
              const IconComponent = menu.icon
              const isChecked = selectedPermissions.includes(menu.id)
              return (
                <label 
                  key={menu.id} 
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition cursor-pointer ${
                    isChecked ? 'bg-emerald-100/60 text-emerald-950 font-bold' : 'hover:bg-emerald-50/80 text-slate-700 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <IconComponent className={`w-4 h-4 ${isChecked ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {menu.label}
                  </span>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={menu.id}
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(menu.id)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300 cursor-pointer accent-emerald-600"
                  />
                </label>
              )
            })}
          </div>
        </div>

      </div>

      {/* Tombol Simpan */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-sm transition cursor-pointer text-xs flex items-center justify-center gap-2"
        >
          {userToEdit ? 'Perbarui Hak Akses' : 'Simpan Akun Baru'}
        </button>
        {userToEdit && (
          <a
            href="/dashboard/users"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center transition flex items-center justify-center text-xs"
          >
            Batal
          </a>
        )}
      </div>
    </form>
  )
}