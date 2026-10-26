/** Existing on-device photo compression shared by the public tool and account setup. */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024
const MIN_JPEG_QUALITY = 0.6
const MAX_JPEG_QUALITY = 0.82
const MIN_DIMENSION = 220
const MAX_STARTING_SIDE = 1400
const FIT_CANDIDATES = 3

export type CompressionResult = {
  blob: Blob
  width: number
  height: number
  quality: number
}

export function formatBytes(bytes: number) {
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

export async function compressImage(file: File, targetKb: number): Promise<CompressionResult> {
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
