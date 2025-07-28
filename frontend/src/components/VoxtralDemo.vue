<template>
  <div class="voxtral-demo">
    <header>
      <h1 class="voxtral-title">Voxtral Transcription Demo</h1>
    </header>
    <main class="flex flex-row gap-6">
      <!-- Sidebar: History -->
      <aside class="w-72 bg-indigo-950/40 p-4 rounded-l-2xl shadow-lg flex flex-col gap-2">
        <h3>Transcription History</h3>
        <div v-if="history.length === 0" class="text-indigo-300 text-sm">No history yet.</div>
        <ul class="flex flex-col gap-2">
          <li v-for="item in history" :key="item.id" class="flex items-center gap-2">
            <button
              class="px-2 py-1 rounded bg-indigo-800 text-indigo-100 font-semibold hover:bg-indigo-700 transition"
              :class="{ 'ring-2 ring-indigo-400': selectedHistory && selectedHistory.id === item.id }"
              @click="selectedHistory = item"
            >
              {{ item.filename }}
            </button>
            <span class="text-xs text-indigo-300">{{ item.date }}</span>
            <button
              class="ml-auto px-2 py-1 rounded bg-red-700 text-white font-semibold hover:bg-red-800 transition"
              @click="deleteHistoryItem(item)"
            >Delete</button>
          </li>
        </ul>
      </aside>
      <!-- Main Panel -->
      <div class="flex-1 p-6">
        <div class="mb-4 flex gap-4 items-center">
          <label for="language" class="font-semibold text-indigo-200">Language:</label>
          <select id="language" v-model="selectedLanguage" class="bg-indigo-950/40 px-2 py-1 rounded text-indigo-100 border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option v-for="lang in LANGUAGES" :key="lang.code" :value="lang.code">{{ lang.icon }} {{ lang.label }}</option>
          </select>
        </div>
        <div class="mb-4 flex gap-4 items-center">
          <input ref="fileInput" type="file" accept="audio/*" @change="onFileChange" class="hidden" />
          <button class="voxtral-btn" @click="fileInput && fileInput.click()" :disabled="isTranscribing || isRecording">Upload Audio File</button>
          <button class="voxtral-btn" @click="startRecording" :disabled="isTranscribing || isRecording">Record Audio</button>
          <span v-if="isRecording" class="text-red-400 font-semibold">Recording... {{ recordingTime }}s <button class="ml-2 px-2 py-1 rounded bg-red-700 text-white font-semibold hover:bg-red-800 transition" @click="stopRecording">Stop</button></span>
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
        <div v-if="selectedHistory" class="w-full max-w-2xl mx-auto mt-4 p-6 rounded bg-indigo-900/30 shadow-lg">
          <div class="mb-2 flex items-center gap-2">
            <input
              v-model="selectedHistory.filename"
              @blur="updateHistoryItem(selectedHistory)"
              class="font-bold text-lg bg-indigo-950/40 px-2 py-1 rounded text-indigo-100 border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style="min-width: 120px;"
            />
            <span class="text-xs text-indigo-300">{{ selectedHistory.date }} | {{ LANGUAGES.find(l => l.code === selectedHistory.language)?.label }}</span>
          </div>
          <div v-if="selectedHistory.audioUrl">
            <audio :src="selectedHistory.audioUrl" controls class="w-full mb-2" />
          </div>
          <textarea
            v-model="selectedHistory.text"
            @blur="updateHistoryItem(selectedHistory)"
            class="bg-indigo-950/40 p-2 rounded text-indigo-100 w-full font-mono text-base resize-vertical border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
            rows="6"
          ></textarea>
          <button
            class="mt-2 px-4 py-2 rounded bg-indigo-700 text-white font-semibold hover:bg-indigo-800 transition"
            @click="downloadTranscript(selectedHistory)"
          >
            Download Transcript
          </button>
        </div>
        <button v-if="isTranscribing" @click="stopTranscription" class="mt-4 px-4 py-2 rounded bg-red-700 text-white font-semibold hover:bg-red-800 transition">Stop Transcription</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'
import { useVoxtral } from '../composables/useVoxtral'
defineOptions({ name: 'VoxtralDemo' })
const fileInput = ref<HTMLInputElement | null>(null)
const { status, error, transcription, loadModel, transcribe, stopTranscription, setTranscription } = useVoxtral()
const isTranscribing = ref(false)
const isRecording = ref(false)
const recordingTime = ref(0)
const recordedBlobUrl = ref<string | null>(null)
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let recordingInterval: number | null = null

// History and selection
const history = ref<any[]>([])
const selectedHistory = ref<any | null>(null)

// Load history from localStorage
function loadHistory() {
  const raw = localStorage.getItem('voxtral-history')
  if (raw) {
    try {
      history.value = JSON.parse(raw)
      if (history.value.length > 0) selectedHistory.value = history.value[0]
    } catch {}
  }
}
function saveHistory() {
  localStorage.setItem('voxtral-history', JSON.stringify(history.value))
}
loadHistory()

// Watch for changes to save
watch(history, saveHistory, { deep: true })

// Keep selectedHistory.text in sync with transcription if it's the active item
watchEffect(() => {
  if (selectedHistory.value && transcription.value && selectedHistory.value.text !== transcription.value) {
    selectedHistory.value.text = transcription.value
  }
})

