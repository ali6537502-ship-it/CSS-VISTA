import { getSupabaseClient } from '@/lib/supabase'
import { sanitizePlainText } from './safety'
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
  const client = await getSupabaseClient()
  if (!client) throw new Error('Factbook cloud storage is not configured.')
  const prepared = await prepareFactbookImage(input.file)
  const extension = prepared.mimeType === 'image/webp' ? 'webp' : prepared.mimeType.split('/')[1]
  const path = `${input.userId}/${input.entryId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client.storage.from('factbook-media').upload(path, prepared.blob, {
    contentType: prepared.mimeType,
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) throw new Error('The image upload failed. Check your connection and try again.')
  const { data, error } = await client.from('factbook_media').insert({
    user_id: input.userId, entry_id: input.entryId, storage_path: path,
    file_name: sanitizePlainText(input.file.name, 240), mime_type: prepared.mimeType,
    byte_size: prepared.blob.size, width: prepared.width, height: prepared.height,
    caption: sanitizePlainText(input.caption, 1000), alt_text: sanitizePlainText(input.altText, 500),
    source: sanitizePlainText(input.source, 1000),
  }).select('*').single()
  if (error) {
    await client.storage.from('factbook-media').remove([path])
    throw new Error('The uploaded image could not be linked to this entry.')
  }
  const { data: signed } = await client.storage.from('factbook-media').createSignedUrl(path, 60 * 60)
  return { ...data, signed_url: signed?.signedUrl } as FactbookMedia
}

export async function deleteFactbookImage(userId: string, media: FactbookMedia) {
  const client = await getSupabaseClient()
  if (!client) throw new Error('Factbook cloud storage is not configured.')
  const { error } = await client.from('factbook_media').delete().eq('user_id', userId).eq('id', media.id)
  if (error) throw new Error('The image could not be removed from the entry.')
  await client.storage.from('factbook-media').remove([media.storage_path])
}
