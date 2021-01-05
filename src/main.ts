import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as crypto from 'crypto'
import * as path from 'path'
import glob from 'fast-glob'

const generateUpdateMetadata = async (): Promise<void> => {
  const isMac = core.getInput('os').startsWith('macos')
  const version = core.getInput('version')
  const fileExt = isMac ? 'zip' : 'exe'

  const [updatePath] = await glob(`./dist/*.${fileExt}`)
  console.log(updatePath)
  const updateFileName = path.basename(updatePath)

  const updateFile = await fs.readFile(updatePath)
  const md5 = crypto.createHash('md5').update(updateFile).digest('hex')

  const metadata = {
    version,
    filePath: updateFileName,
    releaseDate: new Date().toISOString(),
    isMandatory: false,
    md5
  }

  await fs.mkdir('./release', {recursive: true})
  await fs.writeFile(
    `./release/latest${isMac ? '-mac' : ''}.json`,
    JSON.stringify(metadata)
  )
  await fs.rename(updatePath, `./release/${updateFileName}`)
}

try {
  generateUpdateMetadata()
} catch (error) {
  core.setFailed(error.message)
}
