Frontend scaffold for Phase 1 (static workbench)

Install and run (from workspace root):

```powershell
cd frontend
npm install
npm run dev
```

Notes:
- This is a minimal scaffold. It includes a `workbench` page with a three-column layout and mock data.
- To enable real map rendering, install `maplibre-gl` (already listed) and initialize the map in `src/components/MapCanvas.tsx`.
- Consider installing UI libraries (`shadcn/ui`) and state management (`zustand`) later.
