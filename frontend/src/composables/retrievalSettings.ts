import { ref } from 'vue'
import type { RetrievalMode } from './useToolRetrieval'

/** The mode the site ships with — a statistic uses this, never the visitor's pick. */
export const DEFAULT_RETRIEVAL_MODE: RetrievalMode = 'hybrid'

export const mode = ref<RetrievalMode>(DEFAULT_RETRIEVAL_MODE)
export const topK = ref(5)
export const sampling = ref(false)
