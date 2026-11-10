'use client'

import { LogOut } from 'lucide-react'

export default function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-400 transition-colors hover:bg-rose-600 hover:text-white cursor-pointer"
      title="Keluar / Logout"
      aria-label="Keluar dari akun"
    >
      <LogOut className="w-4 h-4" />
    </button>
  )
}