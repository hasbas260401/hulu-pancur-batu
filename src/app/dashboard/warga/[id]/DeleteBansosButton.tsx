'use client'

import { Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'

export default function DeleteBansosButton({
  bansosId,
  actionServer,
}: {
  bansosId: string
  actionServer: (formData: FormData) => Promise<{ success: boolean; message: string }>
}) {
  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Hapus Riwayat Bansos?',
      text: 'Apakah Anda yakin ingin menghapus catatan bantuan sosial ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl text-xs',
        confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
        cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
      },
    })

    if (result.isConfirmed) {
      const formData = new FormData()
      formData.append('actionType', 'delete')
      formData.append('bansosId', bansosId)

      try {
        const res = await actionServer(formData)
        if (!res.success) {
          Swal.fire({
            title: 'Gagal!',
            text: res.message,
            icon: 'error',
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'rounded-2xl text-xs' },
          })
          return
        }
        Swal.fire({
          title: 'Terhapus!',
          text: res.message,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl text-xs' },
        })
      } catch (error) {
        Swal.fire({
          title: 'Gagal!',
          text: 'Terjadi kesalahan saat menghapus data.',
          icon: 'error',
          confirmButtonColor: '#2563eb',
          customClass: { popup: 'rounded-2xl text-xs' },
        })
      }
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