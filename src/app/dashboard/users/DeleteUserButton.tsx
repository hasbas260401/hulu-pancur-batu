'use client'

import { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useAlert } from '@/components/ui/alert'

export default function DeleteUserButton({
  id,
  username,
  action,
}: {
  id: string
  username: string
  action: (formData: FormData) => Promise<void>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const alert = useAlert()

  async function confirmDelete() {
    const confirmed = await alert.confirm({
      title: 'Hapus akun ini?',
      message: `Akun "${username}" akan dihapus permanen dan tidak dapat dikembalikan.`,
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      persistent: true,
    })
    if (confirmed) formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={action} className="inline-block">
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        onClick={confirmDelete}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition border border-rose-200 cursor-pointer text-xs"
        title="Hapus akun"
      >
        <Trash2 className="w-3 h-3" /> Hapus
      </button>
    </form>
  )
}
