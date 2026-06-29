import { useEffect, useMemo, useRef, useState } from 'react'
import Wheel from './Wheel.jsx'

const LS = {
  lots: 'koleso.lots',
  history: 'koleso.history',
  settings: 'koleso.settings',
}

const PALETTE = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#f43f5e', '#84cc16', '#14b8a6', '#0ea5e9',
]

let idCounter = 1
const newId = () => `${Date.now().toString(36)}-${idCounter++}`
const colorFor = (i) => PALETTE[i % PALETTE.length]

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const DEFAULT_AMOUNT = 100

// Ensures every lot has the fields we rely on (migrates older saves without amount).
function normalize(list) {
  if (!Array.isArray(list)) return []
  return list.map((l, i) => ({
    id: l.id || newId(),
    label: l.label ?? l.name ?? '',
    amount: Number(l.amount) > 0 ? Number(l.amount) : DEFAULT_AMOUNT,
    out: !!l.out,
    color: colorFor(i),
  }))
}

export default function App() {
  const [lots, setLots] = useState(() =>
    normalize(load(LS.lots, [
      { id: newId(), label: 'Сегун', amount: 50 },
      { id: newId(), label: 'Начало', amount: 100 },
      { id: newId(), label: 'Назад в будущее', amount: 100 },
    ]))
  )
  const [history, setHistory] = useState(() => load(LS.history, []))
  const [settings, setSettings] = useState(() =>
    load(LS.settings, { eliminate: true })
  )

  const [adding, setAdding] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [winner, setWinner] = useState(null) // last winner lot
  const [spinning, setSpinning] = useState(false)
  const wheelRef = useRef(null)

  useEffect(() => { localStorage.setItem(LS.lots, JSON.stringify(lots)) }, [lots])
  useEffect(() => { localStorage.setItem(LS.history, JSON.stringify(history)) }, [history])
  useEffect(() => { localStorage.setItem(LS.settings, JSON.stringify(settings)) }, [settings])

  const active = useMemo(() => lots.filter((l) => !l.out), [lots])

  function recolor(list) {
    return list.map((l, i) => ({ ...l, color: colorFor(i) }))
  }

  function addLot(label) {
    const text = label.trim()
    if (!text) return
    setLots((prev) => recolor([...prev, { id: newId(), label: text, amount: DEFAULT_AMOUNT, out: false }]))
  }

  function updateLot(id, label) {
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, label } : l)))
  }

  function updateAmount(id, raw) {
    const amount = raw === '' ? '' : Math.max(0, Number(raw) || 0)
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, amount } : l)))
  }

  function removeLot(id) {
    setLots((prev) => recolor(prev.filter((l) => l.id !== id)))
  }

  function clearAll() {
    if (!confirm('Удалить все лоты?')) return
    setLots([])
    setWinner(null)
  }

  function returnAll() {
    setLots((prev) => recolor(prev.map((l) => ({ ...l, out: false }))))
    setWinner(null)
  }

  // Accepts JSON ({"lots":[{name,amount}]} or [{name,amount}]) or plain text
  // (one per line, optionally "Название | 100" or "Название 100").
  function parseBulk(text) {
    const trimmed = text.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed)
        const arr = Array.isArray(data) ? data : data.lots
        if (Array.isArray(arr)) {
          return arr
            .map((o) => ({
              label: String(o.name ?? o.label ?? '').trim(),
              amount: Number(o.amount) > 0 ? Number(o.amount) : DEFAULT_AMOUNT,
            }))
            .filter((o) => o.label)
        }
      } catch (e) {
        alert('Не получилось разобрать JSON: ' + e.message)
        return null
      }
    }
    // plain text lines
    return trimmed
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.*?)[\s|]+(\d+)\s*$/)
        if (m) return { label: m[1].trim(), amount: Number(m[2]) }
        return { label: line, amount: DEFAULT_AMOUNT }
      })
  }

  function applyBulk(mode) {
    const parsed = parseBulk(bulkText)
    if (parsed === null) return // JSON error already reported
    if (parsed.length === 0) return
    const fresh = parsed.map((o) => ({ id: newId(), label: o.label, amount: o.amount, out: false }))
    setLots((prev) => recolor(mode === 'replace' ? fresh : [...prev, ...fresh]))
    setBulkText('')
    setBulkOpen(false)
    setWinner(null)
  }

  function handleSpin() {
    if (spinning || active.length === 0) return
    setWinner(null)
    setSpinning(true)
    wheelRef.current?.spin()
  }

  function handleResult(index) {
    const lot = active[index]
    setSpinning(false)
    if (!lot) return
    setWinner(lot)
    setHistory((prev) => [
      { id: newId(), label: lot.label, color: lot.color, time: new Date().toISOString() },
      ...prev,
    ].slice(0, 200))
    if (settings.eliminate) {
      setLots((prev) => recolor(
        prev.map((l) => (l.id === lot.id ? { ...l, out: true } : l))
      ))
    }
  }

  const lastOneLeft = settings.eliminate && active.length === 1

  return (
    <div className="app">
      <header className="topbar">
        <h1>🎡 Колесо рандома</h1>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.eliminate}
            onChange={(e) => setSettings((s) => ({ ...s, eliminate: e.target.checked }))}
          />
          <span>На выбывание (победитель убирается)</span>
        </label>
      </header>

      <div className="layout">
        {/* WHEEL */}
        <section className="panel wheel-panel">
          <Wheel ref={wheelRef} segments={active} onResult={handleResult} />

          <button
            className="spin-btn"
            onClick={handleSpin}
            disabled={spinning || active.length === 0}
          >
            {spinning ? 'Крутится…' : active.length === 0 ? 'Нет лотов' : 'КРУТИТЬ'}
          </button>

          <div className="status">
            {winner ? (
              <div className="winner-banner" style={{ borderColor: winner.color }}>
                {lastOneLeft ? '🏆 Остался последний: ' : '🎉 Выпало: '}
                <b>{winner.label}</b>
              </div>
            ) : (
              <div className="muted">Активных лотов: {active.length} из {lots.length}</div>
            )}
          </div>
        </section>

        {/* EDITOR */}
        <section className="panel editor-panel">
          <div className="panel-head">
            <h2>Лоты ({lots.length})</h2>
            <div className="head-actions">
              <button className="ghost" onClick={() => setBulkOpen((v) => !v)}>Списком</button>
              {settings.eliminate && (
                <button className="ghost" onClick={returnAll}>Вернуть всех</button>
              )}
              <button className="ghost danger" onClick={clearAll}>Очистить</button>
            </div>
          </div>

          {bulkOpen && (
            <div className="bulk">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'Вставьте JSON или текст.\n\nJSON:\n{ "lots": [ {"name":"Сегун","amount":50}, {"name":"Начало","amount":100} ] }\n\nИли по строкам (вес через пробел/|, по умолчанию 100):\nСегун 50\nНачало\nНазад в будущее | 100'}
                rows={8}
              />
              <div className="bulk-actions">
                <button onClick={() => applyBulk('append')}>Добавить</button>
                <button onClick={() => applyBulk('replace')}>Заменить весь список</button>
              </div>
            </div>
          )}

          <form
            className="add-row"
            onSubmit={(e) => { e.preventDefault(); addLot(adding); setAdding('') }}
          >
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Новый лот и Enter…"
            />
            <button type="submit">＋</button>
          </form>

          <ul className="lot-list">
            {lots.map((l) => (
              <li key={l.id} className={l.out ? 'lot out' : 'lot'}>
                <span className="dot" style={{ background: l.color }} />
                <input
                  className="lot-name"
                  value={l.label}
                  onChange={(e) => updateLot(l.id, e.target.value)}
                />
                <input
                  className="lot-amount"
                  type="number"
                  min="0"
                  value={l.amount}
                  onChange={(e) => updateAmount(l.id, e.target.value)}
                  onBlur={(e) => { if (e.target.value === '' || Number(e.target.value) <= 0) updateAmount(l.id, DEFAULT_AMOUNT) }}
                  title="Стоимость / вес (больше = чаще выпадает)"
                />
                {l.out && <span className="tag">выбыл</span>}
                <button className="x" onClick={() => removeLot(l.id)} title="Удалить">✕</button>
              </li>
            ))}
            {lots.length === 0 && <li className="empty">Список пуст</li>}
          </ul>
        </section>

        {/* HISTORY */}
        <section className="panel history-panel">
          <div className="panel-head">
            <h2>История ({history.length})</h2>
            <button
              className="ghost danger"
              onClick={() => { if (confirm('Очистить историю?')) setHistory([]) }}
            >
              Очистить
            </button>
          </div>
          <ol className="history-list">
            {history.map((h) => (
              <li key={h.id}>
                <span className="dot" style={{ background: h.color || '#888' }} />
                <span className="h-label">{h.label}</span>
                <span className="h-time">
                  {new Date(h.time).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
            {history.length === 0 && <li className="empty">Пока нет победителей</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}
