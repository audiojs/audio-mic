# audio-mic — agent handout

Mirror of audio-speaker, but for capture instead of playback.
Study audio-speaker closely — replicate its architecture, backend strategy, build system, and publishing flow.

## Reference

- `~/projects/audio-speaker/` — the direct counterpart, use as template
- miniaudio.h — same library, capture API (`ma_device_config` with `ma_device_type_capture`)
- Browser: `navigator.mediaDevices.getUserMedia({ audio: true })` → MediaStream → AudioWorklet/ScriptProcessor → PCM chunks

## Phase 1: Native backend (miniaudio)

- [ ] Write `native/mic.c` — miniaudio capture device, ring buffer, N-API bindings
  - `ma_device_type_capture`, callback writes to ring buffer
  - N-API: `mic_open(sampleRate, channels, bitDepth)`, `mic_read(buffer)`, `mic_close()`
  - Mirror speaker.c structure: init/read/close lifecycle, same error handling
- [ ] Write `binding.gyp` — copy from audio-speaker, change target name + sources
- [ ] Write `src/miniaudio.js` — JS wrapper around native addon
  - `open(opts)` → device handle
  - `read(cb)` → callback with PCM Buffer chunks
  - `close()` → release device
- [ ] Test native backend locally: `node -e "import('./src/miniaudio.js').then(...)"`

## Phase 2: Process fallback backend

- [ ] Write `src/process.js` — spawn arecord/sox/ffmpeg for capture
  - Detect available tool: `arecord` (Linux ALSA), `sox -d` (cross-platform), `ffmpeg -f avfoundation` (macOS)
  - Spawn child process, pipe stdout as PCM chunks
  - Same read(cb)/close() interface as miniaudio backend
- [ ] Test with `sox -d -t raw -r 44100 -c 1 -e signed -b 16 -`

## Phase 3: Browser backend

- [ ] Write `browser.js` — getUserMedia + AudioWorklet (or ScriptProcessor fallback)
  - `getUserMedia({ audio: { sampleRate, channelCount } })`
  - Connect MediaStream → AudioWorklet → postMessage PCM chunks
  - Same read(cb)/close() API surface
- [ ] Test in browser

## Phase 4: Main entry + backend selection

- [ ] Write `index.js` — backend selection logic (mirror audio-speaker pattern)
  - Try miniaudio → process → throw
  - `await Mic(opts)` returns `read` function
  - `read(cb)` — callback with PCM chunks
  - `read(null)` — stop capture
  - `read.close()`, `read.backend`
- [ ] Write `test.js` — basic capture test (record 1s, verify non-silent PCM data)

## Phase 5: Platform packages + publishing

- [ ] Create `packages/mic-{platform}-{arch}/package.json` for each platform
  - darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64
- [ ] Set up CI (GitHub Actions) — build native addon per platform
- [ ] Publish platform packages as `@audio/mic-{platform}-{arch}`
- [ ] Publish `audio-mic`

## Key decisions

- **Callback API, not stream**: `read(cb)` mirrors `write(buffer, cb)` from audio-speaker. Streams can wrap this.
- **Default mono**: Mic capture is typically mono. Speaker defaults to stereo.
- **Permissions**: Browser requires user gesture for getUserMedia. Node has no permission model.
- **Echo cancellation**: Browser getUserMedia supports `echoCancellation`, `noiseSuppression`, `autoGainControl` constraints. Expose as options.
