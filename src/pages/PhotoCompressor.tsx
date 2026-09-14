import { useEffect, useMemo, useState } from 'react'
import { Download, ImageDown, ShieldCheck, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared'

const TARGET_SIZES = Array.from({ length: 51 }, (_, index) => index + 10)
const MAX_INPUT_BYTES = 20 * 1024 * 1024
const MIN_JPEG_QUALITY = 0.6
const MAX_JPEG_QUALITY = 0.82
const MIN_DIMENSION = 220
const MAX_STARTING_SIDE = 1400
const FIT_CANDIDATES = 3

type CompressionResult = {
  blob: Blob
  width: number
  height: number
  quality: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Your browser could not create the compressed image.'))
    }, 'image/jpeg', quality)
  })
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be opened. Please try another JPG, PNG or WebP photo.'))
    }
    image.src = url
  })
}

function renderAtSize(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Image compression is not supported by this browser.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  return canvas
}

async function encodeBestQualityForSize(canvas: HTMLCanvasElement, targetBytes: number) {
  const floorBlob = await canvasToBlob(canvas, MIN_JPEG_QUALITY)
  if (floorBlob.size > targetBytes) return null

  const topBlob = await canvasToBlob(canvas, MAX_JPEG_QUALITY)
  if (topBlob.size <= targetBytes) {
    return { blob: topBlob, quality: MAX_JPEG_QUALITY }
  }

  let low = MIN_JPEG_QUALITY
  let high = MAX_JPEG_QUALITY
  let bestBlob = floorBlob
  let bestQuality = MIN_JPEG_QUALITY

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const quality = (low + high) / 2
    const blob = await canvasToBlob(canvas, quality)
    if (blob.size <= targetBytes) {
      bestBlob = blob
      bestQuality = quality
      low = quality
    } else {
      high = quality
    }
  }

  return { blob: bestBlob, quality: bestQuality }
}

function candidateScore(result: CompressionResult) {
  // A balanced score avoids both failure modes we saw in testing:
  // huge dimensions at destructive JPEG quality, and tiny dimensions at very high quality.
  const pixels = result.width * result.height
  return Math.log(Math.max(1, pixels)) + (result.quality * 2)
}

async function compressImage(file: File, targetKb: number): Promise<CompressionResult> {
  const image = await loadImage(file)
  const targetBytes = targetKb * 1024
  const originalWidth = image.naturalWidth || image.width
  const originalHeight = image.naturalHeight || image.height

  if (!originalWidth || !originalHeight) throw new Error('The selected image has invalid dimensions.')

  if ((file.type === 'image/jpeg' || file.type === 'image/jpg') && file.size <= targetBytes) {
    return { blob: file, width: originalWidth, height: originalHeight, quality: 1 }
  }

  const initialScale = Math.min(1, MAX_STARTING_SIDE / Math.max(originalWidth, originalHeight))
  let width = Math.max(1, Math.round(originalWidth * initialScale))
  let height = Math.max(1, Math.round(originalHeight * initialScale))
  const candidates: CompressionResult[] = []
  let fitCount = 0

  for (let resizeAttempt = 0; resizeAttempt < 18; resizeAttempt += 1) {
    const canvas = renderAtSize(image, width, height)
    const encoded = await encodeBestQualityForSize(canvas, targetBytes)

    if (encoded) {
      candidates.push({ blob: encoded.blob, width, height, quality: encoded.quality })
      fitCount += 1

      if (fitCount >= FIT_CANDIDATES || width <= MIN_DIMENSION || height <= MIN_DIMENSION) break

      width = Math.max(MIN_DIMENSION, Math.round(width * 0.9))
      height = Math.max(MIN_DIMENSION, Math.round(height * 0.9))
      continue
    }

    const floorBlob = await canvasToBlob(canvas, MIN_JPEG_QUALITY)
    if (width <= MIN_DIMENSION || height <= MIN_DIMENSION) break

    const estimatedScale = Math.sqrt(targetBytes / floorBlob.size)
    const shrinkFactor = Math.min(0.92, Math.max(0.78, estimatedScale * 0.98))
    const nextWidth = Math.max(MIN_DIMENSION, Math.round(width * shrinkFactor))
    const nextHeight = Math.max(MIN_DIMENSION, Math.round(height * shrinkFactor))

    if (nextWidth === width && nextHeight === height) {
      width = Math.max(MIN_DIMENSION, width - 1)
      height = Math.max(MIN_DIMENSION, height - 1)
    } else {
      width = nextWidth
      height = nextHeight
    }
  }

  if (!candidates.length) {
    throw new Error(`This photo cannot be reduced below ${targetKb} KB without unacceptable quality loss. Try a slightly larger target size.`)
  }

  candidates.sort((a, b) => candidateScore(b) - candidateScore(a))
  return candidates[0]
}

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
        description="Reduce a student photo to a profile-ready size from 10 KB to 60 KB. Processing happens on your device; the photo is not uploaded to CSS Vista."
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
              Targets such as 10–14 KB always require some loss. CSS Vista searches several resolution-and-quality combinations and chooses the best balanced result within the 60 KB profile-photo limit.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
