/**
 * @module audio-mic/stream
 *
 * Node.js Readable stream for audio capture.
 */
import { Readable } from 'node:stream'
import mic from './index.js'

export default function readable(opts) {
  const { sampleRate = 44100, channels = 1, bitDepth = 16, bufferSize = 50 } = opts || {}
  const read = mic(opts)

  return new Readable({
    highWaterMark: Math.round(sampleRate * channels * (bitDepth / 8) * bufferSize / 1000),
    read() { pull(this) },
    destroy(err, cb) { read.close(); cb(err) }
  })

  function pull(stream) {
    if (stream.destroyed) return
    read((err, chunk) => {
      if (stream.destroyed) return
      if (err) return stream.destroy(err)
      if (!chunk) return stream.push(null)
      if (stream.push(chunk)) pull(stream)
    })
  }
}
