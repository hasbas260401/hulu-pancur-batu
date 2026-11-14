'use client'

import type { ReactNode } from 'react'
import {
  BarChart3,
  Clock,
  Info,
  LayoutTemplate,
  MapPin,
  Megaphone,
  Newspaper,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import type {
  FactIcon,
  FactSource,
  LandingContent,
  NewsCategory,
  NewsIcon,
  ServiceIcon,
} from '@/lib/landing-content'
import { quickFactValue } from '@/lib/landing-content'
import type { CommunityStats } from '@/lib/community-stats'

const inputClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

const FACT_OPTIONS: { value: FactIcon; label: string }[] = [
  { value: 'trees', label: 'Pohon / Wilayah' },
  { value: 'users', label: 'Penduduk' },
  { value: 'home', label: 'Dusun / Rumah' },
  { value: 'wallet', label: 'Anggaran' },
  { value: 'sprout', label: 'Kegiatan' },
]

const FACT_SOURCE_OPTIONS: { value: FactSource; label: string }[] = [
  { value: 'manual', label: 'Isi manual' },
  { value: 'population', label: 'Total warga (database)' },
  { value: 'households', label: 'Total KK (database)' },
  { value: 'villages', label: 'Jumlah dusun (database)' },
]

const SERVICE_OPTIONS: { value: ServiceIcon; label: string }[] = [
  { value: 'file', label: 'Surat / Dokumen' },
  { value: 'report', label: 'Aduan' },
  { value: 'hand', label: 'Bantuan Sosial' },
  { value: 'landmark', label: 'Anggaran / Pemerintahan' },
]

const NEWS_OPTIONS: { value: NewsIcon; label: string }[] = [
  { value: 'announcement', label: 'Pengumuman' },
  { value: 'activity', label: 'Kegiatan' },
  { value: 'development', label: 'Pembangunan' },
]

const CATEGORY_OPTIONS: { value: NewsCategory; label: string }[] = [
  { value: 'Pengumuman', label: 'Pengumuman' },
  { value: 'Kegiatan', label: 'Kegiatan' },
  { value: 'Pembangunan', label: 'Pembangunan' },
]

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  return items.map((item, i) => (i === index ? value : item))
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index)
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-snug text-slate-400">{hint}</span>}
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  type?: 'text' | 'email' | 'tel' | 'url'
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </Field>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} resize-y leading-relaxed`}
      />
    </Field>
  )
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={`${inputClass} cursor-pointer`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
        {value}
      </div>
    </Field>
  )
}

function AddButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 cursor-pointer"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Hapus baris"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 cursor-pointer"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

function ItemHeader({
  index,
  label,
  onDelete,
}: {
  index: number
  label: string
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {label} {index + 1}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" /> Hapus
      </button>
    </div>
  )
}

export default function LandingContentEditor({
  content,
  stats,
  onChange,
}: {
  content: LandingContent
  stats?: CommunityStats | null
  onChange: (next: LandingContent) => void
}) {
  const update = <K extends keyof LandingContent>(
    key: K,
    value: LandingContent[K]
  ) => onChange({ ...content, [key]: value })

  const updateHero = (patch: Partial<LandingContent['hero']>) =>
    update('hero', { ...content.hero, ...patch })

  const updateNav = (patch: Partial<LandingContent['nav']>) =>
    update('nav', { ...content.nav, ...patch })

  const updateLabels = (patch: Partial<LandingContent['labels']>) =>
    update('labels', { ...content.labels, ...patch })

  const updateNotice = (patch: Partial<LandingContent['notice']>) =>
    update('notice', { ...content.notice, ...patch })

  const updateServices = (patch: Partial<LandingContent['services']>) =>
    update('services', { ...content.services, ...patch })

  const updateNews = (patch: Partial<LandingContent['news']>) =>
    update('news', { ...content.news, ...patch })

  const updateTransparency = (
    patch: Partial<LandingContent['transparency']>
  ) => update('transparency', { ...content.transparency, ...patch })

  const updateFooter = (patch: Partial<LandingContent['footer']>) =>
    update('footer', { ...content.footer, ...patch })

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <p>
          Seluruh isian di bawah ini tampil di halaman depan publik. Perubahan
          akan langsung terlihat setelah tombol <strong>Simpan Perubahan</strong>{' '}
          ditekan.
        </p>
      </div>

      <SectionCard
        icon={<LayoutTemplate className="h-4 w-4" />}
        title="Navigasi & Label Teks"
        description="Teks menu navigasi dan label kecil lain yang tampil di halaman depan."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Menu Beranda"
            value={content.nav.home}
            onChange={(value) => updateNav({ home: value })}
          />
          <TextField
            label="Menu Layanan"
            value={content.nav.services}
            onChange={(value) => updateNav({ services: value })}
          />
          <TextField
            label="Menu Berita"
            value={content.nav.news}
            onChange={(value) => updateNav({ news: value })}
          />
          <TextField
            label="Menu Transparansi"
            value={content.nav.transparency}
            onChange={(value) => updateNav({ transparency: value })}
          />
          <TextField
            label="Menu Kontak"
            value={content.nav.contact}
            onChange={(value) => updateNav({ contact: value })}
          />
          <TextField
            label="Tombol kontak darurat"
            value={content.nav.contactCta}
            onChange={(value) => updateNav({ contactCta: value })}
          />
          <TextField
            label="Tombol login perangkat desa"
            value={content.nav.loginStaff}
            onChange={(value) => updateNav({ loginStaff: value })}
          />
          <TextField
            label="Tombol login versi ponsel"
            value={content.nav.loginShort}
            onChange={(value) => updateNav({ loginShort: value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Awalan pengumuman"
            value={content.labels.noticePrefix}
            onChange={(value) => updateLabels({ noticePrefix: value })}
            hint='Contoh: "Penting:"'
          />
          <TextField
            label="Teks baca berita"
            value={content.labels.readMore}
            onChange={(value) => updateLabels({ readMore: value })}
          />
          <TextField
            label="Awalan realisasi anggaran"
            value={content.labels.realizedPrefix}
            onChange={(value) => updateLabels({ realizedPrefix: value })}
          />
          <TextField
            label="Kata penghubung realisasi"
            value={content.labels.realizedFrom}
            onChange={(value) => updateLabels({ realizedFrom: value })}
          />
          <TextField
            label="Judul rincian belanja"
            value={content.labels.budgetSplitTitle}
            onChange={(value) => updateLabels({ budgetSplitTitle: value })}
          />
          <TextField
            label="Judul kartu kependudukan"
            value={content.labels.populationTitle}
            onChange={(value) => updateLabels({ populationTitle: value })}
          />
          <TextField
            label="Label total penduduk"
            value={content.labels.populationTotal}
            onChange={(value) => updateLabels({ populationTotal: value })}
          />
          <TextField
            label="Label kepala keluarga"
            value={content.labels.households}
            onChange={(value) => updateLabels({ households: value })}
          />
          <TextField
            label="Label laki-laki"
            value={content.labels.male}
            onChange={(value) => updateLabels({ male: value })}
          />
          <TextField
            label="Label perempuan"
            value={content.labels.female}
            onChange={(value) => updateLabels({ female: value })}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<MapPin className="h-4 w-4" />}
        title="Kontak & Alamat Kantor"
        description="Informasi yang tampil di bagian kontak pada footer halaman depan."
      >
        <TextAreaField
          label="Alamat kantor desa"
          value={content.address}
          onChange={(value) => update('address', value)}
          rows={2}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nomor telepon"
            value={content.phone}
            onChange={(value) => update('phone', value)}
            placeholder="0812-0000-0000"
          />
          <TextField
            label="Email"
            type="email"
            value={content.email}
            onChange={(value) => update('email', value)}
            placeholder="info@desa.id"
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Clock className="h-4 w-4" />}
        title="Jam Operasional"
        description="Daftar hari dan jam layanan kantor desa."
      >
        <div className="space-y-3">
          {content.hours.map((hour, index) => (
            <div
              key={`hour-${index}`}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <TextField
                label="Hari"
                value={hour.day}
                onChange={(value) =>
                  update(
                    'hours',
                    replaceAt(content.hours, index, { ...hour, day: value })
                  )
                }
                placeholder="Senin sampai Kamis"
              />
              <TextField
                label="Jam"
                value={hour.time}
                onChange={(value) =>
                  update(
                    'hours',
                    replaceAt(content.hours, index, { ...hour, time: value })
                  )
                }
                placeholder="08.00 - 15.00"
              />
              <DeleteButton
                onClick={() => update('hours', removeAt(content.hours, index))}
              />
            </div>
          ))}
          <AddButton
            onClick={() => update('hours', [...content.hours, { day: '', time: '' }])}
          >
            Tambah jam operasional
          </AddButton>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Phone className="h-4 w-4" />}
        title="Kontak Darurat"
        description="Nomor penting yang dapat dihubungi warga."
      >
        <div className="space-y-3">
          {content.emergency.map((contact, index) => (
            <div
              key={`emergency-${index}`}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <TextField
                label="Label"
                value={contact.label}
                onChange={(value) =>
                  update(
                    'emergency',
                    replaceAt(content.emergency, index, {
                      ...contact,
                      label: value,
                    })
                  )
                }
                placeholder="Kepala Desa"
              />
              <TextField
                label="Nomor telepon"
                value={contact.number}
                onChange={(value) =>
                  update(
                    'emergency',
                    replaceAt(content.emergency, index, {
                      ...contact,
                      number: value,
                    })
                  )
                }
                placeholder="0812-0000-0000"
              />
              <DeleteButton
                onClick={() =>
                  update('emergency', removeAt(content.emergency, index))
                }
              />
            </div>
          ))}
          <AddButton
            onClick={() =>
              update('emergency', [
                ...content.emergency,
                { label: '', number: '' },
              ])
            }
          >
            Tambah kontak darurat
          </AddButton>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Megaphone className="h-4 w-4" />}
        title="Bilah Pengumuman"
        description="Teks penting yang tampil paling atas halaman depan."
      >
        <TextAreaField
          label="Teks pengumuman"
          value={content.notice.text}
          onChange={(value) => updateNotice({ text: value })}
          rows={2}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Teks tautan"
            value={content.notice.linkLabel}
            onChange={(value) => updateNotice({ linkLabel: value })}
            placeholder="Selengkapnya"
          />
          <TextField
            label="Tautan tujuan"
            value={content.notice.href}
            onChange={(value) => updateNotice({ href: value })}
            placeholder="#berita"
            hint="Gunakan #berita, #layanan, atau alamat lengkap https://..."
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Sparkles className="h-4 w-4" />}
        title="Bagian Hero (Halaman Utama)"
        description="Judul besar, deskripsi, tombol, dan kartu informasi singkat."
      >
        <TextField
          label="Label kecil di atas judul"
          value={content.hero.badge}
          onChange={(value) => updateHero({ badge: value })}
        />
        <TextField
          label="Judul utama"
          value={content.hero.title}
          onChange={(value) => updateHero({ title: value })}
        />
        <TextAreaField
          label="Deskripsi utama"
          value={content.hero.description}
          onChange={(value) => updateHero({ description: value })}
          rows={3}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Teks tombol utama"
            value={content.hero.primaryCta}
            onChange={(value) => updateHero({ primaryCta: value })}
          />
          <TextField
            label="Teks tombol kedua"
            value={content.hero.secondaryCta}
            onChange={(value) => updateHero({ secondaryCta: value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Judul kartu informasi"
            value={content.hero.cardTitle}
            onChange={(value) => updateHero({ cardTitle: value })}
          />
          <TextField
            label="Label status kantor"
            value={content.hero.officeBadge}
            onChange={(value) => updateHero({ officeBadge: value })}
          />
        </div>
        <TextAreaField
          label="Ringkasan jam layanan di kartu"
          value={content.hero.hoursSummary}
          onChange={(value) => updateHero({ hoursSummary: value })}
          rows={2}
        />
      </SectionCard>

      <SectionCard
        icon={<Users className="h-4 w-4" />}
        title="Statistik Ringkas"
        description="Angka utama di kartu informasi halaman depan. Pilih sumber database agar nilainya selalu mengikuti data desa."
      >
        <div className="space-y-3">
          {content.quickFacts.map((fact, index) => {
            const source = fact.source ?? 'manual'
            const autoValue = quickFactValue(source, stats)

            return (
              <div
                key={`fact-${index}`}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[150px_1fr_auto]">
                  <SelectField
                    label="Ikon"
                    value={fact.icon}
                    onChange={(value) =>
                      update(
                        'quickFacts',
                        replaceAt(content.quickFacts, index, { ...fact, icon: value })
                      )
                    }
                    options={FACT_OPTIONS}
                  />
                  <TextField
                    label="Label"
                    value={fact.label}
                    onChange={(value) =>
                      update(
                        'quickFacts',
                        replaceAt(content.quickFacts, index, { ...fact, label: value })
                      )
                    }
                  />
                  <DeleteButton
                    onClick={() =>
                      update('quickFacts', removeAt(content.quickFacts, index))
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Sumber nilai"
                    value={source}
                    onChange={(value) =>
                      update(
                        'quickFacts',
                        replaceAt(content.quickFacts, index, {
                          ...fact,
                          source: value,
                        })
                      )
                    }
                    options={FACT_SOURCE_OPTIONS}
                  />
                  {source === 'manual' ? (
                    <TextField
                      label="Nilai"
                      value={fact.value}
                      onChange={(value) =>
                        update(
                          'quickFacts',
                          replaceAt(content.quickFacts, index, { ...fact, value })
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyField
                      label="Nilai otomatis"
                      value={autoValue ?? 'Belum tersedia'}
                      hint="Dihitung ulang dari database setiap halaman depan dibuka."
                    />
                  )}
                </div>
              </div>
            )
          })}
          <AddButton
            onClick={() =>
              update('quickFacts', [
                ...content.quickFacts,
                { icon: 'trees', label: '', value: '', source: 'manual' },
              ])
            }
          >
            Tambah statistik
          </AddButton>
        </div>
      </SectionCard>

      <SectionCard
        icon={<LayoutTemplate className="h-4 w-4" />}
        title="Layanan Publik"
        description="Kartu layanan yang tampil pada bagian Layanan."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Judul bagian"
            value={content.services.title}
            onChange={(value) => updateServices({ title: value })}
          />
          <TextField
            label="Deskripsi bagian"
            value={content.services.description}
            onChange={(value) => updateServices({ description: value })}
          />
        </div>
        <div className="space-y-4">
          {content.services.items.map((item, index) => (
            <div
              key={`service-${index}`}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <ItemHeader
                index={index}
                label="Layanan"
                onDelete={() =>
                  updateServices({
                    items: removeAt(content.services.items, index),
                  })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Ikon"
                  value={item.icon}
                  onChange={(value) =>
                    updateServices({
                      items: replaceAt(content.services.items, index, {
                        ...item,
                        icon: value,
                      }),
                    })
                  }
                  options={SERVICE_OPTIONS}
                />
                <TextField
                  label="Judul layanan"
                  value={item.title}
                  onChange={(value) =>
                    updateServices({
                      items: replaceAt(content.services.items, index, {
                        ...item,
                        title: value,
                      }),
                    })
                  }
                />
              </div>
              <TextAreaField
                label="Deskripsi"
                value={item.desc}
                onChange={(value) =>
                  updateServices({
                    items: replaceAt(content.services.items, index, {
                      ...item,
                      desc: value,
                    }),
                  })
                }
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Teks tombol"
                  value={item.cta}
                  onChange={(value) =>
                    updateServices({
                      items: replaceAt(content.services.items, index, {
                        ...item,
                        cta: value,
                      }),
                    })
                  }
                />
                <TextField
                  label="Tautan tombol"
                  value={item.href}
                  onChange={(value) =>
                    updateServices({
                      items: replaceAt(content.services.items, index, {
                        ...item,
                        href: value,
                      }),
                    })
                  }
                  hint="Contoh: #layanan atau https://..."
                />
              </div>
            </div>
          ))}
          <AddButton
            onClick={() =>
              updateServices({
                items: [
                  ...content.services.items,
                  {
                    icon: 'file',
                    title: '',
                    desc: '',
                    cta: '',
                    href: '#layanan',
                  },
                ],
              })
            }
          >
            Tambah layanan
          </AddButton>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Newspaper className="h-4 w-4" />}
        title="Berita & Pengumuman"
        description="Kartu berita yang tampil pada bagian Berita."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Judul bagian"
            value={content.news.title}
            onChange={(value) => updateNews({ title: value })}
          />
          <TextField
            label="Deskripsi bagian"
            value={content.news.description}
            onChange={(value) => updateNews({ description: value })}
          />
          <TextField
            label="Teks tautan bagian"
            value={content.news.actionLabel}
            onChange={(value) => updateNews({ actionLabel: value })}
          />
        </div>
        <div className="space-y-4">
          {content.news.items.map((item, index) => (
            <div
              key={`news-${index}`}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <ItemHeader
                index={index}
                label="Berita"
                onDelete={() =>
                  updateNews({ items: removeAt(content.news.items, index) })
                }
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelectField
                  label="Ikon"
                  value={item.icon}
                  onChange={(value) =>
                    updateNews({
                      items: replaceAt(content.news.items, index, {
                        ...item,
                        icon: value,
                      }),
                    })
                  }
                  options={NEWS_OPTIONS}
                />
                <SelectField
                  label="Kategori"
                  value={item.category}
                  onChange={(value) =>
                    updateNews({
                      items: replaceAt(content.news.items, index, {
                        ...item,
                        category: value,
                      }),
                    })
                  }
                  options={CATEGORY_OPTIONS}
                />
                <TextField
                  label="Tanggal"
                  value={item.date}
                  onChange={(value) =>
                    updateNews({
                      items: replaceAt(content.news.items, index, {
                        ...item,
                        date: value,
                      }),
                    })
                  }
                  placeholder="10 November 2026"
                />
              </div>
              <TextField
                label="Judul berita"
                value={item.title}
                onChange={(value) =>
                  updateNews({
                    items: replaceAt(content.news.items, index, {
                      ...item,
                      title: value,
                    }),
                  })
                }
              />
              <TextAreaField
                label="Ringkasan"
                value={item.excerpt}
                onChange={(value) =>
                  updateNews({
                    items: replaceAt(content.news.items, index, {
                      ...item,
                      excerpt: value,
                    }),
                  })
                }
                rows={2}
              />
            </div>
          ))}
          <AddButton
            onClick={() =>
              updateNews({
                items: [
                  ...content.news.items,
                  {
                    icon: 'announcement',
                    category: 'Pengumuman',
                    date: '',
                    title: '',
                    excerpt: '',
                  },
                ],
              })
            }
          >
            Tambah berita
          </AddButton>
        </div>
      </SectionCard>

      <SectionCard
        icon={<BarChart3 className="h-4 w-4" />}
        title="Statistik & Transparansi Anggaran"
        description="Angka kependudukan, realisasi APBDes, dan rincian belanja per bidang."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Judul bagian"
            value={content.transparency.title}
            onChange={(value) => updateTransparency({ title: value })}
          />
          <TextField
            label="Deskripsi bagian"
            value={content.transparency.description}
            onChange={(value) => updateTransparency({ description: value })}
          />
          <TextField
            label="Teks tautan bagian"
            value={content.transparency.actionLabel}
            onChange={(value) => updateTransparency({ actionLabel: value })}
          />
        </div>
        <TextAreaField
          label="Catatan di bawah rincian anggaran"
          value={content.transparency.budgetNote}
          onChange={(value) => updateTransparency({ budgetNote: value })}
          rows={2}
        />

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <p>
            <strong>Data kependudukan diisi otomatis.</strong> Total penduduk,
            kepala keluarga, serta jumlah laki-laki dan perempuan diambil langsung
            dari tabel warga, kartu keluarga, dan dusun. Untuk memperbarui angkanya,
            ubah data melalui menu <strong>Data Warga</strong> atau{' '}
            <strong>Kartu Keluarga</strong>.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>
            <strong>Data APBDes diisi otomatis.</strong> Total pendapatan,
            belanja, persentase realisasi, tahun anggaran, judul kartu, dan rincian
            belanja per bidang diambil dari menu{' '}
            <strong>Transparansi Dana</strong>. Menambah atau mengubah data di sana
            langsung memperbarui halaman depan tanpa perlu mengisi ulang di sini.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Kartu Ajakan di Bawah Statistik
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Judul"
              value={content.transparency.questionTitle}
              onChange={(value) => updateTransparency({ questionTitle: value })}
            />
            <TextField
              label="Teks tombol"
              value={content.transparency.questionCta}
              onChange={(value) => updateTransparency({ questionCta: value })}
            />
          </div>
          <TextAreaField
            label="Deskripsi"
            value={content.transparency.questionText}
            onChange={(value) => updateTransparency({ questionText: value })}
            rows={2}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Wallet className="h-4 w-4" />}
        title="Footer Halaman Depan"
        description="Teks penutup, judul kolom footer, dan keterangan hak cipta."
      >
        <TextAreaField
          label="Deskripsi singkat desa"
          value={content.footer.description}
          onChange={(value) => updateFooter({ description: value })}
          rows={2}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Judul kolom kantor"
            value={content.footer.officeTitle}
            onChange={(value) => updateFooter({ officeTitle: value })}
          />
          <TextField
            label="Judul kolom jam"
            value={content.footer.hoursTitle}
            onChange={(value) => updateFooter({ hoursTitle: value })}
          />
          <TextField
            label="Judul kolom kontak darurat"
            value={content.footer.emergencyTitle}
            onChange={(value) => updateFooter({ emergencyTitle: value })}
          />
        </div>
        <TextField
          label="Teks hak cipta"
          value={content.footer.copyright}
          onChange={(value) => updateFooter({ copyright: value })}
          hint="Tahun berjalan ditambahkan otomatis di depan teks ini."
        />
        <TextField
          label="Catatan tambahan di kanan bawah"
          value={content.footer.note}
          onChange={(value) => updateFooter({ note: value })}
        />
      </SectionCard>
    </div>
  )
}
