import React from 'react'

export type AssetType = 'raster' | 'table' | 'geojson' | 'document' | 'unknown'

export type Asset = {
  id: string
  name: string
  type: AssetType
  size?: number
  path?: string
  source?: 'backend' | 'sample'
  bounds?: number[] | null
  crs?: string | null
}

export type AssetMetadata = Asset & {
  format?: string
  crs?: string | null
  bounds?: number[] | null
  width?: number
  height?: number
  band_count?: number
  nodata?: number | null
  dtypes?: string[]
  columns?: string[]
  row_count?: number
  feature_count?: number
  sample_rows?: string[][]
  preview?: string
  note?: string
  metadata_error?: string
}

export type Layer = {
  id: string
  name: string
  assetId: string
  type: 'raster' | 'geojson'
  visible: boolean
  opacity: number
  geojsonUrl?: string
  bounds?: number[] | null
}

export type ZoomRequest = {
  layerId: string
  bounds: number[]
  nonce: number
}

export type JobStatus = 'idle' | 'running' | 'succeeded' | 'failed'

export type JobOutput = {
  id: string
  jobId?: string
  name: string
  type: AssetType
  size?: number
  downloadUrl: string
  geojsonUrl?: string
  bounds?: number[] | null
  crs?: string | null
}

type Stores = {
  apiBaseUrl: string
  assets: Asset[]
  assetsStatus: 'idle' | 'loading' | 'ready' | 'error'
  assetsError?: string
  assetMetadata: Record<string, AssetMetadata>
  metadataStatus: Record<string, 'loading' | 'ready' | 'error'>
  metadataError: Record<string, string>
  layers: Layer[]
  zoomRequest?: ZoomRequest
  activeJobId?: string
  activeJobStatus: JobStatus
  logs: string
  outputs: JobOutput[]
  loadAssets: () => Promise<void>
  uploadAsset: (file: File) => Promise<void>
  loadAssetMetadata: (assetId: string) => Promise<void>
  deleteAsset: (assetId: string) => Promise<void>
  useSampleData: () => void
  addLayer: (asset: Asset) => void
  addOutputLayer: (output: JobOutput) => void
  updateLayer: (layerId: string, patch: Partial<Layer>) => void
  removeLayer: (layerId: string) => void
  zoomToLayer: (layerId: string) => void
  runCarbonJob: (inputs: Record<string, string | boolean | number | undefined>) => Promise<void>
  loadJobOutputs: (jobId: string) => Promise<void>
}

const Context = React.createContext<Stores | null>(null)

const fallbackAssets: Asset[] = [
  { id: 'lulc_bas.tif', name: 'lulc_bas.tif', type: 'raster', size: 18432000, source: 'sample' },
  { id: 'carbon_pools.csv', name: 'carbon_pools.csv', type: 'table', size: 4096, source: 'sample' },
  { id: 'aoi_boundary.geojson', name: 'aoi_boundary.geojson', type: 'geojson', size: 12800, source: 'sample' },
]

const fallbackMetadata: Record<string, AssetMetadata> = {
  'lulc_bas.tif': {
    id: 'lulc_bas.tif',
    name: 'lulc_bas.tif',
    type: 'raster',
    format: 'geotiff',
    size: 18432000,
    source: 'sample',
    crs: 'EPSG:4326',
    bounds: [-92, 35, -77, 44],
    width: 2048,
    height: 1536,
    band_count: 1,
    note: 'Sample metadata row used when the backend asset directory is empty.',
  },
  'carbon_pools.csv': {
    id: 'carbon_pools.csv',
    name: 'carbon_pools.csv',
    type: 'table',
    format: 'csv',
    size: 4096,
    source: 'sample',
    columns: ['lucode', 'c_above', 'c_below', 'c_soil', 'c_dead'],
    row_count: 4,
    note: 'Sample metadata row used when the backend asset directory is empty.',
  },
  'aoi_boundary.geojson': {
    id: 'aoi_boundary.geojson',
    name: 'aoi_boundary.geojson',
    type: 'geojson',
    format: 'geojson',
    size: 12800,
    source: 'sample',
    crs: 'EPSG:4326',
    bounds: [-92, 35, -77, 44],
    feature_count: 1,
    note: 'Sample metadata row used when the backend asset directory is empty.',
  },
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
}

