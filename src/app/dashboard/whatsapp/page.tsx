import { redirect } from 'next/navigation'

/**
 * Monitor WhatsApp Gateway kini menyatu dengan tab WhatsApp Gateway di
 * Pengaturan Akun (satu pintu). Rute lama dialihkan agar bookmark lama tetap
 * berfungsi.
 */
export default function WhatsAppGatewayPage() {
  redirect('/dashboard/settings?tab=whatsapp')
}
