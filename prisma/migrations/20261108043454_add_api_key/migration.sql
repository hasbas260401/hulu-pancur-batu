-- CreateEnum
CREATE TYPE "Role" AS ENUM ('WARGA', 'KADUS', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusWarga" AS ENUM ('AKTIF', 'PINDAH', 'MENINGGAL');

-- CreateEnum
CREATE TYPE "StatusAkun" AS ENUM ('PENDING', 'AKTIF', 'DITOLAK', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "HubunganKeluarga" AS ENUM ('KEPALA_KELUARGA', 'ISTRI', 'ANAK', 'ORANG_TUA', 'FAMILI_LAIN');

-- CreateEnum
CREATE TYPE "StatusSurat" AS ENUM ('DIAJUKAN', 'DIVERIFIKASI', 'DITOLAK', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusBansos" AS ENUM ('AKTIF', 'SELESAI', 'DICABUT');

-- CreateEnum
CREATE TYPE "ApiKeyJenis" AS ENUM ('WARGA', 'BANSOS');

-- CreateTable
CREATE TABLE "Dusun" (
    "id" SERIAL NOT NULL,
    "nomor" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dusun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WARGA',
    "statusAkun" TEXT NOT NULL DEFAULT 'PENDING',
    "dusunId" INTEGER,
    "wargaId" TEXT,
    "noWhatsapp" TEXT,
    "failedLogin" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailOtp" TEXT,
    "emailOtpExpiresAt" TIMESTAMP(3),
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KartuKeluarga" (
    "id" TEXT NOT NULL,
    "noKk" VARCHAR(16) NOT NULL,
    "alamat" TEXT NOT NULL,
    "rt" TEXT,
    "rw" TEXT,
    "dusunId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KartuKeluarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warga" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hubunganKeluarga" TEXT,
    "jenisKelamin" "JenisKelamin" NOT NULL,
    "tempatLahir" TEXT,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "agama" TEXT,
    "pekerjaan" TEXT,
    "statusPerkawinan" TEXT,
    "statusWarga" TEXT NOT NULL DEFAULT 'AKTIF',
    "kkId" TEXT NOT NULL,
    "dusunId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tanggalMeninggal" TIMESTAMP(3),
    "sebabMeninggal" TEXT,
    "tanggalPindah" TIMESTAMP(3),
    "alamatTujuan" TEXT,
    "alasanPindah" TEXT,

    CONSTRAINT "Warga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateSurat" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kodeKlasifikasi" TEXT NOT NULL DEFAULT '470',
    "filePath" TEXT NOT NULL,
    "placeholders" TEXT[],
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "versi" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateSurat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengajuanSurat" (
    "id" TEXT NOT NULL,
    "status" "StatusSurat" NOT NULL DEFAULT 'DIAJUKAN',
    "keperluan" TEXT NOT NULL,
    "dataTambahan" JSONB,
    "catatan" TEXT,
    "templateId" TEXT,
    "wargaId" TEXT NOT NULL,
    "dusunId" INTEGER NOT NULL,
    "nomorSurat" TEXT,
    "filePath" TEXT,
    "diprosesOlehId" TEXT,
    "diprosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengajuanSurat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratCounter" (
    "tahun" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SuratCounter_pkey" PRIMARY KEY ("tahun")
);

-- CreateTable
CREATE TABLE "Bansos" (
    "id" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "nominal" DECIMAL(14,2),
    "status" "StatusBansos" NOT NULL DEFAULT 'AKTIF',
    "catatan" TEXT,
    "wargaId" TEXT NOT NULL,
    "dusunId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bansos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DanaDesa" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "uraian" TEXT NOT NULL,
    "anggaran" DECIMAL(16,2) NOT NULL,
    "realisasi" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "sumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DanaDesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "ringkasan" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "gambarUrl" TEXT,
    "kategori" TEXT NOT NULL DEFAULT 'BERITA',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "penulisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebSettings" (
    "id" TEXT NOT NULL,
    "namaDesa" TEXT NOT NULL DEFAULT 'Desa Hulu Pancur Batu',
    "sloganDesa" TEXT NOT NULL DEFAULT 'Sistem Informasi Desa',
    "logoDesa" TEXT,
    "heroTitle" TEXT NOT NULL DEFAULT 'Transparan, Akuntabel, & Melayani Sepenuh Hati.',
    "heroDescription" TEXT NOT NULL DEFAULT 'Website resmi administrasi kependudukan dan transparansi penyaluran bantuan sosial Desa Hulu Pancur Batu untuk mewujudkan tata kelola pemerintahan desa yang modern.',
    "namaKades" TEXT NOT NULL DEFAULT 'Kepala Desa Hulu Pancur Batu',
    "periodeKades" TEXT NOT NULL DEFAULT 'Periode 2023 - 2029',
    "fotoKades" TEXT,
    "visiDesa" TEXT NOT NULL DEFAULT 'Terwujudnya Desa Hulu Pancur Batu yang Mandiri, Religius, Sejahtera, Transparan, dan Berbasis Teknologi Informasi dalam Pelayanan Publik.',
    "misiDesa" TEXT NOT NULL DEFAULT 'Meningkatkan kualitas pelayanan administrasi kependudukan yang cepat, transparan, dan bebas pungutan liar.
Mengoptimalkan penyaluran bantuan sosial agar tepat sasaran kepada warga yang berhak secara adil.
Memajukan infrastruktur desa serta menggerakkan ekonomi kerakyatan berbasis potensi lokal.',
    "youtubeUrl" TEXT NOT NULL DEFAULT 'https://www.youtube.com/embed/VUZlZm5V9R8',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "jenis" "ApiKeyJenis" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dusun_nomor_key" ON "Dusun"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_wargaId_key" ON "User"("wargaId");

-- CreateIndex
CREATE INDEX "User_role_dusunId_idx" ON "User"("role", "dusunId");

-- CreateIndex
CREATE UNIQUE INDEX "KartuKeluarga_noKk_key" ON "KartuKeluarga"("noKk");

-- CreateIndex
CREATE INDEX "KartuKeluarga_dusunId_idx" ON "KartuKeluarga"("dusunId");

-- CreateIndex
CREATE UNIQUE INDEX "Warga_nik_key" ON "Warga"("nik");

-- CreateIndex
CREATE INDEX "Warga_statusWarga_dusunId_idx" ON "Warga"("statusWarga", "dusunId");

-- CreateIndex
CREATE INDEX "Warga_nama_idx" ON "Warga"("nama");

-- CreateIndex
CREATE INDEX "Warga_agama_idx" ON "Warga"("agama");

-- CreateIndex
CREATE INDEX "Warga_pekerjaan_idx" ON "Warga"("pekerjaan");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateSurat_kode_key" ON "TemplateSurat"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "PengajuanSurat_nomorSurat_key" ON "PengajuanSurat"("nomorSurat");

-- CreateIndex
CREATE INDEX "PengajuanSurat_dusunId_status_idx" ON "PengajuanSurat"("dusunId", "status");

-- CreateIndex
CREATE INDEX "PengajuanSurat_wargaId_idx" ON "PengajuanSurat"("wargaId");

-- CreateIndex
CREATE INDEX "Bansos_program_periode_idx" ON "Bansos"("program", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "Bansos_wargaId_program_periode_key" ON "Bansos"("wargaId", "program", "periode");

-- CreateIndex
CREATE INDEX "DanaDesa_tahun_jenis_idx" ON "DanaDesa"("tahun", "jenis");

-- CreateIndex
CREATE UNIQUE INDEX "Kegiatan_slug_key" ON "Kegiatan"("slug");

-- CreateIndex
CREATE INDEX "Kegiatan_published_publishedAt_idx" ON "Kegiatan"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_jenis_key" ON "ApiKey"("jenis");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dusunId_fkey" FOREIGN KEY ("dusunId") REFERENCES "Dusun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KartuKeluarga" ADD CONSTRAINT "KartuKeluarga_dusunId_fkey" FOREIGN KEY ("dusunId") REFERENCES "Dusun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_kkId_fkey" FOREIGN KEY ("kkId") REFERENCES "KartuKeluarga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warga" ADD CONSTRAINT "Warga_dusunId_fkey" FOREIGN KEY ("dusunId") REFERENCES "Dusun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanSurat" ADD CONSTRAINT "PengajuanSurat_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TemplateSurat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanSurat" ADD CONSTRAINT "PengajuanSurat_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PengajuanSurat" ADD CONSTRAINT "PengajuanSurat_dusunId_fkey" FOREIGN KEY ("dusunId") REFERENCES "Dusun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bansos" ADD CONSTRAINT "Bansos_wargaId_fkey" FOREIGN KEY ("wargaId") REFERENCES "Warga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bansos" ADD CONSTRAINT "Bansos_dusunId_fkey" FOREIGN KEY ("dusunId") REFERENCES "Dusun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