function normalizeAsset(asset: Partial<Asset>): Asset {
  return {
    id: String(asset.id ?? asset.name),
    name: String(asset.name ?? asset.id),
    type: (asset.type ?? inferAssetType(String(asset.name ?? asset.id))) as AssetType,
    size: asset.size,
    path: asset.path,
    source: asset.source ?? 'backend',
    bounds: asset.bounds,
    crs: asset.crs,
  }
}

function normalizeOutput(
  output: {
    id?: string
    job_id?: string
    name?: string
    type?: AssetType
    size?: number
    download_url?: string
    geojson_url?: string
    bounds?: number[] | null
    crs?: string | null
  },
  apiBaseUrl: string,
): JobOutput {
  const name = String(output.name ?? output.id)
  const downloadPath = output.download_url ?? ''
  const geojsonPath = output.geojson_url
  return {
    id: String(output.id ?? name),
    jobId: output.job_id,
    name,
    type: (output.type ?? inferAssetType(name)) as AssetType,
    size: output.size,
    downloadUrl: downloadPath.startsWith('http') ? downloadPath : `${apiBaseUrl}${downloadPath}`,
    geojsonUrl: geojsonPath ? (geojsonPath.startsWith('http') ? geojsonPath : `${apiBaseUrl}${geojsonPath}`) : undefined,
    bounds: output.bounds,
    crs: output.crs,
  }
}

function inferAssetType(filename: string): AssetType {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'raster'
  if (lower.endsWith('.geojson') || lower.endsWith('.json') || lower.endsWith('.zip')) return 'geojson'
  if (lower.endsWith('.csv')) return 'table'
  if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.txt')) return 'document'
  return 'unknown'
}

