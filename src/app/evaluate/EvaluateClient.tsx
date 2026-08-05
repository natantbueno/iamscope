'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import AppShell from '@/components/AppShell'
import RoleInput from '@/components/RoleInput'
import EvaluationResult from '@/components/EvaluationResult'
import { evaluateRole, getResultForSlug, EvaluateCloud, EvaluationResultData, EVALUATE_CLOUDS } from '@/lib/evaluate'
import { useT } from '@/i18n/LanguageProvider'

type Status = 'empty' | 'loading' | 'result' | 'error'

export default function EvaluateClient() {
  const t = useT()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [rawInput, setRawInput] = useState('')
  const [manualCloud, setManualCloud] = useState<EvaluateCloud | null>(null)
  const [result, setResult] = useState<EvaluationResultData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [cloudNotDetected, setCloudNotDetected] = useState(false)
  const [status, setStatus] = useState<Status>('empty')

  // Carrega resultado direto da URL (?cloud=&role=) — permite compartilhar/recarregar
  // um resultado sem precisar colar o JSON de novo.
  useEffect(() => {
    const cloudParam = searchParams.get('cloud')
    const role = searchParams.get('role')
    if (cloudParam && role && (EVALUATE_CLOUDS as string[]).includes(cloudParam)) {
      // getResultForSlug virou assíncrono: os 6 catálogos agora chegam por
      // import dinâmico, fora do bundle inicial da rota. `alive` evita setState
      // depois de desmontar se o usuário sair antes do chunk chegar.
      let alive = true
      getResultForSlug(cloudParam as EvaluateCloud, role).then((r) => {
        if (!alive || !r) return
        setResult(r)
        setStatus('result')
      })
      return () => { alive = false }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runEvaluation = useCallback(() => {
    setParseError(null)
    setStatus('loading')
    // Transição de 300ms para dar feedback visual. O processamento em si é
    // local; o await é só o chunk do catálogo, que chega uma vez e fica em cache.
    setTimeout(async () => {
      const outcome = await evaluateRole(rawInput, manualCloud)
      if (!outcome.ok) {
        if (outcome.code === 'cloud_not_detected') {
          setCloudNotDetected(true)
          setStatus('empty')
        } else {
          setParseError(outcome.error)
          setResult(null)
          setStatus('error')
        }
        return
      }
      setCloudNotDetected(false)
      setResult(outcome.result)
      setStatus('result')
      if (outcome.result.matched && outcome.result.identity.slug) {
        router.replace(`/evaluate?cloud=${outcome.result.cloud}&role=${outcome.result.identity.slug}`, { scroll: false })
      } else {
        router.replace('/evaluate', { scroll: false })
      }
    }, 300)
  }, [rawInput, manualCloud, router])

  const handleClear = () => {
    setRawInput('')
    setManualCloud(null)
    setResult(null)
    setParseError(null)
    setCloudNotDetected(false)
    setStatus('empty')
    router.replace('/evaluate', { scroll: false })
  }

  return (
    <AppShell
      headerTitle="Role Evaluator"
      headerSub="{t('eval.headerSub')}"
      headerActions={
        <div className="flex items-center gap-1.5 text-3xs text-fg-muted">
          <ShieldCheck size={14} />
          <span>100% client-side — zero chamadas externas</span>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Coluna esquerda (40%) */}
          <div className="lg:col-span-2">
            <RoleInput
              value={rawInput}
              onChange={(v) => { setRawInput(v); setParseError(null) }}
              manualCloud={manualCloud}
              onManualCloudChange={setManualCloud}
              onEvaluate={runEvaluation}
              onClear={handleClear}
              parseError={parseError}
              cloudNotDetected={cloudNotDetected}
            />
          </div>

          {/* Coluna direita (60%) */}
          <div className="lg:col-span-3">
            {status === 'empty' && !result && <EmptyState />}
            {status === 'loading' && (
              <div className="flex items-center justify-center h-64 text-fg-muted text-body">
                Avaliando role...
              </div>
            )}
            {status === 'error' && !result && (
              <div className="flex items-center justify-center h-64 text-fg-muted text-body text-center px-6">
                Corrija o JSON colado à esquerda e tente novamente.
              </div>
            )}
            {result && status === 'result' && <EvaluationResult data={result} />}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function EmptyState() {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6 py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
      <ShieldCheck size={32} className="text-fg-muted dark:text-gray-700 mb-3" />
      <p className="text-note font-medium text-gray-600 dark:text-gray-300 mb-1">{t('eval.pasteToStart')}</p>
      <p className="text-tiny text-fg-muted max-w-sm">
        Funciona com o JSON exportado de qualquer uma das 6 clouds catalogadas: Entra ID, Azure RBAC, AWS IAM, GCP IAM,
        Google Workspace e IBM Cloud IAM. A cloud é detectada automaticamente pela estrutura do JSON.
      </p>
    </div>
  )
}
