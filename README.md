# audio-mic

Capture audio from microphone in node or browser.

## Usage

```js
import Mic from 'audio-mic'

const read = await Mic({
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
  // bufferSize: 50,           // ring buffer ms (default 50)
  // backend: 'miniaudio',     // force backend
})

read((err, pcmBuffer) => {
  // process chunk
})
read(null) // stop capture
```

### Stream (Node.js)

```js
import MicStream from 'audio-mic/stream'

const mic = new MicStream({ sampleRate: 44100, channels: 1 })
mic.on('data', (chunk) => { /* raw PCM */ })
mic.destroy() // stop
```

### Browser

Bundlers resolve to the _MediaStream_ backend via the `browser` field.

```js
import Mic from 'audio-mic'

const read = await Mic({ sampleRate: 44100, channels: 1 })
read((err, pcmBuffer) => {})
```

## Backends

Backends are tried in order; first successful one wins.

| Backend | How | Latency | Install |
|---|---|---|---|
| `miniaudio` | N-API addon wrapping [miniaudio.h](https://github.com/mackron/miniaudio) | Low | Prebuilt via `@audio/mic-*` packages |
| `process` | Pipes from ffmpeg/sox/arecord | High | System tool must be installed |
| `mediastream` | getUserMedia + AudioWorklet (browser) | Low | Built-in |

Prebuilt binaries are shipped as optional platform packages:

| Platform | Package |
|---|---|
| macOS arm64 | `@audio/mic-darwin-arm64` |
| macOS x64 | `@audio/mic-darwin-x64` |
| Linux x64 | `@audio/mic-linux-x64` |
| Linux arm64 | `@audio/mic-linux-arm64` |
| Windows x64 | `@audio/mic-win32-x64` |

If no prebuilt is available, falls back to compiling from source via `node-gyp` (requires C compiler).

## API

### `read = await Mic(opts?)`

Returns an async source function. Options:

- `sampleRate` — default `44100`
- `channels` — default `1`
- `bitDepth` — `8`, `16` (default), `24`, `32`
- `bufferSize` — ring buffer in ms, default `50`
- `backend` — force a specific backend

### `read(cb)`

Read PCM data. Callback fires with each captured chunk: `(err, buffer) => {}`.

### `read(null)`

Stop capture. Closes the audio device.

### `read.close()`

Immediately close the audio device.

### `read.backend`

Name of the active backend (`'miniaudio'`, `'process'`, `'mediastream'`).

## Building

```sh
npm run build          # compile native addon locally
npm test               # run tests
```

### Platform binaries

Platform packages live in `packages/mic-{platform}-{arch}/`. Binaries are built by CI and not checked into git.

**Local build** (current platform):
```sh
npx node-gyp@latest rebuild
cp build/Release/mic.node packages/mic-$(node -p "process.platform+'-'+process.arch")/
```

**Cross-platform** (Docker for Linux):
```sh
# linux x64
docker run --rm --platform linux/amd64 \
  -v $(pwd):/src:ro -v $(pwd)/packages/mic-linux-x64:/out node:22-slim bash -c \
  'apt-get update -qq && apt-get install -y -qq python3 make g++ libasound2-dev >/dev/null 2>&1 &&
   cp -r /src /build && cd /build && npx node-gyp@latest rebuild 2>&1 | tail -3 &&
   cp build/Release/mic.node /out/'

# linux arm64 (via QEMU)
docker run --rm --platform linux/arm64 \
  -v $(pwd):/src:ro -v $(pwd)/packages/mic-linux-arm64:/out node:22-slim bash -c \
  'apt-get update -qq && apt-get install -y -qq python3 make g++ libasound2-dev >/dev/null 2>&1 &&
   cp -r /src /build && cd /build && npx node-gyp@latest rebuild 2>&1 | tail -3 &&
   cp build/Release/mic.node /out/'
```

**macOS x64** (cross-compile on ARM64 mac):
```sh
npx node-gyp@latest rebuild --arch=x64
mkdir -p artifacts/mic-darwin-x64
cp build/Release/mic.node artifacts/mic-darwin-x64/
```

**Windows**: built by GitHub Actions (no local cross-compilation).

## Publishing

```sh
# 1. Bump version + push
npm version patch && git push && git push --tags

# 2. Wait for CI to build all platforms
gh run watch

# 3. Download binaries from CI
rm -rf artifacts
gh run download --dir artifacts \
  -n mic-darwin-arm64 -n mic-darwin-x64 \
  -n mic-linux-x64 -n mic-linux-arm64 -n mic-win32-x64

# 4. Copy to packages + publish
for pkg in packages/mic-*/; do
  cp artifacts/$(basename $pkg)/mic.node $pkg/
  (cd $pkg && npm publish)
done
npm publish
```

## License

MIT

<p align=center><a href="https://github.com/krishnized/license/">ॐ</a></p>
