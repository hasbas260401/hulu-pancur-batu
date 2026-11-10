// Pemformat teks yang dipakai bersama oleh halaman server DAN komponen klien.
// Sengaja diletakkan di modul biasa (bukan file 'use client'): fungsi yang diekspor dari file
// 'use client' tidak boleh dipanggil dari komponen server.
export function formatTitleCase(str: string | null | undefined): string {
  if (!str) return '-'
  if (str === 'PNS' || str === 'TNI' || str === 'POLRI' || str === 'BUMN' || str === 'BUMD' || str === 'DPR-RI' || str === 'DPD' || str === 'BPK') {
    return str
  }
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word.includes('/')) {
        return word
          .split('/')
          .map((sub) => sub.charAt(0).toUpperCase() + sub.slice(1))
          .join('/')
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
