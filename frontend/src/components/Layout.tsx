import React from 'react'
import { Activity, Database, FolderUp, Map, Settings } from 'lucide-react'
import LeftPanel from './LeftPanel'
import MapCanvas from './MapCanvas'
import RightPanel from './RightPanel'
import { Button } from './ui'
import { useAssetsStore, useJobsStore, useLayersStore } from '../stores/useStores'

export default function Layout() {
  const { assets, useSampleData } = useAssetsStore()
  const { layers } = useLayersStore()
  const { activeJobStatus } = useJobsStore()

  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-100 text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <Map aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight">InVEST WebGIS Workbench</h1>
            <p className="text-xs text-slate-500">Default project</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 md:flex">
          <span className="inline-flex items-center gap-1">
            <Database aria-hidden="true" className="size-3.5" />
            {assets.length} assets
          </span>
          <span className="h-4 w-px bg-slate-200" />
          <span>{layers.length} layers</span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="inline-flex items-center gap-1">
            <Activity aria-hidden="true" className="size-3.5" />
            {activeJobStatus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={useSampleData}>
            <FolderUp aria-hidden="true" data-icon="inline-start" />
            Sample data
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(360px,auto)_minmax(420px,60vh)_minmax(520px,auto)] overflow-auto lg:grid-cols-[320px_minmax(0,1fr)_400px] lg:grid-rows-none lg:overflow-hidden">
        <aside className="min-h-[360px] border-b border-slate-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <LeftPanel />
        </aside>
        <section className="min-h-[420px] bg-slate-200 lg:min-h-0">
          <MapCanvas />
        </section>
        <aside className="min-h-[520px] border-t border-slate-200 bg-white lg:min-h-0 lg:border-l lg:border-t-0">
          <RightPanel />
        </aside>
      </main>
    </div>
  )
}
