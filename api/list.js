import { list } from '@vercel/blob'

// Returns all uploaded gifs in the Blob store.
export default async function handler(req, res) {
  try {
    const { blobs } = await list()
    const items = blobs
      .map((b) => ({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    return res.status(200).json({ items })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
