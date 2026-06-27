<template>
  <div class="voxtral-demo">
    <header>
      <h1 class="voxtral-title">Voxtral Transcription Demo</h1>
    </header>

    <main class="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
      <aside class="w-full md:w-72 bg-indigo-950/45 p-4 rounded-pixel shadow-pixelSoft flex flex-col gap-2 md:max-h-[34rem] md:overflow-y-auto">
        <h3>Transcription History</h3>
        <div v-if="history.length === 0" class="text-indigo-300 text-sm">No history yet.</div>
        <ul class="flex flex-col gap-2">
          <li v-for="item in history" :key="item.id" class="flex items-center gap-2">
            <button
              class="px-2 py-1 rounded-pixel bg-indigo-800 text-indigo-100 font-semibold hover:bg-indigo-700 transition"
              :class="{ 'ring-2 ring-indigo-400': selectedHistory && selectedHistory.id === item.id }"
              @click="selectedHistory = item"
            >
              {{ item.filename }}
            </button>
            <span class="text-xs text-indigo-300">{{ item.date }}</span>
            <button
              class="ml-auto px-2 py-1 rounded-pixel bg-red-700 text-white font-semibold hover:bg-red-800 transition"
              @click="deleteHistoryItem(item)"
            >
              Delete
            </button>
          </li>
        </ul>
      </aside>

      <div class="flex-1">
        <div class="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <label for="language" class="font-semibold text-indigo-200">Language:</label>
          <select
            id="language"
            v-model="selectedLanguage"
            class="bg-indigo-950/40 px-3 py-2 rounded-pixel text-indigo-100 border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-11"
          >
            <option v-for="lang in LANGUAGES" :key="lang.code" :value="lang.code">
              {{ lang.icon }} {{ lang.label }}
            </option>
          </select>
        </div>

        <div class="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <span class="status-chip" :class="statusClass">{{ statusLabel }}</span>
          <button
            class="voxtral-btn"
            @click="initializeModel"
            :disabled="status === 'loading' || status === 'ready'"
            aria-label="Initialize or retry AI model"
          >
            {{ status === 'error' ? 'Retry Model Load' : 'Initialize AI Model' }}
          </button>
        </div>

        <div v-if="status !== 'ready'" class="voxtral-cite text-left">
          Initialize the AI model first. Initial download can take some time and will then be cached locally.
        </div>

        <div class="mb-4 flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-center">
          <input ref="fileInput" type="file" accept="audio/*" @change="onFileChange" class="hidden" />
          <button
            class="voxtral-btn"
            @click="fileInput && fileInput.click()"
            :disabled="status !== 'ready' || isTranscribing || isRecording"
            aria-label="Upload audio for transcription"
          >
            Upload Audio File
          </button>
          <button
            class="voxtral-btn"
            @click="startRecording"
            :disabled="status !== 'ready' || isTranscribing || isRecording"
            aria-label="Start recording audio"
          >
            Record Audio
          </button>
          <span v-if="isRecording" class="text-red-400 font-semibold">
            Recording... {{ recordingTime }}s
            <button
              class="ml-2 px-2 py-1 rounded-pixel bg-red-700 text-white font-semibold hover:bg-red-800 transition"
              @click="stopRecording"
            >
              Stop
            </button>
          </span>
        </div>

        <div v-if="isTranscribing" class="voxtral-loading">
          <div class="loader-bg">
            <div class="loader-spinner">
              <svg class="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <div class="loader-text">Transcribing...</div>
            <div class="loader-sub">Please wait while your audio is being processed.</div>
          </div>
        </div>

        <div v-if="error" class="voxtral-cite">{{ error }}</div>

        <div v-if="selectedHistory" class="w-full mx-auto mt-4 p-4 md:p-6 rounded-pixel bg-indigo-900/35 shadow-pixelSoft border border-indigo-800/70">
          <div class="mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              v-model="selectedHistory.filename"
              @blur="updateHistoryItem()"
              class="font-bold text-lg bg-indigo-950/40 px-2 py-1 rounded-pixel text-indigo-100 border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style="min-width: 120px;"
            />
            <span class="text-xs text-indigo-300">
              {{ selectedHistory.date }} | {{ LANGUAGES.find((l) => l.code === selectedHistory?.language)?.label }}
            </span>
          </div>
          <div v-if="selectedHistory.audioUrl">
            <audio :src="selectedHistory.audioUrl" controls class="w-full mb-2" />
          </div>
          <textarea
            v-model="selectedHistory.text"
            @blur="updateHistoryItem()"
            class="bg-indigo-950/40 p-2 rounded-pixel text-indigo-100 w-full font-mono text-base resize-vertical border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
            rows="6"
          ></textarea>
          <button
            class="mt-2 px-4 py-2 rounded-pixel bg-indigo-700 text-white font-semibold hover:bg-indigo-800 transition"
            @click="downloadTranscript(selectedHistory)"
          >
            Download Transcript
          </button>
        </div>

        <button
          v-if="isTranscribing"
          @click="stopTranscription"
          class="mt-4 px-4 py-2 rounded-pixel bg-red-700 text-white font-semibold hover:bg-red-800 transition"
        >
          Stop Transcription
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useVoxtral } from '../composables/useVoxtral'

