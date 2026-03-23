/**
 * @module audio-mic/stream
 *
 * Readable stream interface for audio-mic.
 */
import { Readable } from 'node:stream'
import Mic from './index.js'

export default class MicStream extends Readable {
  constructor(opts) {
    const { sampleRate = 44100, channels = 1, bitDepth = 16, bufferSize = 50 } = opts || {}
    super({ highWaterMark: Math.round(sampleRate * channels * (bitDepth / 8) * bufferSize / 1000) })
    this._opts = opts
    this._read_fn = null
    this._closed = false
    this._reading = false
    this._ready = this._init()
  }

  async _init() {
    this._read_fn = await Mic(this._opts)
    if (this._closed) this._read_fn.close()
  }

  _read() {
    if (this._reading) return
    this._reading = true
    this._ready.then(() => {
      if (this._closed) return
      this._pull()
    })
  }

  _pull() {
    if (this._closed) return
    this._read_fn((err, chunk) => {
      this._reading = false
      if (err || !chunk) {
        if (err) this.destroy(err)
        else this.push(null)
        return
      }
      if (this.push(chunk)) {
        this._reading = true
        this._pull()
      }
    })
  }

  _destroy(err, cb) {
    this._closed = true
    if (this._read_fn) this._read_fn.close()
    cb(err)
  }
}
