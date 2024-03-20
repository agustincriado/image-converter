import fs from 'fs/promises' // Using fs.promises for async file operations
import { existsSync } from 'node:fs'
import path from 'path'
import sharp from 'sharp'

const uploadsDIR = './uploads/'
const downloadsDIR = './downloads/'

async function storeInFS (outputBuffer, resultName) {
  const outputPath = path.join(downloadsDIR, `${resultName}`)
  const directories = resultName.split('/')
  const checkDirectories = directories.map((value, index, array) => {
    if (index < array.length - 1) {
      const directoryPath = array[index - 1] ? array[index - 1] + '/' + value : value
      if (!existsSync(path.join(downloadsDIR, directoryPath))) {
        fs.mkdir(path.join(downloadsDIR, directoryPath))
      }
    }
    return null
  }).filter(value => value !== null)
  await Promise.all(checkDirectories)
  await fs.writeFile(outputPath, outputBuffer)
}

const convertImages = async (files, quality) => {
  const promises = files.map(async (file) => {
    const promise = new Promise((resolve, reject) => sharp(file.buffer)
      .webp({ quality })
      .toBuffer((err, outputBuffer) => {
        if (err) {
          console.error('Error on tobuffer', err.message)
        } else {
          resolve(outputBuffer)
        }
      }))
    const buffer = await promise
    const webpName = file.name.split('.')[0] + '.webp'
    return ({ buffer, name: webpName })
  })
  const buffers = await Promise.all(promises)
  const storePromises = buffers.map(file => storeInFS(file.buffer, file.name))
  await Promise.all(storePromises)
}

const readFiles = async () => {
  const directory = await fs.readdir(uploadsDIR, { recursive: true })
  const bufferPromise = directory.map(async (string) => {
    const fileExt = path.extname(string)
    if (!fileExt || fileExt === '.ttf') {
      return null
    }
    const fileName = string.replace(/\\/g, '/')
    try {
      const fileBuffer = await fs.readFile(uploadsDIR + fileName)
      return ({ name: fileName, buffer: fileBuffer })
    } catch (error) {
      console.error('Error: ', error)
    }
  })
  const bufferImages = await Promise.all(bufferPromise)
  const filteredBuffers = bufferImages.filter(value => value !== null)
  convertImages([...filteredBuffers], 90, downloadsDIR)
}

readFiles()
