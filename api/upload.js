import { handleUpload } from '@vercel/blob/client'

// Issues a short-lived token so the browser can upload a gif straight to Vercel Blob
// (bypasses the 4.5 MB serverless body limit). Requires BLOB_READ_WRITE_TOKEN env,
// which Vercel injects automatically once a Blob store is connected to the project.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'image/apng'],
        addRandomSuffix: true,
        maximumSizeInBytes: 25 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    })
    return res.status(200).json(jsonResponse)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}
