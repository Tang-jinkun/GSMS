import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding: 40}}>
      <h1>InVEST WebGIS Workbench (Frontend)</h1>
      <p>This is a minimal scaffold. Open the workbench page:</p>
      <Link href="/workbench">Go to Workbench</Link>
    </main>
  )
}
