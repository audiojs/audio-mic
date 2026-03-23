/**
 * Null backend — silent fallback for headless/CI environments.
 * Maintains timing contract: callback fires after audio duration,
 * delivering silence buffers at real-time rate.
 */
export function open({ sampleRate = 44100, channels = 1, bitDepth = 16, bufferSize = 50 } = {}) {
  const bpf = channels * (bitDepth / 8)
  const chunkFrames = Math.round(sampleRate * bufferSize / 1000)
  const chunkBytes = chunkFrames * bpf
  const intervalMs = bufferSize
  let closed = false

  return {
    read(cb) {
      if (closed) return cb?.(new Error('closed'), null)
      setTimeout(() => {
        if (closed) return cb?.(null, null)
        cb?.(null, Buffer.alloc(chunkBytes))
      }, intervalMs)
    },
    close() { closed = true }
  }
}