export function StoresProvider({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = getApiBaseUrl()
  const [assets, setAssets] = React.useState<Asset[]>(fallbackAssets)
  const [assetsStatus, setAssetsStatus] = React.useState<Stores['assetsStatus']>('idle')
  const [assetsError, setAssetsError] = React.useState<string>()
  const [assetMetadata, setAssetMetadata] = React.useState<Record<string, AssetMetadata>>({})
  const [metadataStatus, setMetadataStatus] = React.useState<Record<string, 'loading' | 'ready' | 'error'>>({})
  const [metadataError, setMetadataError] = React.useState<Record<string, string>>({})
  const [layers, setLayers] = React.useState<Layer[]>([])
  const [zoomRequest, setZoomRequest] = React.useState<ZoomRequest>()
  const [activeJobId, setActiveJobId] = React.useState<string>()
  const [activeJobStatus, setActiveJobStatus] = React.useState<JobStatus>('idle')
  const [logs, setLogs] = React.useState('No job has been started.')
  const [outputs, setOutputs] = React.useState<JobOutput[]>([])

  const loadAssets = React.useCallback(async () => {
    setAssetsStatus('loading')
    setAssetsError(undefined)
    try {
      const response = await fetch(`${apiBaseUrl}/api/assets`)
      if (!response.ok) throw new Error(`Asset API returned ${response.status}`)
      const data = await response.json()
      const remoteAssets = Array.isArray(data) ? data.map(normalizeAsset) : []
      setAssets(remoteAssets.length > 0 ? remoteAssets : fallbackAssets)
      setAssetsStatus('ready')
    } catch (error) {
      setAssets(fallbackAssets)
      setAssetsStatus('error')
      setAssetsError(error instanceof Error ? error.message : 'Unable to load assets')
    }
  }, [apiBaseUrl])

  React.useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const uploadAsset = React.useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${apiBaseUrl}/api/assets/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`Upload failed with ${response.status}`)
    const created = normalizeAsset(await response.json())
    setAssets(prev => [created, ...prev.filter(asset => asset.id !== created.id)])
  }, [apiBaseUrl])

  const loadAssetMetadata = React.useCallback(async (assetId: string) => {
    setMetadataStatus(prev => ({ ...prev, [assetId]: 'loading' }))
    setMetadataError(prev => {
      const next = { ...prev }
      delete next[assetId]
      return next
    })
    try {
      const response = await fetch(`${apiBaseUrl}/api/assets/${encodeURIComponent(assetId)}/metadata`)
      if (!response.ok) throw new Error(`Metadata API returned ${response.status}`)
      const metadata = await response.json()
      setAssetMetadata(prev => ({ ...prev, [assetId]: metadata }))
      setMetadataStatus(prev => ({ ...prev, [assetId]: 'ready' }))
    } catch (error) {
      const sampleMetadata = fallbackMetadata[assetId]
      if (sampleMetadata) {
        setAssetMetadata(prev => ({ ...prev, [assetId]: sampleMetadata }))
        setMetadataStatus(prev => ({ ...prev, [assetId]: 'ready' }))
        return
      }
      setMetadataStatus(prev => ({ ...prev, [assetId]: 'error' }))
      setMetadataError(prev => ({
        ...prev,
        [assetId]: error instanceof Error ? error.message : 'Unable to load metadata',
      }))
    }
  }, [apiBaseUrl])

  const deleteAsset = React.useCallback(async (assetId: string) => {
    const asset = assets.find(item => item.id === assetId)
    if (asset?.source === 'sample') {
      setAssets(prev => prev.filter(item => item.id !== assetId))
      setLayers(prev => prev.filter(layer => layer.assetId !== assetId))
      setAssetMetadata(prev => {
        const next = { ...prev }
        delete next[assetId]
        return next
      })
      return
    }

    const response = await fetch(`${apiBaseUrl}/api/assets/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`Delete failed with ${response.status}`)
    setAssets(prev => prev.filter(asset => asset.id !== assetId))
    setLayers(prev => prev.filter(layer => layer.assetId !== assetId))
    setAssetMetadata(prev => {
      const next = { ...prev }
      delete next[assetId]
      return next
    })
  }, [apiBaseUrl, assets])

  const useSampleData = React.useCallback(() => {
    setAssets(prev => {
      const existingIds = new Set(prev.map(asset => asset.id))
      return [...fallbackAssets.filter(asset => !existingIds.has(asset.id)), ...prev]
    })
    setAssetMetadata(prev => ({ ...fallbackMetadata, ...prev }))
    setMetadataStatus(prev => ({
      ...prev,
      ...Object.fromEntries(Object.keys(fallbackMetadata).map(assetId => [assetId, 'ready' as const])),
    }))
    setAssetsError(undefined)
    setLayers(prev => {
      const next = [...prev]
      const addSampleLayer = (asset: Asset) => {
        const layerId = `layer-${asset.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
        if (next.some(layer => layer.id === layerId)) return
        next.unshift({
          id: layerId,
          name: asset.name,
          assetId: asset.id,
          type: asset.type === 'raster' ? 'raster' : 'geojson',
          visible: true,
          opacity: asset.type === 'raster' ? 0.5 : 0.86,
          bounds: fallbackMetadata[asset.id]?.bounds,
        })
      }
      fallbackAssets.filter(asset => asset.type === 'raster' || asset.type === 'geojson').forEach(addSampleLayer)
      return next
    })
    setZoomRequest({
      layerId: 'sample-workspace',
      bounds: [-92, 35, -77, 44],
      nonce: Date.now(),
    })
  }, [])

  const addLayer = React.useCallback((asset: Asset) => {
    if (asset.type !== 'raster' && asset.type !== 'geojson') return
    setLayers(prev => {
      const layerId = `layer-${asset.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
      if (prev.some(layer => layer.id === layerId)) return prev
      return [
        {
          id: layerId,
          name: asset.name,
          assetId: asset.id,
          type: asset.type === 'raster' ? 'raster' : 'geojson',
          visible: true,
          opacity: asset.type === 'raster' ? 0.64 : 0.82,
          bounds: asset.bounds ?? fallbackMetadata[asset.id]?.bounds,
          geojsonUrl: asset.type === 'geojson' && asset.source === 'backend'
            ? `${apiBaseUrl}/api/assets/${encodeURIComponent(asset.id)}/geojson`
            : undefined,
        },
        ...prev,
      ]
    })
  }, [apiBaseUrl])

  const addOutputLayer = React.useCallback((output: JobOutput) => {
    if (output.type !== 'geojson' || !output.geojsonUrl) return
    setLayers(prev => {
      const layerKey = `${output.jobId ?? 'job'}-${output.id}-${output.name}`
      const layerId = `output-${layerKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`
      if (prev.some(layer => layer.id === layerId)) return prev
      return [
        {
          id: layerId,
          name: output.name,
          assetId: layerKey,
          type: 'geojson',
          visible: true,
          opacity: 0.82,
          bounds: output.bounds,
          geojsonUrl: output.geojsonUrl,
        },
        ...prev,
      ]
    })
    if (output.bounds?.length === 4) {
      setZoomRequest({
        layerId: output.id,
        bounds: output.bounds,
        nonce: Date.now(),
      })
    }
  }, [])

  const updateLayer = React.useCallback((layerId: string, patch: Partial<Layer>) => {
    setLayers(prev => prev.map(layer => (layer.id === layerId ? { ...layer, ...patch } : layer)))
  }, [])

  const removeLayer = React.useCallback((layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId))
  }, [])

  const zoomToLayer = React.useCallback((layerId: string) => {
    const layer = layers.find(item => item.id === layerId)
    if (!layer?.bounds || layer.bounds.length !== 4) return
    setZoomRequest({
      layerId,
      bounds: layer.bounds,
      nonce: Date.now(),
    })
  }, [layers])

  const runCarbonJob = React.useCallback(async (inputs: Record<string, string | boolean | number | undefined>) => {
    setActiveJobStatus('running')
    setLogs('Creating Carbon job...\n')
    setOutputs([])
    const response = await fetch(`${apiBaseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'carbon', inputs }),
    })
    if (!response.ok) {
      setActiveJobStatus('failed')
      throw new Error(`Job API returned ${response.status}`)
    }
    const data = await response.json()
    setActiveJobId(data.job_id)
  }, [apiBaseUrl])

  const loadJobOutputs = React.useCallback(async (jobId: string) => {
    const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}/outputs`)
    if (!response.ok) throw new Error(`Outputs API returned ${response.status}`)
    const data = await response.json()
    setOutputs(Array.isArray(data) ? data.map(output => normalizeOutput(output, apiBaseUrl)) : [])
  }, [apiBaseUrl])

  React.useEffect(() => {
    if (!activeJobId || activeJobStatus !== 'running') return

    let cancelled = false
    const timer = window.setInterval(async () => {
      try {
        const [statusResponse, logsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/jobs/${activeJobId}`),
          fetch(`${apiBaseUrl}/api/jobs/${activeJobId}/logs`),
        ])
        if (cancelled) return

        if (logsResponse.ok) {
          setLogs(await logsResponse.text())
        }
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          if (statusData.status === 'succeeded' || statusData.status === 'failed') {
            setActiveJobStatus(statusData.status)
            if (statusData.status === 'succeeded') {
              void loadJobOutputs(activeJobId)
            }
            window.clearInterval(timer)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLogs(prev => `${prev}\nLog polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeJobId, activeJobStatus, apiBaseUrl, loadJobOutputs])

  const value: Stores = {
    apiBaseUrl,
    assets,
    assetsStatus,
    assetsError,
    assetMetadata,
    metadataStatus,
    metadataError,
    layers,
    zoomRequest,
    activeJobId,
    activeJobStatus,
    logs,
    outputs,
    loadAssets,
    uploadAsset,
    loadAssetMetadata,
    deleteAsset,
    useSampleData,
    addLayer,
    addOutputLayer,
    updateLayer,
    removeLayer,
    zoomToLayer,
    runCarbonJob,
    loadJobOutputs,
  }

  return <Context.Provider value={value}>{children}</Context.Provider>
}

function useStores() {
  const ctx = React.useContext(Context)
  if (!ctx) throw new Error('Store hooks must be used within StoresProvider')
  return ctx
}

export function useAssetsStore() {
  const ctx = useStores()
  return {
    assets: ctx.assets,
    assetsStatus: ctx.assetsStatus,
    assetsError: ctx.assetsError,
    assetMetadata: ctx.assetMetadata,
    metadataStatus: ctx.metadataStatus,
    metadataError: ctx.metadataError,
    loadAssets: ctx.loadAssets,
    uploadAsset: ctx.uploadAsset,
    loadAssetMetadata: ctx.loadAssetMetadata,
    deleteAsset: ctx.deleteAsset,
    useSampleData: ctx.useSampleData,
  }
}

export function useLayersStore() {
  const ctx = useStores()
  return {
    layers: ctx.layers,
    zoomRequest: ctx.zoomRequest,
    addLayer: ctx.addLayer,
    addOutputLayer: ctx.addOutputLayer,
    updateLayer: ctx.updateLayer,
    removeLayer: ctx.removeLayer,
    zoomToLayer: ctx.zoomToLayer,
  }
}

export function useJobsStore() {
  const ctx = useStores()
  return {
    activeJobId: ctx.activeJobId,
    activeJobStatus: ctx.activeJobStatus,
    logs: ctx.logs,
    outputs: ctx.outputs,
    runCarbonJob: ctx.runCarbonJob,
    loadJobOutputs: ctx.loadJobOutputs,
  }
}

export default Context
