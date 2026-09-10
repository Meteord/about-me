import { ref } from 'vue'
import type { RetrievalMode } from './useToolRetrieval'

export const mode = ref<RetrievalMode>('hybrid')
export const topK = ref(5)
export const toolSelectorOpen = ref(false)
export const sampling = ref(false)