// Language selection
const LANGUAGES = [
  { code: 'en', label: 'English', icon: '🇬🇧' },
  { code: 'fr', label: 'Français', icon: '🇫🇷' },
  { code: 'de', label: 'Deutsch', icon: '🇩🇪' },
  { code: 'es', label: 'Español', icon: '🇪🇸' },
  { code: 'it', label: 'Italiano', icon: '🇮🇹' },
  { code: 'pt', label: 'Português', icon: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', icon: '🇳🇱' },
  { code: 'hi', label: 'हिन्दी', icon: '🇮🇳' },
]
const selectedLanguage = ref('en')

function addToHistory({ text, filename, language, audioUrl }: { text: string, filename: string, language: string, audioUrl?: string }) {
  const item = {
    id: Date.now() + Math.random().toString(16).slice(2),
    filename: filename || 'Transcript',
    date: new Date().toLocaleString(),
    text,
    language,
    audioUrl: audioUrl || null
  }
  history.value.unshift(item)
  selectedHistory.value = item
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  setTranscription('')
  isTranscribing.value = true
  file.arrayBuffer().then(async (buffer) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const decoded = await audioCtx.decodeAudioData(buffer)
    const float32 = decoded.getChannelData(0)
    await transcribe(float32, selectedLanguage.value)
    isTranscribing.value = false
    await audioCtx.close()
    // Save to history
    addToHistory({
      text: transcription.value,
      filename: file.name.replace(/\.[^/.]+$/, ''),
      language: selectedLanguage.value
    })
  })
}

async function startRecording() {
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
      if (recordedBlobUrl.value) {
        URL.revokeObjectURL(recordedBlobUrl.value)
      }
      recordedBlobUrl.value = URL.createObjectURL(blob)
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      const float32 = decoded.getChannelData(0)
      isTranscribing.value = true
      await transcribe(float32, selectedLanguage.value)
      isTranscribing.value = false
      await audioCtx.close()
      // Save to history
      addToHistory({
        text: transcription.value,
        filename: 'Recording',
        language: selectedLanguage.value,
        audioUrl: recordedBlobUrl.value
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

function updateHistoryItem(item: any) {
  // Triggers watch to save
  saveHistory()
}

function deleteHistoryItem(item: any) {
  const idx = history.value.findIndex((h) => h.id === item.id)
  if (idx !== -1) {
    history.value.splice(idx, 1)
    if (selectedHistory.value && selectedHistory.value.id === item.id) {
      selectedHistory.value = history.value[0] || null
    }
    saveHistory()
  }
}

function downloadTranscript(item: any) {
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
/* Only CSS below this line */
.voxtral-demo {
  width: 100%;
  max-width: 700px;
  margin: 2rem auto;
  padding: 0;
  border-radius: 2rem;
  background: linear-gradient(120deg, #1e293b 60%, #6366f1 100%);
  box-shadow: 0 8px 32px rgba(67, 56, 202, 0.15);
  color: #fff;
  position: relative;
  backdrop-filter: blur(16px) saturate(180%);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.voxtral-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  padding: 2rem 2rem 0.5rem 2rem;
  text-align: center;
  letter-spacing: 0.02em;
  background: linear-gradient(90deg, #6366f1 60%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.voxtral-btn {
  display: block;
  margin: 0 auto 2rem auto;
  padding: 0.85rem 2.2rem;
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(90deg, #6366f1 60%, #a78bfa 100%);
  color: #fff;
  border: none;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(67, 56, 202, 0.12);
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.2s;
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
  min-height: 200px;
  margin-bottom: 2rem;
}
.loader-bg {
  background: rgba(30, 41, 59, 0.7);
  border-radius: 1.5rem;
  padding: 2.5rem 1.5rem;
  box-shadow: 0 4px 24px rgba(67, 56, 202, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(67, 56, 202, 0.18);
}
.loader-spinner {
  margin-bottom: 1.2rem;
}
.loader-text {
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  color: #a78bfa;
  margin-bottom: 0.5rem;
}
.loader-sub {
  font-size: 1rem;
  color: #818cf8;
}
.voxtral-cite {
  text-align: center;
  font-size: 1.08rem;
  color: #c7d2fe;
  margin: 1.5rem 2rem 2rem 2rem;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(90deg, rgba(99,102,241,0.10) 0%, rgba(167,139,250,0.10) 100%);
  box-shadow: 0 2px 8px rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.12);
  opacity: 0.92;
  backdrop-filter: blur(6px);
}
.voxtral-cite-link {
  color: #818cf8;
  text-decoration: underline;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.2s, text-shadow 0.2s;
  text-shadow: 0 1px 4px rgba(99,102,241,0.12);
}
.voxtral-cite-link:hover {
  color: #6366f1;
  text-shadow: 0 2px 8px rgba(99,102,241,0.18);
  color: #fff;
  border: 1px solid #6366f133;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(67, 56, 202, 0.08);
}
h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #818cf8;
}
pre {
  background: rgba(30, 41, 59, 0.7);
  border-radius: 1rem;
  padding: 1rem;
  color: #fff;
  font-size: 1.05rem;
  font-family: 'Fira Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(67, 56, 202, 0.08);
}
button {
  font-family: inherit;
}
</style>