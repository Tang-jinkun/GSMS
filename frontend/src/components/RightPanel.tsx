import React from 'react'
import { CheckCircle2, Clock3, Database, Download, FileText, Loader2, Play, Plus, TriangleAlert } from 'lucide-react'
import { useAssetsStore, useJobsStore, useLayersStore } from '../stores/useStores'
import { Button } from './ui'
import Input from './ui/Input'

type ModelSchema = {
  id: string
  name: string
  description?: string
  status?: string
  inputs?: Array<{ id: string; label: string; required?: boolean }>
  outputs?: Array<{ name: string; type: string; map_default?: boolean }>
}

export default function RightPanel() {
  const { assets } = useAssetsStore()
  const { activeJobId, activeJobStatus, logs, outputs, runCarbonJob } = useJobsStore()
  const { addOutputLayer } = useLayersStore()
  const rasterAssets = assets.filter(asset => asset.type === 'raster')
  const tableAssets = assets.filter(asset => asset.type === 'table')
  const [baselineRaster, setBaselineRaster] = React.useState('')
  const [carbonPools, setCarbonPools] = React.useState('')
  const [resultsSuffix, setResultsSuffix] = React.useState('mvp')
  const [formError, setFormError] = React.useState<string>()
  const [modelSchema, setModelSchema] = React.useState<ModelSchema>()
  const [modelSchemaError, setModelSchemaError] = React.useState<string>()

  React.useEffect(() => {
    if (!baselineRaster && rasterAssets[0]) setBaselineRaster(rasterAssets[0].id)
    if (!carbonPools && tableAssets[0]) setCarbonPools(tableAssets[0].id)
  }, [baselineRaster, carbonPools, rasterAssets, tableAssets])

  React.useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    let cancelled = false
    fetch(`${apiBaseUrl}/api/models/carbon/schema`)
      .then(response => {
        if (!response.ok) throw new Error(`Model schema API returned ${response.status}`)
        return response.json()
      })
      .then((schema: ModelSchema) => {
        if (!cancelled) setModelSchema(schema)
      })
      .catch(error => {
        if (!cancelled) setModelSchemaError(error instanceof Error ? error.message : 'Unable to load model schema')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canRun = Boolean(baselineRaster && carbonPools && activeJobStatus !== 'running')

  const handleRun = async () => {
    setFormError(undefined)
    if (!baselineRaster || !carbonPools) {
      setFormError('Baseline LULC raster and carbon pools CSV are required.')
      return
    }
    try {
      await runCarbonJob({
        lulc_bas_asset_id: baselineRaster,
        carbon_pools_asset_id: carbonPools,
        calc_sequestration: false,
        results_suffix: resultsSuffix,
        n_workers: -1,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create job')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Model run</h2>
            <p className="text-xs text-slate-500">Carbon Storage and Sequestration</p>
          </div>
          <StatusBadge status={activeJobStatus} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <section className="border-b border-slate-200 p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Model
            <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" value="carbon" onChange={() => undefined}>
              <option value="carbon">{modelSchema?.name ?? 'Carbon Storage and Sequestration'}</option>
            </select>
          </label>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{modelSchema?.status ?? 'stub'} runner</span>
              <span>{modelSchema?.inputs?.filter(input => input.required).length ?? 2} required inputs</span>
            </div>
            <p className="mt-1 leading-5">
              {modelSchema?.description ?? modelSchemaError ?? 'Backend model schema will appear when the API is available.'}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <AssetSelect
              label="Baseline LULC raster"
              icon={<Database aria-hidden="true" className="size-4" />}
              value={baselineRaster}
              assets={rasterAssets}
              emptyLabel="No raster assets"
              onChange={setBaselineRaster}
            />
            <AssetSelect
              label="Carbon pools table"
              icon={<FileText aria-hidden="true" className="size-4" />}
              value={carbonPools}
              assets={tableAssets}
              emptyLabel="No CSV assets"
              onChange={setCarbonPools}
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Results suffix
              <Input value={resultsSuffix} onChange={event => setResultsSuffix(event.target.value)} />
            </label>
          </div>

          {formError && (
            <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Button className="mt-4 w-full" disabled={!canRun} onClick={() => void handleRun()}>
            {activeJobStatus === 'running' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
            {activeJobStatus === 'running' ? 'Running' : 'Run Carbon'}
          </Button>
        </section>

        <section className="border-b border-slate-200 p-4">
          <h3 className="text-sm font-semibold">Job status</h3>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className="font-medium capitalize">{activeJobStatus}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Job ID</span>
              <span className="max-w-[210px] truncate font-mono text-xs text-slate-700">{activeJobId ?? 'none'}</span>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Outputs</h3>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">{outputs.length} files</span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {outputs.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                Outputs will appear after a successful run.
              </div>
            ) : (
              outputs.map(output => (
                <div key={output.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{output.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatBytes(output.size)} | {output.type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Add output ${output.name} to map`}
                      disabled={output.type !== 'geojson' || !output.geojsonUrl}
                      onClick={() => addOutputLayer(output)}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Download ${output.name}`} onClick={() => window.open(output.downloadUrl, '_blank')}>
                      <Download aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Logs</h3>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">polling</span>
          </div>
          <pre className="h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 shadow-inner">
            {logs}
          </pre>
        </section>
      </div>
    </div>
  )
}

function formatBytes(size?: number) {
  if (!size) return 'size unknown'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

type SelectAsset = {
  id: string
  name: string
}

function AssetSelect({
  label,
  icon,
  value,
  assets,
  emptyLabel,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: string
  assets: SelectAsset[]
  emptyLabel: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <select
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
        value={value}
        disabled={assets.length === 0}
        onChange={event => onChange(event.target.value)}
      >
        {assets.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : (
          assets.map(asset => (
            <option key={asset.id} value={asset.id}>
              {asset.name}
            </option>
          ))
        )}
      </select>
    </label>
  )
}

function StatusBadge({ status }: { status: 'idle' | 'running' | 'succeeded' | 'failed' }) {
  const styles = {
    idle: 'bg-slate-100 text-slate-600',
    running: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }
  const Icon = status === 'running' ? Clock3 : status === 'succeeded' ? CheckCircle2 : status === 'failed' ? TriangleAlert : Clock3
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${styles[status]}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </span>
  )
}