defineOptions({ name: 'VoxtralDemo' })

type LanguageOption = {
  code: string
  label: string
  icon: string
}

type HistoryItem = {
  id: string
  filename: string
  date: string
  text: string
  language: string
  audioUrl: string | null
}

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext
}

function createAudioContext() {
  const audioCtor = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext
  if (!audioCtor) {
    throw new Error('AudioContext API is not available in this browser.')
  }
  return new audioCtor()
}

const fileInput = ref<HTMLInputElement | null>(null)
const { status, error, transcription, loadModel, transcribe, stopTranscription, setTranscription } = useVoxtral()
const isTranscribing = ref(false)
const isRecording = ref(false)
const recordingTime = ref(0)
const recordedBlobUrl = ref<string | null>(null)
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let recordingInterval: number | null = null

const statusLabel = computed(() => {
  if (status.value === 'loading') return 'Model loading...'
  if (status.value === 'ready') return 'Model ready'
  if (status.value === 'error') return 'Model failed'
  if (status.value === 'transcribing') return 'Transcribing...'
  return 'Model idle'
})

const statusClass = computed(() => {
  if (status.value === 'ready') return 'status-ok'
  if (status.value === 'error') return 'status-error'
  return 'status-pending'
})

async function initializeModel() {
  await loadModel()
}

const history = ref<HistoryItem[]>([])
const selectedHistory = ref<HistoryItem | null>(null)

function loadHistory() {
  const raw = localStorage.getItem('voxtral-history')
  if (raw) {
    try {
      history.value = JSON.parse(raw) as HistoryItem[]
      if (history.value.length > 0) selectedHistory.value = history.value[0]
    } catch {
      history.value = []
    }
  }
}

function saveHistory() {
  localStorage.setItem('voxtral-history', JSON.stringify(history.value))
}

loadHistory()

watch(history, saveHistory, { deep: true })

watchEffect(() => {
  if (selectedHistory.value && transcription.value && selectedHistory.value.text !== transcription.value) {
    selectedHistory.value.text = transcription.value
  }
})

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', icon: 'EN' },
  { code: 'fr', label: 'Francais', icon: 'FR' },
  { code: 'de', label: 'Deutsch', icon: 'DE' },
  { code: 'es', label: 'Espanol', icon: 'ES' },
  { code: 'it', label: 'Italiano', icon: 'IT' },
  { code: 'pt', label: 'Portugues', icon: 'PT' },
  { code: 'nl', label: 'Nederlands', icon: 'NL' },
  { code: 'hi', label: 'Hindi', icon: 'HI' },
]
const selectedLanguage = ref('en')

function addToHistory({ text, filename, language, audioUrl }: { text: string; filename: string; language: string; audioUrl?: string }) {
  const item: HistoryItem = {
    id: Date.now() + Math.random().toString(16).slice(2),
    filename: filename || 'Transcript',
    date: new Date().toLocaleString(),
    text,
    language,
    audioUrl: audioUrl || null,
  }
  history.value.unshift(item)
  selectedHistory.value = item
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || status.value !== 'ready') return

  setTranscription('')
  isTranscribing.value = true
  try {
    const buffer = await file.arrayBuffer()
    const audioCtx = createAudioContext()
    try {
      const decoded = await audioCtx.decodeAudioData(buffer)
      const float32 = decoded.getChannelData(0)
      await transcribe(float32, selectedLanguage.value)
    } finally {
      await audioCtx.close()
    }

    addToHistory({
      text: transcription.value,
      filename: file.name.replace(/\.[^/.]+$/, ''),
      language: selectedLanguage.value,
    })
  } finally {
    isTranscribing.value = false
  }
}

