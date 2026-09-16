'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { appPath } from '../basePath.js'
import { mapSetByFlagId } from '../games/flaggenkunde/mapManifest.generated.js'

const mapCache = new Map()

function loadMap(id) {
  if (!mapCache.has(id)) {
    const request = fetch(appPath(`/assets/flags/interactive/${id}.json`)).then((response) => {
      if (!response.ok) throw new Error('Karte konnte nicht geladen werden.')
      return response.json()
    }).catch((error) => { mapCache.delete(id); throw error })
    mapCache.set(id, request)
  }
  return mapCache.get(id)
}

function countryBounds(shapes) {
  const left = Math.min(...shapes.map((shape) => shape.bounds[0]))
  const top = Math.min(...shapes.map((shape) => shape.bounds[1]))
  const right = Math.max(...shapes.map((shape) => shape.bounds[0] + shape.bounds[2]))
  const bottom = Math.max(...shapes.map((shape) => shape.bounds[1] + shape.bounds[3]))
  const padding = Math.max(right - left, bottom - top) * 0.12
  return [left - padding, top - padding, right - left + padding * 2, bottom - top + padding * 2]
}

function InteractiveMap({ answered, completedIds, hyper, lastGuessId, map, onSelect, onSkip, targetId }) {
  const initialView = useMemo(() => map.viewBox.split(' ').map(Number), [map])
  const [view, setView] = useState(initialView)
  const [country, setCountry] = useState('')
  const svgRef = useRef(null)
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const completed = useMemo(() => new Set(completedIds), [completedIds])
  const countries = useMemo(() => [...new Set(map.shapes.map((shape) => shape.parent))].sort((a, b) => a.localeCompare(b, 'de')), [map])
  // A focused country's tiny areas must stay above coarser neighbouring borders.
  const orderedShapes = useMemo(() => map.shapes.map((shape, index) => ({ shape, index })).sort((a, b) => Number(a.shape.parent === country) - Number(b.shape.parent === country)), [map, country])
  const zoom = initialView[2] / view[2]

  useEffect(() => {
    const nextCountry = map.shapes.find((shape) => shape.flagId === targetId)?.parent
    if (country && country !== nextCountry) {
      setCountry('')
      setView(initialView)
    }
    // Keep a chosen view while guessing; reset only when the next target changes country.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  function scaleView(factor) {
    setView(([x, y, width, height]) => {
      const nextWidth = Math.max(initialView[2] / 150, Math.min(initialView[2] * 1.2, width * factor))
      const nextHeight = height * nextWidth / width
      return [x + (width - nextWidth) / 2, y + (height - nextHeight) / 2, nextWidth, nextHeight]
    })
  }

  function startPan(event) {
    if (event.button !== 0 || !event.isPrimary) return
    suppressClick.current = false
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view, matrix: svgRef.current.getScreenCTM().inverse() }
  }

  function pan(event) {
    const start = gesture.current
    if (!start || start.pointer !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!suppressClick.current && Math.hypot(dx, dy) < 5) return
    suppressClick.current = true
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    setView([start.view[0] - dx * start.matrix.a, start.view[1] - dy * start.matrix.d, start.view[2], start.view[3]])
  }

  function choose(flagId) {
    if (!answered && !suppressClick.current) onSelect(flagId)
  }

  return (
    <div className={`fq-region-map ${hyper ? 'fq-region-map--europe' : ''}`}>
      <div className="fq-region-map__toolbar">
        <div><span>{hyper ? `${completed.size} / ${map.shapes.length} gefunden` : 'Gebietskarte'}</span><strong>{map.label}</strong></div>
        {hyper ? <label className="fq-map-country">Ausschnitt
          <select aria-label="Kartenausschnitt wählen" value={country} onChange={(event) => {
            const value = event.target.value
            setCountry(value)
            setView(value ? countryBounds(map.shapes.filter((shape) => shape.parent === value)) : initialView)
          }}>
            <option value="">Ganz Europa</option>
            {countries.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label> : null}
        <div className="fq-region-map__zoom" aria-label="Kartenzoom">
          <button aria-label="Karte verkleinern" disabled={zoom <= 0.85} onClick={() => scaleView(1.6)} type="button">−</button>
          <button aria-label="Kartenansicht zurücksetzen" onClick={() => { setView(initialView); setCountry('') }} type="button">↺</button>
          <button aria-label="Karte vergrößern" disabled={zoom >= 150} onClick={() => scaleView(1 / 1.6)} type="button">+</button>
        </div>
        {hyper && onSkip ? <button className="fq-map-skip" disabled={answered} onClick={onSkip} type="button">Überspringen <span aria-hidden="true">→</span></button> : null}
      </div>
      <div className="fq-region-map__scroll">
        <svg
          aria-label={`${map.label}: Region auf der Karte auswählen`}
          onPointerDown={startPan}
          onPointerMove={pan}
          onPointerUp={() => { gesture.current = null }}
          onPointerCancel={() => { gesture.current = null }}
          ref={svgRef}
          role="group"
          viewBox={view.join(' ')}
        >
          {map.backgroundPath ? <path className="fq-region-map__background" d={map.backgroundPath} fillRule="evenodd" /> : null}
          {orderedShapes.map(({ shape, index }) => {
            const isTarget = shape.flagId === targetId
            const isWrong = shape.flagId === lastGuessId && !isTarget
            const isCompleted = hyper && completed.has(shape.flagId) && !isTarget
            const revealed = isCompleted || isWrong || (answered && isTarget)
            const outsideCountry = Boolean(country && shape.parent !== country)
            return (
              <path
                aria-label={revealed ? shape.name : `Kartenregion ${index + 1}`}
                aria-disabled={answered || outsideCountry}
                className={['fq-region-shape', outsideCountry ? 'is-outside-country' : '', isWrong ? 'is-wrong' : '', answered && isTarget ? 'is-correct' : '', isCompleted ? 'is-completed' : ''].filter(Boolean).join(' ')}
                d={shape.d}
                data-map-region={shape.flagId}
                fillRule="evenodd"
                key={shape.flagId}
                onClick={() => { if (!outsideCountry) choose(shape.flagId) }}
                onKeyDown={(event) => {
                  if (!answered && !outsideCountry && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    event.stopPropagation()
                    suppressClick.current = false
                    choose(shape.flagId)
                  }
                }}
                role="button"
                tabIndex={answered || outsideCountry ? -1 : 0}
                vectorEffect="non-scaling-stroke"
              >
                {revealed ? <title>{shape.name}</title> : null}
              </path>
            )
          })}
        </svg>
      </div>
      <p>Ziehen zum Verschieben · + / − zum Zoomen{hyper ? ' · Länder-Ausschnitt für kleine Regionen' : ''}</p>
    </div>
  )
}

export default function RegionQuizMap(props) {
  const mapId = props.hyper ? 'europe' : mapSetByFlagId[props.targetId]
  const [resource, setResource] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadMap(mapId).then((map) => { if (!cancelled) setResource({ id: mapId, map }) }).catch(() => { if (!cancelled) setResource({ id: mapId, error: true }) })
    return () => { cancelled = true }
  }, [mapId, retry])
  if (resource?.id === mapId && resource.error) return <div className="fq-map-unavailable"><p>Die Karte konnte nicht geladen werden.</p><button onClick={() => { setResource(null); setRetry((value) => value + 1) }} type="button">Erneut versuchen</button></div>
  if (resource?.id !== mapId) return <div className="fq-map-loading" role="status">Karte wird entfaltet …</div>
  return <InteractiveMap key={mapId} {...props} map={resource.map} />
}
