'use client'

import { useRef } from 'react'
import Swal from 'sweetalert2'
import { Trash2 } from 'lucide-react'

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

  async function confirmDelete() {
    const result = await Swal.fire({
      title: 'Hapus akun ini?',
      text: `Akun "${username}" akan dihapus permanen dan tidak dapat dikembalikan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      customClass: { popup: 'rounded-2xl text-xs' },
    })
    if (result.isConfirmed) formRef.current?.requestSubmit()
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
