// =============================================================================
// Audio Utilities - Microphone Capture & Audio Playback for Deepgram Voice Agent
// =============================================================================
//
// Input (microphone -> Deepgram STT):  Linear16 PCM, 16 000 Hz, mono
// Output (Deepgram TTS -> speakers):   Linear16 PCM, 24 000 Hz, mono
// =============================================================================

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const BUFFER_SIZE = 4096;

// -----------------------------------------------------------------------------
// PCM Conversion Helpers
// -----------------------------------------------------------------------------

/**
 * Convert Float32 audio samples (range -1..1) to signed 16-bit integers.
 * Used when sending microphone data to Deepgram (Linear16 encoding).
 */
function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Convert signed 16-bit integers back to Float32 samples (range -1..1).
 * Used when playing agent audio received from Deepgram.
 */
function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32Array;
}

// -----------------------------------------------------------------------------
// Microphone Capture
// -----------------------------------------------------------------------------

/**
 * Request access to the user's microphone with settings optimised for
 * speech recognition (mono, 16 kHz, echo cancellation, noise suppression).
 *
 * Throws if the user denies permission or the browser does not support
 * `getUserMedia`.
 */
export async function getMicrophoneStream(): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      "getUserMedia is not supported in this browser. " +
        "Please use a modern browser such as Chrome, Firefox, or Safari."
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: INPUT_SAMPLE_RATE,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    if (err instanceof DOMException) {
      switch (err.name) {
        case "NotAllowedError":
          throw new Error(
            "Microphone permission was denied. Please allow microphone access and try again."
          );
        case "NotFoundError":
          throw new Error(
            "No microphone was found. Please connect a microphone and try again."
          );
        case "NotReadableError":
          throw new Error(
            "Microphone is already in use by another application. " +
              "Please close other apps using the mic and try again."
          );
        default:
          throw new Error(`Microphone error (${err.name}): ${err.message}`);
      }
    }
    throw err;
  }
}

/**
 * Create an audio processor that captures PCM audio from a MediaStream,
 * converts it to Linear16, and delivers chunks via a callback.
 *
 * Uses the (deprecated but widely supported) ScriptProcessorNode for maximum
 * cross-browser compatibility. A future upgrade could swap this for an
 * AudioWorklet once Safari support is more stable.
 *
 * @param stream    - MediaStream from `getMicrophoneStream()`
 * @param onAudioData - Called with each chunk of Linear16 PCM as an ArrayBuffer
 * @returns Controls to start and stop the processor
 */
export function createAudioProcessor(
  stream: MediaStream,
  onAudioData: (data: ArrayBuffer) => void
): { start: () => void; stop: () => void } {
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;

  function start(): void {
    // Prevent double-start
    if (audioContext) return;

    audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    source = audioContext.createMediaStreamSource(stream);

    // ScriptProcessorNode: bufferSize 4096, 1 input channel, 1 output channel
    processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const int16 = float32ToInt16(inputData);
      onAudioData(int16.buffer as ArrayBuffer);
    };

    // Connect: mic source -> processor -> destination (required for node to run)
    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  function stop(): void {
    if (processor) {
      processor.onaudioprocess = null;
      processor.disconnect();
      processor = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {
        // Ignore close errors (context may already be closed)
      });
      audioContext = null;
    }
    // Stop all tracks on the original stream so the browser releases the mic
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  return { start, stop };
}

// -----------------------------------------------------------------------------
// Audio Playback
// -----------------------------------------------------------------------------

/**
 * Create an audio player that accepts Linear16 PCM buffers (24 kHz) from the
 * Deepgram TTS engine, queues them, and plays them back seamlessly through the
 * speakers.
 *
 * The player chains `AudioBufferSourceNode`s so there are no audible gaps
 * between chunks. When the user interrupts (starts speaking), `clearQueue()`
 * immediately stops all playing/queued audio so the agent's response is cut
 * off naturally.
 */
/**
 * Create an audio player that accepts Linear16 PCM buffers (24 kHz) from the
 * Deepgram TTS engine, queues them, and plays them back seamlessly.
 *
 * Plays directly through AudioContext.destination. Echo cancellation is
 * handled by the browser's built-in AEC via the echoCancellation constraint
 * on getUserMedia, which operates at the system audio level.
 */
export function createAudioPlayer(): {
  enqueue: (data: ArrayBuffer) => void;
  clearQueue: () => void;
  isPlaying: () => boolean;
} {
  let audioContext: AudioContext | null = null;
  let nextStartTime = 0;
  let activeSources: AudioBufferSourceNode[] = [];
  let playing = false;

  function getContext(): AudioContext {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function enqueue(data: ArrayBuffer): void {
    if (data.byteLength === 0) return;

    const ctx = getContext();

    const int16 = new Int16Array(data);
    const float32 = int16ToFloat32(int16);

    const audioBuffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTime < now) {
      nextStartTime = now + 0.01;
    }

    sourceNode.start(nextStartTime);
    nextStartTime += audioBuffer.duration;
    playing = true;

    activeSources.push(sourceNode);

    sourceNode.onended = () => {
      const idx = activeSources.indexOf(sourceNode);
      if (idx !== -1) {
        activeSources.splice(idx, 1);
      }
      if (activeSources.length === 0) {
        playing = false;
      }
    };
  }

  function clearQueue(): void {
    for (const src of activeSources) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // Ignore errors from sources that have already ended
      }
    }
    activeSources = [];
    nextStartTime = 0;
    playing = false;
  }

  function isPlaying(): boolean {
    return playing;
  }

  return { enqueue, clearQueue, isPlaying };
}

// -----------------------------------------------------------------------------
// High-Level Convenience Function
// -----------------------------------------------------------------------------

/**
 * Create a voice session that wires together microphone capture and audio
 * playback into a single, easy-to-use interface.
 *
 * Usage:
 * ```ts
 * const session = createVoiceSession();
 *
 * // Start capturing mic audio
 * await session.startMic((pcm) => agent.sendAudio(pcm));
 *
 * // Play agent audio
 * agent.on("audio", (data) => session.playAudio(data));
 *
 * // On user interruption
 * agent.on("message", (msg) => {
 *   if (msg.type === "UserStartedSpeaking") session.clearAudio();
 * });
 *
 * // Tear down
 * session.stopMic();
 * ```
 */
export function createVoiceSession(): {
  startMic: (onAudioData: (data: ArrayBuffer) => void) => Promise<void>;
  stopMic: () => void;
  playAudio: (data: ArrayBuffer) => void;
  clearAudio: () => void;
  isPlaying: () => boolean;
} {
  let processor: { start: () => void; stop: () => void } | null = null;
  const player = createAudioPlayer();

  async function startMic(
    onAudioData: (data: ArrayBuffer) => void
  ): Promise<void> {
    // Stop any existing mic session first
    stopMic();

    const stream = await getMicrophoneStream();
    processor = createAudioProcessor(stream, onAudioData);
    processor.start();
  }

  function stopMic(): void {
    if (processor) {
      processor.stop();
      processor = null;
    }
  }

  function playAudio(data: ArrayBuffer): void {
    player.enqueue(data);
  }

  function clearAudio(): void {
    player.clearQueue();
  }

  function isPlaying(): boolean {
    return player.isPlaying();
  }

  return { startMic, stopMic, playAudio, clearAudio, isPlaying };
}
