import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'
import glob from 'fast-glob'

const CHANNEL_REGEX = /-(alpha|beta)\d*$/g

const findFileInPath = async ({
  fileExt,
  searchPath = './dist'
}: {
  fileExt: string
  searchPath?: string
}): Promise<[string | null, string | null]> => {
  const searchResult = await glob(`${searchPath}/*.${fileExt}`)

  if (!searchResult.length) {
    return [null, null]
  }

  const filePath = searchResult[0]
  const fileName = path.basename(filePath)

  return [filePath, fileName]
}

const generateUpdateMetadata = async (): Promise<void> => {
  const isMac = core.getInput('os').startsWith('macos')
  const version = core.getInput('version')
  const isMandatory = core.getInput('isMandatory') === 'true'
  const fileExt = isMac ? 'zip' : 'exe'

  const [updatePath, updateFileName] = await findFileInPath({fileExt})
  const [dmgPath, dmgFileName] = await findFileInPath({fileExt: 'dmg'})

  if (!updatePath) return

  const updateFile = await fs.readFile(updatePath)
  const sha512 = crypto.createHash('sha512').update(updateFile).digest('hex')

  const metadata = {
    version,
    filePath: updateFileName,
    dmgFilePath: dmgFileName,
    releaseDate: new Date().toISOString(),
    isMandatory,
    sha512
  }

  console.log(metadata)

  const channelFromVersion = version.match(CHANNEL_REGEX)
  const channel = channelFromVersion
    ? channelFromVersion[0].replace(/[^A-Za-z]/g, '')
    : 'latest'

  await fs.mkdir('./release', {recursive: true})
  await fs.writeFile(
    `./release/${channel}${isMac ? '-mac' : ''}.json`,
    JSON.stringify(metadata)
  )
  await fs.rename(updatePath, `./release/${updateFileName}`)

  if (dmgPath) {
    await fs.rename(dmgPath, `./release/${dmgFileName}`)
  }
}

try {
  generateUpdateMetadata()
} catch (error) {
  core.setFailed(error.message)
}
