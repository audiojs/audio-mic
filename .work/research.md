# audio-mic — Research

## Native audio capture libraries

### miniaudio (recommended)

Single-header C library (v0.11.25), public domain. ~4.8k GitHub stars, actively maintained (latest release Sep 2025).

**Capture API**: `ma_device_config_init(ma_device_type_capture)` — async callback delivers raw PCM frames. Ring buffer bridges callback thread to JS.

**Backends**: CoreAudio (macOS/iOS), WASAPI/DirectSound (Windows), ALSA/PulseAudio/JACK (Linux), AAudio/OpenSL|ES (Android).

**Why miniaudio over alternatives**:
- Zero dependencies. Single .h file compiles on any C99 compiler.
- Already used by audio-speaker — same build system, same patterns, same .h file.
- Only library with active maintenance. PortAudio effectively abandoned. RtAudio (audify) last published Apr 2024, has CVE-2024-21522.
- Captures raw PCM via async callback — maps directly to `read(cb)` API.
- No existing Node.js capture binding exists (gap in ecosystem).

**Latency**: macOS CoreAudio ~1ms. Linux ALSA ~2-5ms. Windows WASAPI shared ~10-93ms.

**N-API exports needed**:
```
mic.open(sampleRate, channels, bitDepth, bufferMs) → handle
mic.readSync(handle, buffer) → framesRead        // non-blocking
mic.readAsync(handle, buffer, callback)           // blocks until data available
mic.close(handle)                                 // teardown
```

### Alternatives considered

| Library | Underlying | Status | Issue |
|---|---|---|---|
| naudiodon | PortAudio | Semi-active | No prebuilds, PortAudio abandoned |
| micstream | PortAudio | Unclear | New, maintenance unknown |
| audify | RtAudio | Last: Apr 2024 | CVE-2024-21522, single maintainer |
| node-portaudio | PortAudio | Stale | Minimally maintained |
| neon-miniaudio | miniaudio (Rust) | Dormant | Playback only, no capture |
| @thesusheer/node-miniaudio | miniaudio | Stale | Playback only |
| alsa / alsa-capture | ALSA direct | Stale | Linux-only |

None viable. miniaudio with fresh N-API binding is the clear path.

## Browser audio capture

### getUserMedia + AudioWorklet (recommended)

Lowest latency browser approach. Runs on dedicated audio rendering thread.

```
getUserMedia({ audio: constraints })
  → MediaStream
  → AudioContext.createMediaStreamSource()
  → AudioWorkletNode
  → process() callback: 128-sample Float32 render quanta
  → postMessage to main thread
```

**Latency**: ~2.7ms per 128-sample quantum at 48kHz.

**Support**: All modern browsers. Safari 14.1+. Polyfill exists (ScriptProcessorNode fallback).

**Constraints passthrough**: `echoCancellation`, `noiseSuppression`, `autoGainControl`, `sampleRate`, `channelCount`.

**PCM conversion**: AudioWorklet delivers Float32. Convert to target bitDepth (8/16/32) in worklet or post-message handler.

**Known issue**: Mandated 128-sample buffer causes distortion on some mobile devices (WebAudio issue #2632). Not a blocker — affects edge cases.

### Alternatives

| Approach | Issue |
|---|---|
| MediaRecorder | Compressed output only (webm/ogg). No raw PCM. |
| ScriptProcessorNode | Deprecated. Main thread. Being removed from spec. |
| WebCodecs AudioDecoder | For decoding, not capture. |

getUserMedia + AudioWorklet is the only viable path for low-latency raw PCM capture in browser.

## Bun compatibility

Bun implements ~95% of Node-API. Same `.node` binary works if built with N-API (not NAN).

**Strategy**: N-API addon + prebuildify = works on Node and Bun without recompilation. Same prebuilt binaries ship in `@audio/mic-*` platform packages.

## Process fallback (high latency)

For environments without native addon:

| Tool | Platform | Command |
|---|---|---|
| ffmpeg | All | `ffmpeg -f avfoundation -i :0 -f s16le -ar 44100 -ac 1 -` (macOS) |
| sox | All | `sox -d -t raw -r 44100 -c 1 -e signed -b 16 -` |
| arecord | Linux | `arecord -f S16_LE -r 44100 -c 1 -t raw` |

Spawn process, pipe stdout as PCM chunks. Same `read(cb)/close()` interface.

## Architecture mapping (speaker → mic)

| Speaker | Mic | Notes |
|---|---|---|
| `write(chunk, cb)` | `read(cb)` | cb fires with each captured chunk |
| `write(null)` | `read(null)` | stop capture |
| `write.flush(cb)` | — | No flush for capture |
| `write.close()` | `read.close()` | close device |
| `write.backend` | `read.backend` | active backend name |
| `write.end()` | `read.end()` | alias for close |
| Ring buffer: JS→device | Ring buffer: device→JS | Direction reverses |
| `writeSync`/`writeAsync` | `readSync`/`readAsync` | Same dual strategy |
| `ma_device_type_playback` | `ma_device_type_capture` | miniaudio config |
| Defaults: stereo | Defaults: mono | Mic typically mono |
| `SpeakerStream` (Writable) | `MicStream` (Readable) | Stream direction reverses |

## Key decisions

1. **miniaudio for native** — same library as speaker, proven, zero deps, actively maintained.
2. **getUserMedia + AudioWorklet for browser** — only viable low-latency PCM capture path.
3. **Process fallback** — ffmpeg/sox/arecord pipes for environments without native addon.
4. **Callback API** — `read(cb)` mirrors `write(buf, cb)`. Streams wrap this.
5. **Default mono** — mic capture is typically single channel.
6. **N-API prebuilds** — same platform package strategy as speaker (`@audio/mic-{platform}-{arch}`).
7. **No bufferSize option** — capture doesn't need configurable ring buffer size from user side. Internal buffer sized for ~50ms.
