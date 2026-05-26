import React from 'react'
import maplibregl from 'maplibre-gl'
import { Crosshair, Layers3, LocateFixed, MousePointer2, Ruler } from 'lucide-react'
import { useLayersStore } from '../stores/useStores'
import { Button } from './ui'

const demoGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'AOI boundary' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-92, 35], [-77, 35], [-77, 44], [-92, 44], [-92, 35]]],
      },
    },
  ],
} as GeoJSON.FeatureCollection

export default function MapCanvas() {
  const mapRef = React.useRef<maplibregl.Map | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const addedLayers = React.useRef<Record<string, boolean>>({})
  const [ready, setReady] = React.useState(false)
  const [cursor, setCursor] = React.useState('--, --')
  const [zoom, setZoom] = React.useState('1.00')
  const { layers } = useLayersStore()

  React.useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: 'OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [-84, 39],
      zoom: 3.2,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')
    map.on('load', () => setReady(true))
    map.on('mousemove', event => setCursor(`${event.lngLat.lng.toFixed(4)}, ${event.lngLat.lat.toFixed(4)}`))
    map.on('zoom', () => setZoom(map.getZoom().toFixed(2)))
    mapRef.current = map

    const resize = () => map.resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)
    window.requestAnimationFrame(resize)
    window.setTimeout(resize, 250)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      addedLayers.current = {}
    }
  }, [])

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    layers.forEach(layer => {
      const sourceId = `src-${layer.id}`
      if (!addedLayers.current[layer.id]) {
        if (layer.type === 'raster') {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          } as maplibregl.RasterSourceSpecification)
          map.addLayer({
            id: layer.id,
            type: 'raster',
            source: sourceId,
            paint: { 'raster-opacity': layer.opacity },
          })
        } else {
          map.addSource(sourceId, { type: 'geojson', data: demoGeoJson })
          map.addLayer({
            id: `${layer.id}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#14b8a6',
              'fill-opacity': layer.opacity * 0.22,
            },
          })
          map.addLayer({
            id: layer.id,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#0f766e',
              'line-width': 2,
              'line-opacity': layer.opacity,
            },
          })
        }
        addedLayers.current[layer.id] = true
      }

      const visibility = layer.visible ? 'visible' : 'none'
      if (map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', visibility)
      }
      if (map.getLayer(`${layer.id}-fill`)) {
        map.setLayoutProperty(`${layer.id}-fill`, 'visibility', visibility)
      }
      if (layer.type === 'raster' && map.getLayer(layer.id)) {
        map.setPaintProperty(layer.id, 'raster-opacity', layer.opacity)
      }
      if (layer.type === 'geojson') {
        if (map.getLayer(layer.id)) map.setPaintProperty(layer.id, 'line-opacity', layer.opacity)
        if (map.getLayer(`${layer.id}-fill`)) map.setPaintProperty(`${layer.id}-fill`, 'fill-opacity', layer.opacity * 0.22)
      }
    })

    Object.keys(addedLayers.current).forEach(existingId => {
      if (layers.some(layer => layer.id === existingId)) return

      if (map.getLayer(existingId)) map.removeLayer(existingId)
      if (map.getLayer(`${existingId}-fill`)) map.removeLayer(`${existingId}-fill`)
      const sourceId = `src-${existingId}`
      if (map.getSource(sourceId)) {
        try {
          map.removeSource(sourceId)
        } catch {
          // Source can be temporarily locked while MapLibre is finalizing layer removal.
        }
      }
      delete addedLayers.current[existingId]
    })
  }, [layers, ready])

  const fitWorkspace = () => {
    mapRef.current?.fitBounds(
      [
        [-94, 34],
        [-75, 45],
      ],
      { padding: 72, duration: 600 },
    )
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-slate-200">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/70 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Crosshair aria-hidden="true" className="size-4 text-teal-700" />
        <div>
          <div className="text-xs font-semibold text-slate-900">Map canvas</div>
          <div className="text-[11px] text-slate-500">{layers.length} active layers</div>
        </div>
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <Button variant="outline" size="icon" aria-label="Fit workspace" onClick={fitWorkspace}>
          <LocateFixed aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
        <span className="inline-flex min-w-0 items-center gap-2">
          <MousePointer2 aria-hidden="true" className="size-4 text-slate-500" />
          <span className="truncate">{cursor}</span>
        </span>
        <span className="hidden items-center gap-2 md:inline-flex">
          <Layers3 aria-hidden="true" className="size-4 text-slate-500" />
          {layers.filter(layer => layer.visible).length} shown
        </span>
        <span className="inline-flex items-center gap-2">
          <Ruler aria-hidden="true" className="size-4 text-slate-500" />
          Zoom {zoom}
        </span>
      </div>
    </div>
  )
}