async function startRecording() {
  if (status.value !== 'ready') return

  setTranscription('')
  recordedChunks = []
  recordingTime.value = 0
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      if (recordingInterval) {
        clearInterval(recordingInterval)
        recordingInterval = null
      }
      const blob = new Blob(recordedChunks, { type: 'audio/webm' })
      recordedBlobUrl.value = URL.createObjectURL(blob)
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = createAudioContext()
      try {
        const decoded = await audioCtx.decodeAudioData(arrayBuffer)
        const float32 = decoded.getChannelData(0)
        isTranscribing.value = true
        await transcribe(float32, selectedLanguage.value)
      } finally {
        isTranscribing.value = false
        await audioCtx.close()
      }

      addToHistory({
        text: transcription.value,
        filename: 'Recording',
        language: selectedLanguage.value,
        audioUrl: recordedBlobUrl.value,
      })
    }
    mediaRecorder.start()
    isRecording.value = true
    recordingInterval = window.setInterval(() => {
      recordingTime.value++
    }, 1000)
  } catch (err) {
    setTranscription('Could not access microphone: ' + (err as Error).message)
    isRecording.value = false
    if (recordingInterval) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    if (recordingInterval) {
      clearInterval(recordingInterval)
      recordingInterval = null
    }
  }
}

function updateHistoryItem() {
  saveHistory()
}

function deleteHistoryItem(item: HistoryItem) {
  const idx = history.value.findIndex((h) => h.id === item.id)
  if (idx !== -1) {
    history.value.splice(idx, 1)
    if (selectedHistory.value && selectedHistory.value.id === item.id) {
      selectedHistory.value = history.value[0] || null
    }
    saveHistory()
  }
}

function downloadTranscript(item: HistoryItem) {
  const filename = `${item.filename || 'transcript'}.txt`
  const blob = new Blob([item.text || ''], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)
}
</script>

<style scoped>
.voxtral-demo {
  width: 100%;
  max-width: 980px;
  margin: 2rem auto;
  border-radius: 2px;
  background: linear-gradient(120deg, #1e293b 60%, #6366f1 100%);
  box-shadow: 0 8px 32px rgba(67, 56, 202, 0.15);
  color: #fff;
  position: relative;
  border: 1px solid rgba(99, 102, 241, 0.35);
  overflow: hidden;
}

.voxtral-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
  padding: 1.2rem 1rem 0;
  text-align: center;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, #c4b5fd 0%, #67e8f9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.voxtral-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.65rem 1rem;
  font-size: 1rem;
  font-weight: 700;
  background: linear-gradient(90deg, #6366f1 60%, #a78bfa 100%);
  color: #fff;
  border: 1px solid #818cf8;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(67, 56, 202, 0.12);
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.voxtral-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voxtral-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  margin-bottom: 1rem;
}

.loader-bg {
  background: rgba(30, 41, 59, 0.7);
  border-radius: 2px;
  padding: 1.4rem 1rem;
  box-shadow: 0 4px 24px rgba(67, 56, 202, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(67, 56, 202, 0.18);
}

.loader-spinner {
  margin-bottom: 0.8rem;
}

.loader-text {
  font-size: 1.05rem;
  font-weight: 600;
  text-align: center;
  color: #a78bfa;
  margin-bottom: 0.35rem;
}

.loader-sub {
  font-size: 0.92rem;
  color: #818cf8;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 2px;
  border: 1px solid #475569;
}

.status-ok {
  color: #86efac;
  background: rgba(20, 83, 45, 0.45);
  border-color: #22c55e;
}

.status-error {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.45);
  border-color: #ef4444;
}

.status-pending {
  color: #c7d2fe;
  background: rgba(30, 41, 59, 0.7);
  border-color: #6366f1;
}

.voxtral-cite {
  text-align: center;
  font-size: 1rem;
  color: #c7d2fe;
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

h3 {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #818cf8;
}

button {
  font-family: inherit;
}

@media (max-width: 768px) {
  .voxtral-title {
    font-size: 1.35rem;
    line-height: 1.4;
  }

  .voxtral-demo {
    margin: 1rem auto;
  }
}
</style>
