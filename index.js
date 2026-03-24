/**
 * @module audio-mic
 *
 * Capture audio data from microphone.
 * let read = mic({ sampleRate: 44100 })
 * read((err, chunk) => {})
 * read(null) // stop
 */
import { open } from './src/backend.js'

const defaults = {
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
  bufferSize: 50
}

export default function mic(opts) {
  const config = { ...defaults, ...opts }
  const { name, device } = open(config, config.backend)

  read.close = () => { device.close() }
  read.end = () => { device.close() }
  read.backend = name

  return read

  function read(cb) {
    if (cb == null) {
      device.close()
      return
    }
    device.read(cb)
  }
}
