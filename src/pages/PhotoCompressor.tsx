import { useEffect, useMemo, useState } from 'react'
import { Download, ImageDown, ShieldCheck, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared'

import { compressImage, formatBytes, MAX_INPUT_BYTES, type CompressionResult } from '@/lib/photoCompression'

const TARGET_SIZES = Array.from({ length: 191 }, (_, index) => index + 10)

export default function PhotoCompressor() {
  const [targetKb, setTargetKb] = useState(14)
  const [file, setFile] = useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [outputPreview, setOutputPreview] = useState<string | null>(null)
  const [outputMeta, setOutputMeta] = useState<Omit<CompressionResult, 'blob'> | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const outputName = useMemo(() => {
    const base = file?.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-') || 'photo'
    return `${base}-${targetKb}kb.jpg`
  }, [file, targetKb])

  useEffect(() => () => {
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    if (outputPreview) URL.revokeObjectURL(outputPreview)
  }, [originalPreview, outputPreview])

  function clearOutput() {
    if (outputPreview) URL.revokeObjectURL(outputPreview)
    setOutputPreview(null)
    setOutputBlob(null)
    setOutputMeta(null)
  }

  function handleFile(nextFile: File | null) {
    setError('')
    clearOutput()
    if (originalPreview) URL.revokeObjectURL(originalPreview)
    setOriginalPreview(null)
    setFile(null)

    if (!nextFile) return
    if (!nextFile.type.startsWith('image/')) {
      setError('Please select an image file (JPG, JPEG, PNG or WebP).')
      return
    }
    if (nextFile.size > MAX_INPUT_BYTES) {
      setError('Please use an image smaller than 20 MB so the tool stays fast on phones and computers.')
      return
    }

    setFile(nextFile)
    setOriginalPreview(URL.createObjectURL(nextFile))
  }

  async function runCompression() {
    if (!file) {
      setError('Please upload a photo first.')
      return
    }

    setWorking(true)
    setError('')
    clearOutput()

    try {
      const result = await compressImage(file, targetKb)
      setOutputBlob(result.blob)
      setOutputMeta({ width: result.width, height: result.height, quality: result.quality })
      setOutputPreview(URL.createObjectURL(result.blob))
    } catch (compressionError) {
      setError(compressionError instanceof Error ? compressionError.message : 'The photo could not be compressed.')
    } finally {
      setWorking(false)
    }
  }

  function downloadCompressed() {
    if (!outputBlob) return
    const url = URL.createObjectURL(outputBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = outputName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div>
      <PageHeader
        title="Photo Size Reducer"
        description="Reduce a student photo to a selected size from 10 KB to 200 KB. Processing happens on your device; the photo is not uploaded to CSS Vista."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-pine text-white">
                <ImageDown className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-pine">Choose size & upload</h2>
                <p className="text-xs text-muted-foreground">JPG, JPEG, PNG or WebP · up to 20 MB</p>
              </div>
            </div>

            <label className="mt-6 block text-sm font-semibold text-foreground" htmlFor="target-size">Target file size</label>
            <select
              id="target-size"
              value={targetKb}
              onChange={(event) => {
                setTargetKb(Number(event.target.value))
                clearOutput()
              }}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {TARGET_SIZES.map((size) => <option key={size} value={size}>{size} KB</option>)}
            </select>

            <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-800/25 bg-emerald-50/40 px-4 py-6 text-center transition hover:border-emerald-800/50 hover:bg-emerald-50" htmlFor="photo-upload">
              <Upload className="h-7 w-7 text-emerald-800" />
              <span className="mt-2 text-sm font-bold text-pine">Upload photo</span>
              <span className="mt-1 text-xs text-muted-foreground">Tap or click to select from your device</span>
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />

            {file && (
              <div className="mt-4 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <p className="truncate font-semibold text-foreground">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Original size: {formatBytes(file.size)}</p>
              </div>
            )}

            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

            <button
              type="button"
              onClick={runCompression}
              disabled={!file || working}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageDown className="h-4 w-4" />
              {working ? `Reducing to ${targetKb} KB…` : `Reduce to ${targetKb} KB`}
            </button>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-relaxed text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your photo is compressed inside your browser. The original image is not sent to the CSS Vista database or server.</span>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-bold text-pine">Preview & download</h2>
            <p className="mt-1 text-xs text-muted-foreground">Balanced compression protects both facial sharpness and useful image resolution instead of sacrificing one completely.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Original</p>
                <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-xl border bg-secondary/30">
                  {originalPreview ? <img src={originalPreview} alt="Original preview" className="h-full w-full object-contain" /> : <span className="px-4 text-center text-xs text-muted-foreground">Upload a photo to preview it here.</span>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Reduced</p>
                <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-xl border bg-secondary/30">
                  {outputPreview ? <img src={outputPreview} alt="Compressed preview" className="h-full w-full object-contain" /> : <span className="px-4 text-center text-xs text-muted-foreground">Your compressed photo will appear here.</span>}
                </div>
              </div>
            </div>

            {outputBlob && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-950">Ready to download</p>
                    <p className="mt-0.5 text-xs text-emerald-800">Final size: {formatBytes(outputBlob.size)} · Limit: {targetKb} KB</p>
                    {targetKb > 60 && <p className="mt-1 text-xs text-amber-800">For a My CSS Vista profile photo, choose 60 KB or lower.</p>}
                    {outputMeta && <p className="mt-0.5 text-xs text-emerald-800">Dimensions: {outputMeta.width} × {outputMeta.height}px · JPEG quality: {Math.round(outputMeta.quality * 100)}%</p>}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-900">JPG</span>
                </div>
                <button
                  type="button"
                  onClick={downloadCompressed}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-pine px-4 text-sm font-bold text-white transition hover:bg-emerald-900"
                >
                  <Download className="h-4 w-4" /> Download photo
                </button>
              </div>
            )}

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Targets such as 10–14 KB always require some loss. CSS Vista searches several resolution-and-quality combinations and chooses the best balanced result instead of producing an extremely blurry or heavily pixelated photo.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
