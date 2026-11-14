import { NextResponse } from 'next/server'
import { JenisKelamin } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { getWargaScope } from '@/lib/warga-scope'
import { isSameOrigin, forbiddenOriginResponse } from '@/lib/same-origin'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ROWS = 5000
const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE })
}

function parseExcelDate(value: any): Date {
  if (!value) return new Date('2000-01-01')
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    }
  }
  const dateObj = new Date(value)
  if (!isNaN(dateObj.getTime())) {
    return dateObj
  }
  return new Date('2000-01-01')
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOriginResponse()

  // Wajib login, wajib ADMIN/KADUS
  const scope = await getWargaScope()
  if (!scope.ok) return fail(scope.status, scope.message)

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) return fail(400, 'File tidak ditemukan.')
    if (!/\.(xlsx|xls)$/i.test(file.name)) return fail(400, 'File harus berformat .xlsx atau .xls.')
    if (file.size > MAX_SIZE) return fail(400, 'Ukuran file maksimal 5 MB.')

    let rows: any[]
    try {
      const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(sheet)
    } catch {
      return fail(400, 'File Excel tidak dapat dibaca. Pastikan formatnya sesuai template.')
    }

    if (rows.length === 0) return fail(400, 'File tidak berisi data.')
    if (rows.length > MAX_ROWS) {
      return fail(400, `Maksimal ${MAX_ROWS} baris per unggahan. Silakan pecah file menjadi beberapa bagian.`)
    }

    const dusunRows = await prisma.dusun.findMany({ select: { id: true } })
    if (dusunRows.length === 0) return fail(400, 'Belum ada data dusun. Tambahkan data dusun terlebih dahulu.')
    const validDusunIds = new Set(dusunRows.map((d) => d.id))

    // KADUS: semua data dipaksa masuk ke dusunnya sendiri (kolom dusun di Excel diabaikan)
    const forcedDusunId = scope.dusunFilter.dusunId
    const defaultDusunId = forcedDusunId ?? dusunRows[0].id

    let totalBerhasil = 0
    let totalDilewati = 0
    const catatan: string[] = []
    const catat = (pesan: string) => {
      if (catatan.length < 10) catatan.push(pesan)
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const nomorBaris = i + 2 // baris 1 adalah judul kolom

      try {
        const rawNoKk = String(row['No KK'] || '').replace(/['"]/g, '').trim()
        const noKk = rawNoKk.length > 25 ? rawNoKk.substring(0, 20) : rawNoKk

        const rawNik = String(row['NIK'] || '').replace(/['"]/g, '').trim()
        const nik = rawNik.length > 25 ? rawNik.substring(0, 20) : rawNik

        const nama = String(row['Nama Lengkap'] || '').trim()
        const hubunganKeluarga = String(row['Hubungan Keluarga'] || 'Kepala Keluarga').trim()
        const jkRaw = String(row['Jenis Kelamin'] || 'LAKI_LAKI').trim().toUpperCase()

        const tempatLahir = String(row['Tempat Lahir'] || '').trim()
        const tanggalLahir = parseExcelDate(row['Tanggal Lahir'])
        const agama = String(row['Agama'] || 'Islam').trim()
        const pekerjaan = String(row['Jenis Pekerjaan'] || '').trim()
        const statusPerkawinan = String(row['Status Perkawinan'] || 'Belum Kawin').trim()

        const statusWargaRaw = String(row['Status Warga'] || 'AKTIF').replace(/['"]/g, '').trim().toUpperCase()
        let statusWarga: 'AKTIF' | 'MENINGGAL' | 'PINDAH' = 'AKTIF'
        if (statusWargaRaw === 'MENINGGAL') {
          statusWarga = 'MENINGGAL'
        } else if (statusWargaRaw === 'PINDAH') {
          statusWarga = 'PINDAH'
        }

        if (!nik || !nama || !noKk || noKk.length < 5) {
          totalDilewati++
          catat(`Baris ${nomorBaris}: NIK, nama, atau No. KK kosong/tidak valid.`)
          continue
        }

        // Tentukan dusun. ADMIN boleh memakai kolom Excel, asalkan dusun itu benar-benar ada.
        let dusunId = defaultDusunId
        if (forcedDusunId === undefined) {
          const excelDusunId = Number(row['ID Dusun'] || row['Dusun ID'] || defaultDusunId)
          if (!isNaN(excelDusunId) && excelDusunId > 0) {
            if (!validDusunIds.has(excelDusunId)) {
              totalDilewati++
              catat(`Baris ${nomorBaris}: ID Dusun ${excelDusunId} tidak ada.`)
              continue
            }
            dusunId = excelDusunId
          }
        }

        // Cari atau buat Kartu Keluarga
        let kk = await prisma.kartuKeluarga.findFirst({ where: { noKk } })
        if (!kk) {
          kk = await prisma.kartuKeluarga.create({
            data: {
              noKk,
              dusunId,
              alamat: 'Desa Hulu Pancur Batu',
            },
          })
        } else if (forcedDusunId !== undefined && kk.dusunId !== forcedDusunId) {
          // KADUS tidak boleh menambah anggota ke KK milik dusun lain
          totalDilewati++
          catat(`Baris ${nomorBaris}: No. KK ${noKk} terdaftar di dusun lain.`)
          continue
        }

        const jenisKelamin =
          jkRaw.includes('PEREMPUAN') || jkRaw === 'P' ? JenisKelamin.PEREMPUAN : JenisKelamin.LAKI_LAKI

        const existingWarga = await prisma.warga.findUnique({ where: { nik } })

        if (!existingWarga) {
          await prisma.warga.create({
            data: {
              nik,
              nama,
              hubunganKeluarga,
              jenisKelamin,
              tempatLahir,
              tanggalLahir,
              agama,
              pekerjaan,
              statusPerkawinan,
              statusWarga: statusWarga as any,
              dusunId: dusunId,
              kkId: kk.id,
            },
          })
          totalBerhasil++
        } else {
          // Jika warga sudah ada, isi dusunId hanya bila masih kosong
          if (!existingWarga.dusunId) {
            await prisma.warga.update({
              where: { id: existingWarga.id },
              data: { dusunId: dusunId },
            })
          }
          totalDilewati++
        }
      } catch (err) {
        totalDilewati++
        catat(`Baris ${nomorBaris}: gagal disimpan.`)
      }
    }

    // Catat siapa yang mengimpor (tanpa isi data)
    try {
      await prisma.auditLog.create({
        data: {
          userId: scope.userId,
          aksi: 'IMPORT_WARGA',
          entitas: 'Warga',
          detail: {
            file: file.name.slice(0, 100),
            totalBaris: rows.length,
            berhasil: totalBerhasil,
            dilewati: totalDilewati,
          },
          ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        },
      })
    } catch (error) {
      console.error('Gagal mencatat audit log import:', error)
    }

    revalidatePath('/dashboard/warga')

    return NextResponse.json(
      { success: true, totalBaris: rows.length, totalBerhasil, totalDilewati, catatan },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error('Error import warga:', error)
    return fail(500, 'Terjadi kesalahan saat memproses file.')
  }
}