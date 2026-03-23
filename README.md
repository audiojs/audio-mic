# audio-mic

Capture audio from microphone in node or browser.

## Usage

```js
import Mic from 'audio-mic'

const read = await Mic({
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
})

read((err, pcmBuffer) => {
  // process chunk
})
read(null) // stop capture
```

### Browser

Bundlers resolve to the MediaStream backend via the `browser` field.

```js
import Mic from 'audio-mic'

const read = await Mic({ sampleRate: 44100, channels: 1 })
read((err, pcmBuffer) => {})
```

## Backends

| Backend | How | Latency | Install |
|---|---|---|---|
| `miniaudio` | N-API addon wrapping [miniaudio.h](https://github.com/mackron/miniaudio) | Low | Prebuilt via `@audio/mic-*` packages |
| `process` | Pipes from arecord/sox/ffmpeg | High | System tool must be installed |
| `mediastream` | MediaDevices.getUserMedia (browser) | Low | Built-in |

## API

### `read = await Mic(opts?)`

Returns an async source function. Options:

- `sampleRate` — default `44100`
- `channels` — default `1`
- `bitDepth` — `8`, `16` (default), `24`, `32`
- `backend` — force a specific backend

### `read(cb)`

Read PCM data. Callback fires with each captured chunk.

### `read(null)`

Stop capture. Closes the audio device.

### `read.close()`

Immediately close the audio device.

### `read.backend`

Name of the active backend (`'miniaudio'`, `'process'`, `'mediastream'`).

## License

MIT
