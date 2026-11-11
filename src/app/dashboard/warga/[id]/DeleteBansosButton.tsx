'use client'

import { Trash2 } from 'lucide-react'
import { useAlert } from '@/components/ui/alert'

export default function DeleteBansosButton({
  bansosId,
  actionServer,
}: {
  bansosId: string
  actionServer: (formData: FormData) => Promise<{ success: boolean; message: string }>
}) {
  const alert = useAlert()

  const handleDelete = async () => {
    const confirmed = await alert.confirm({
      title: 'Hapus Riwayat Bansos?',
      message: 'Apakah Anda yakin ingin menghapus catatan bantuan sosial ini?',
      type: 'warning',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    })

    if (!confirmed) return

    const formData = new FormData()
    formData.append('actionType', 'delete')
    formData.append('bansosId', bansosId)

    try {
      const res = await actionServer(formData)
      if (!res.success) {
        await alert.error('Gagal', res.message)
        return
      }
      await alert.success('Terhapus', res.message)
    } catch (error) {
      await alert.error('Gagal', 'Terjadi kesalahan saat menghapus data.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg transition border border-rose-200 inline-flex items-center gap-1 cursor-pointer text-xs"
      title="Hapus bansos"
    >
      <Trash2 className="w-3.5 h-3.5" /> Hapus
    </button>
  )
}
