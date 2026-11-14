-- AlterTable
ALTER TABLE "WebSettings" ALTER COLUMN "misiDesa" SET DEFAULT 'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.
Mengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.
Memajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.';

-- CreateTable
CREATE TABLE "PengaturanWhatsApp" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "apiUrl" TEXT NOT NULL DEFAULT 'https://api.fonnte.com/send',
    "token" TEXT,
    "senderNumber" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "format" TEXT NOT NULL DEFAULT 'form',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanWhatsApp_pkey" PRIMARY KEY ("id")
);
