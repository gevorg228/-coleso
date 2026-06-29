import { del } from '@vercel/blob'

// Removes a gif from the Blob store by its URL.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const url = req.body?.url
    if (!url) return res.status(400).json({ error: 'url is required' })
    await del(url)
    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
