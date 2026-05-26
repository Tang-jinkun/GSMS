import '../styles/globals.css'
// MapLibre CSS for client map rendering
import 'maplibre-gl/dist/maplibre-gl.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
