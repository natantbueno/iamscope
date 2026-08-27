'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
import AppShell from '@/components/AppShell'
import RoleInput from '@/components/RoleInput'
import EvaluationResult from '@/components/EvaluationResult'
import {
  evaluateRole, evaluateRoleCandidate, getResultForSlug,
  EvaluateCloud, EvaluationResultData, EVALUATE_CLOUDS,
} from '@/lib/evaluate'
import type { EvaluateOutcome, RoleCandidate } from '@/lib/evaluate'
import { useT } from '@/i18n/LanguageProvider'
import { Rich } from '@/i18n/Rich'

type Status = 'empty' | 'loading' | 'result' | 'error' | 'choose'

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
  // Quando o JSON colado traz mais de uma role, quem escolhe é a pessoa.
  const [candidates, setCandidates] = useState<RoleCandidate[] | null>(null)
  // O que a normalização fez com a entrada — desembrulho, lista, caixa.
  const [notes, setNotes] = useState<string[]>([])

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

  /**
   * Um só lugar para pousar o resultado, porque agora há DUAS portas de
   * entrada: o botão Avaliar e o clique numa das roles da lista de escolha.
   */
  const applyOutcome = useCallback((outcome: EvaluateOutcome) => {
    if (outcome.status === 'error') {
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
    setNotes(outcome.notes)

    if (outcome.status === 'choose') {
      setCandidates(outcome.candidates)
      setResult(null)
      setStatus('choose')
      router.replace('/evaluate', { scroll: false })
      return
    }

    setCandidates(null)
    setResult(outcome.result)
    setStatus('result')
    if (outcome.result.matched && outcome.result.identity.slug) {
      router.replace(`/evaluate?cloud=${outcome.result.cloud}&role=${outcome.result.identity.slug}`, { scroll: false })
    } else {
      router.replace('/evaluate', { scroll: false })
    }
  }, [router])

  const runEvaluation = useCallback(() => {
    setParseError(null)
    setStatus('loading')
    // Transição de 300ms para dar feedback visual. O processamento em si é
    // local; o await é só o chunk do catálogo, que chega uma vez e fica em cache.
    setTimeout(async () => {
      applyOutcome(await evaluateRole(rawInput, manualCloud))
    }, 300)
  }, [rawInput, manualCloud, applyOutcome])

  // A role escolhida não é reparseada: o objeto já veio normalizado de
  // prepareRoleJson, e refazer o parse jogaria fora o addAliases dele.
  const pickCandidate = useCallback((c: RoleCandidate) => {
    setStatus('loading')
    evaluateRoleCandidate(c.json, manualCloud).then(applyOutcome)
  }, [manualCloud, applyOutcome])

  const handleClear = () => {
    setRawInput('')
    setManualCloud(null)
    setResult(null)
    setParseError(null)
    setCloudNotDetected(false)
    setCandidates(null)
    setNotes([])
    setStatus('empty')
    router.replace('/evaluate', { scroll: false })
  }

  return (
    <AppShell
      headerTitle="Role Evaluator"
      headerSub={t('eval.headerSub')}
      beta
      headerActions={
        <div className="flex items-center gap-1.5 text-3xs text-fg-muted">
          <ShieldCheck size={14} />
          <span className="hidden sm:inline">{t('eval.clientBadge')}</span>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
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
              loading={status === 'loading'}
            />
          </div>

          {/* Coluna direita (60%) */}
          <div className="lg:col-span-3">
            {notes.length > 0 && (status === 'result' || status === 'choose') && (
              <p className="text-3xs text-fg-muted mb-3">
                {t('eval.normalized')} <code className="font-mono">{notes.join(' · ')}</code>
              </p>
            )}
            {status === 'choose' && candidates && (
              <CandidatePicker candidates={candidates} onPick={pickCandidate} />
            )}
            {status === 'empty' && !result && <EmptyState />}
            {status === 'loading' && (
              <div className="flex items-center justify-center h-64 text-fg-muted text-body">
                {t('eval.evaluating')}
              </div>
            )}
            {status === 'error' && !result && (
              <div className="flex items-center justify-center h-64 text-fg-muted text-body text-center px-6">
                {t('eval.fixJson')}
              </div>
            )}
            {result && status === 'result' && <EvaluationResult data={result} />}
          </div>

          {/* Ocupa a grade inteira: vale para as duas colunas. */}
          <HowItWorks />
        </div>
      </div>
    </AppShell>
  )
}

/**
 * A divida do item 8, metade do Evaluator.
 *
 * Fechada por padrao e no fim da pagina: quem ja confia no resultado nao
 * tropeca; quem duvida acha o metodo sem sair dali. O ponto que MAIS importa
 * aqui e' o `eval.howTier` — o veredito de tier e' classificacao editorial do
 * IAM Scope, nao do provedor, e uma ferramenta que nao diz isso induz o leitor
 * a citar a nossa opiniao como se fosse documentacao oficial.
 */
function HowItWorks() {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <section className="lg:col-span-5 border-t border-line pt-5 mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 text-tiny font-medium text-fg-muted hover:text-fg transition-colors">
        <HelpCircle size={14} />
        {t('eval.howTitle')}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 max-w-3xl space-y-2.5 text-tiny text-fg-muted leading-relaxed">
          <p><Rich text={t('eval.howInput')} className="text-fg" /></p>
          <p><Rich text={t('eval.howMatch')} className="text-fg" /></p>
          <p><Rich text={t('eval.howTier')} className="text-fg" /></p>
          <p><Rich text={t('eval.howLimit')} className="text-fg" /></p>
        </div>
      )}
    </section>
  )
}

/**
 * A lista de escolha, para quando o JSON traz N roles.
 *
 * Substitui o erro "o JSON precisa ser um objeto único", que era a resposta
 * dada à saída literal do `az role definition list` e do `aws iam
 * list-policies` — os dois comandos mais prováveis de quem foi buscar o JSON.
 */
function CandidatePicker({ candidates, onPick }: { candidates: RoleCandidate[]; onPick: (c: RoleCandidate) => void }) {
  const t = useT()
  return (
    <div className="border border-surface-border dark:border-gray-800 rounded-xl p-5">
      <p className="text-note font-medium text-gray-800 dark:text-gray-100 mb-1">{t('eval.chooseTitle')}</p>
      <p className="text-tiny text-fg-muted mb-3">{candidates.length} {t('eval.chooseBody')}</p>
      <ul className="space-y-1 max-h-[420px] overflow-auto pr-1">
        {candidates.map((c, i) => (
          <li key={i}>
            <button
              onClick={() => onPick(c)}
              className="w-full text-left text-tiny px-3 py-2 rounded-lg border border-surface-border dark:border-gray-800 hover:border-accent hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-2"
            >
              <ChevronRight size={13} className="text-fg-subtle shrink-0" />
              <span className="truncate">{c.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EmptyState() {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6 py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
      <ShieldCheck size={32} className="text-fg-muted dark:text-gray-700 mb-3" />
      <p className="text-note font-medium text-gray-600 dark:text-gray-300 mb-1">{t('eval.pasteToStart')}</p>
      <p className="text-tiny text-fg-muted max-w-sm">{t('eval.emptyBody')}</p>
    </div>
  )
}
