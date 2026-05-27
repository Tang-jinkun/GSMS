const fs = require('fs')
const path = require('path')

function rm(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3 })
  } catch {
    // Best-effort cleanup: ignore errors so dev can still start.
  }
}

function main() {
  const root = path.resolve(__dirname, '..')

  rm(path.join(root, '.next'))
  rm(path.join(root, '.next-build'))
  rm(path.join(root, 'node_modules', '.cache'))
  rm(path.join(root, '.turbo'))

  console.log('Cleaned Next build/cache directories.')
}

main()
