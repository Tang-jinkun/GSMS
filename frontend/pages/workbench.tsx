import Layout from '../src/components/Layout'
import { StoresProvider } from '../src/stores/useStores'

export default function Workbench() {
  return (
    <StoresProvider>
      <Layout />
    </StoresProvider>
  )
}
