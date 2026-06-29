import { useEffect, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'

// Panel for managing center gifs stored in Vercel Blob:
// upload new ones, pick the active one, or delete.
export default function GifPicker({ current, onSelect, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/list')
      if (!r.ok) throw new Error((await r.json()).error || `Ошибка ${r.status}`)
      const data = await r.json()
      setItems(data.items || [])
    } catch (e) {
      setError('Не удалось загрузить список. ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function onPick(e) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      await refresh()
      onSelect(blob.url) // auto-select freshly uploaded gif
    } catch (e) {
      setError('Загрузка не удалась. ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  async function remove(url, e) {
    e.stopPropagation()
    try {
      const r = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!r.ok) throw new Error((await r.json()).error || `Ошибка ${r.status}`)
      if (url === current) onSelect(null)
      setItems((prev) => prev.filter((i) => i.url !== url))
    } catch (e) {
      setError('Не удалось удалить. ' + e.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gif-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gif-modal-head">
          <h3>Гифки в центр колеса</h3>
          <button className="x big" onClick={onClose}>✕</button>
        </div>

        {error && <div className="gif-error">{error}</div>}

        <div className="gif-grid">
          <label className={'gif-tile upload' + (uploading ? ' busy' : '')}>
            <input ref={fileRef} type="file" accept="image/*,image/gif" onChange={onPick} hidden disabled={uploading} />
            <span>{uploading ? '⏳ Загрузка…' : '＋ Загрузить'}</span>
          </label>

          <button
            className={'gif-tile none' + (current ? '' : ' active')}
            onClick={() => { onSelect(null); onClose() }}
            title="Без гифки"
          >
            <span>Без гифки</span>
          </button>

          {loading && <div className="gif-tile muted-tile">Загрузка…</div>}

          {!loading && items.map((it) => (
            <button
              key={it.url}
              className={'gif-tile' + (it.url === current ? ' active' : '')}
              onClick={() => { onSelect(it.url); onClose() }}
              title={it.pathname}
            >
              <img src={it.url} alt="" loading="lazy" />
              <span className="del" onClick={(e) => remove(it.url, e)} title="Удалить">✕</span>
            </button>
          ))}

          {!loading && items.length === 0 && !error && (
            <div className="gif-tile muted-tile">Пока нет гифок — загрузи первую</div>
          )}
        </div>
      </div>
    </div>
  )
}
