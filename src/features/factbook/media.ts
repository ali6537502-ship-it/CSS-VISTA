import { hostingerRequest, currentHostingerAccountUser } from '@/lib/hostingerApi'
import { factbookMediaUrl } from '@/lib/hostingerData'
import type { FactbookMedia } from './types'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_INPUT_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 2400

async function decodeImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The image could not be compressed.')), type, quality)
  })
}

export async function prepareFactbookImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image.')
  if (file.size <= 0 || file.size > MAX_INPUT_BYTES) throw new Error('Images must be smaller than 5 MB.')
  if (file.type === 'image/gif') return { blob: file as Blob, width: null, height: null, mimeType: file.type }
  const image = await decodeImage(file)
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * ratio))
  const height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot prepare the image.')
  context.drawImage(image, 0, 0, width, height)
  const outputType = file.type === 'image/png' && file.size < 1_200_000 ? 'image/png' : 'image/webp'
  const blob = await canvasBlob(canvas, outputType, 0.84)
  if (blob.size > MAX_INPUT_BYTES) throw new Error('The compressed image is still larger than 5 MB.')
  return { blob, width, height, mimeType: outputType }
}

export async function uploadFactbookImage(input: {
  userId: string
  entryId: string
  file: File
  caption: string
  altText: string
  source: string
}): Promise<FactbookMedia> {
  if (!input.altText.trim()) throw new Error('Add alternative text before uploading the image.')
  if (input.userId !== currentHostingerAccountUser()) throw new Error('Sign in again to upload an image.')
  const prepared = await prepareFactbookImage(input.file)
  const body = new FormData()
  body.set('image', prepared.blob, input.file.name)
  body.set('entry_id', input.entryId)
  body.set('caption', input.caption)
  body.set('alt_text', input.altText)
  body.set('source', input.source)
  const result = await hostingerRequest<{ media: FactbookMedia }>('factbook/media.php', { method: 'POST', headers: { 'X-CSSV-User': input.userId }, body })
  return { ...result.media, signed_url: factbookMediaUrl(result.media.id) }
}

export async function deleteFactbookImage(userId: string, media: FactbookMedia) {
  await hostingerRequest('factbook/media.php', { method: 'DELETE', headers: { 'X-CSSV-User': userId }, body: JSON.stringify({ id: media.id }) })
}
