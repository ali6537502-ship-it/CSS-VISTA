import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProgress } from '@/lib/progress'
import { getState } from '@/lib/store'
import { PROGRESS_CHANGED_EVENT } from '@/lib/progressEvents'
import {
  buildExamIntelligence,
  type ExamIntelligenceReport,
  type IntelligenceSyllabusData,
} from '@/lib/examIntelligence'

let syllabusPromise: Promise<IntelligenceSyllabusData> | null = null

function loadSyllabus() {
  if (!syllabusPromise) {
    syllabusPromise = fetch('/fpsc-syllabus.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Syllabus returned ${response.status}`)
        return response.json() as Promise<IntelligenceSyllabusData>
      })
      .catch((error) => {
        syllabusPromise = null
        throw error
      })
  }
  return syllabusPromise
}

export function useExamIntelligence(): {
  report: ExamIntelligenceReport
  loading: boolean
  error: string
  refresh: () => void
  retry: () => void
} {
  const [syllabus, setSyllabus] = useState<IntelligenceSyllabusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const retrieve = useCallback(() => {
    setLoading(true)
    setError('')
    void loadSyllabus()
      .then(setSyllabus)
      .catch(() => setError('The official syllabus map could not be loaded. Activity analysis remains available.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(retrieve, [retrieve])
  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    window.addEventListener(PROGRESS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const report = useMemo(() => {
    void version
    return buildExamIntelligence(getProgress(), getState(), syllabus)
  }, [syllabus, version])
  return {
    report,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
    retry: retrieve,
  }
}
