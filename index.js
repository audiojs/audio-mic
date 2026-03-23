/**
 * @module audio-mic
 *
 * Capture audio data from microphone.
 * Returns read(cb) async source function.
 */
import { open } from './src/backend.js'

const defaults = {
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
  bufferSize: 50
}

export default async function Mic(opts) {
  const config = { ...defaults, ...opts }
  const { name, device } = await open(config, config.backend)

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
