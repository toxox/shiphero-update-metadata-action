import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'
import glob from 'fast-glob'

const CHANNEL_REGEX = /-(alpha|beta)\d*$/g

const generateUpdateMetadata = async (): Promise<void> => {
  const isMac = core.getInput('os').startsWith('macos')
  const version = core.getInput('version')
  const isMandatory = core.getInput('version')
  const fileExt = isMac ? 'zip' : 'exe'

  const [updatePath] = await glob(`./dist/*.${fileExt}`)
  const updateFileName = path.basename(updatePath)

  const updateFile = await fs.readFile(updatePath)
  const md5 = crypto.createHash('md5').update(updateFile).digest('hex')

  const metadata = {
    version,
    filePath: updateFileName,
    releaseDate: new Date().toISOString(),
    isMandatory,
    md5
  }

  const channelFromVersion = version.match(CHANNEL_REGEX)
  const channel = channelFromVersion
    ? channelFromVersion[0].replace(/\W/, '')
    : 'latest'

  await fs.mkdir('./release', {recursive: true})
  await fs.writeFile(
    `./release/${channel}${isMac ? '-mac' : ''}.json`,
    JSON.stringify(metadata)
  )
  await fs.rename(updatePath, `./release/${updateFileName}`)
}

try {
  generateUpdateMetadata()
} catch (error) {
  core.setFailed(error.message)
}
