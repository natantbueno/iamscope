'use client'

import { useMemo, useRef } from 'react'
import { useT } from '@/i18n/LanguageProvider'
import { Play, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { previewInput, EvaluateCloud, EVALUATE_CLOUDS } from '@/lib/evaluate'
import { CLOUD_META } from '@/data/compare/types'
import { useTheme } from './ThemeProvider'

// ── Exemplos de JSON válido por cloud (usados como placeholder) ────────────

const EXAMPLES: Record<EvaluateCloud, string> = {
  entraId: `{
  "displayName": "Global Administrator",
  "roleTemplateId": "62e90394-69f5-4237-9190-012177145e10",
  "description": "Can manage all aspects of Microsoft Entra ID and Microsoft services..."
}`,
  azureRbac: `{
  "name": "8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
  "type": "Microsoft.Authorization/roleDefinitions",
  "properties": {
    "roleName": "Owner",
    "description": "Grants full access to manage all resources"
  }
}`,
  aws: `{
  "PolicyName": "AdministratorAccess",
  "Arn": "arn:aws:iam::aws:policy/AdministratorAccess"
}`,
  gcp: `{
  "name": "roles/owner",
  "title": "Project Owner",
  "description": "Full access to all resources."
}`,
  googleWorkspace: `{
  "roleId": "12345",
  "roleName": "Super Admin",
  "isSuperAdminRole": true
}`,
  ibmCloud: `{
  "crn": "crn:v1:bluemix:public:iam::::role:Administrator",
  "display_name": "Administrator"
}`,
}

// ── Syntax highlight simples (regex tokenizer, sem biblioteca externa) ─────

type TokType = 'key' | 'string' | 'number' | 'bool' | 'null' | 'punct' | 'ws' | 'other'
interface Tok { type: TokType; text: string }

function tokenizeJson(text: string): Tok[] {
  const re = /("(?:\\.|[^"\\])*")|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|(\s+)/g
  const toks: Tok[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) toks.push({ type: 'other', text: text.slice(lastIndex, m.index) })
    if (m[1] !== undefined) toks.push({ type: 'string', text: m[1] })
    else if (m[2] !== undefined) toks.push({ type: 'number', text: m[2] })
    else if (m[3] !== undefined) toks.push({ type: 'bool', text: m[3] })
    else if (m[4] !== undefined) toks.push({ type: 'null', text: m[4] })
    else if (m[5] !== undefined) toks.push({ type: 'punct', text: m[5] })
    else if (m[6] !== undefined) toks.push({ type: 'ws', text: m[6] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) toks.push({ type: 'other', text: text.slice(lastIndex) })

  // Uma string seguida de ":" é uma chave, não um valor
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].type === 'string') {
      let j = i + 1
      while (toks[j]?.type === 'ws') j++
      if (toks[j]?.type === 'punct' && toks[j].text === ':') toks[i].type = 'key'
    }
  }
  return toks
}

function tokenColor(type: TokType, isDark: boolean): string | undefined {
  const palette: Record<string, [string, string]> = {
    key: ['#0369a1', '#7dd3fc'],
    string: ['#15803d', '#86efac'],
    number: ['#b45309', '#fcd34d'],
    bool: ['#7e22ce', '#d8b4fe'],
    null: ['#7e22ce', '#d8b4fe'],
    punct: ['#94a3b8', '#64748b'],
    other: ['#dc2626', '#f87171'],
  }
  const pair = palette[type]
  if (!pair) return undefined
  return isDark ? pair[1] : pair[0]
}

function HighlightedJson({ text, isDark }: { text: string; isDark: boolean }) {
  const toks = useMemo(() => tokenizeJson(text), [text])
  return (
    <>
      {toks.map((t, i) => (
        <span key={i} style={{ color: tokenColor(t.type, isDark) }}>{t.text}</span>
      ))}
      {'\n'}
    </>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

interface RoleInputProps {
  value: string
  onChange: (v: string) => void
  manualCloud: EvaluateCloud | null
  onManualCloudChange: (c: EvaluateCloud | null) => void
  onEvaluate: () => void
  onClear: () => void
  parseError: string | null
  cloudNotDetected: boolean
}

export default function RoleInput({
  value, onChange, manualCloud, onManualCloudChange, onEvaluate, onClear, parseError, cloudNotDetected,
}: RoleInputProps) {
  const t = useT()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const preRef = useRef<HTMLPreElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // `previewInput`, e não `detectCloud` cru: a caixa precisa enxergar a MESMA
  // entrada que o botão Avaliar vai processar. Com o desembrulho só do lado da
  // avaliação, esta caixa diria "cloud não detectada" em amarelo para um JSON
  // que o botão aceita sem reclamar — dois veredictos na mesma tela.
  const liveDetection = useMemo(() => (value.trim() ? previewInput(value) : null), [value])
  const candidateCount = liveDetection?.candidateCount ?? 0

  const exampleCloud: EvaluateCloud = manualCloud ?? 'entraId'
  // Uma lista de N roles não é "cloud não detectada": a cloud de cada uma é
  // decidida depois da escolha. Oferecer o seletor manual aqui empurraria a
  // pessoa a classificar na mão um JSON que o site sabe ler.
  const showManualPicker = cloudNotDetected
    || (value.trim().length > 0 && !liveDetection?.cloud && candidateCount === 0)

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop
      preRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">
          Cole o JSON do role/policy
        </label>
        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 font-mono text-tiny leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-none"
            style={{ color: 'transparent' }}
          >
            {value ? <HighlightedJson text={value} isDark={isDark} /> : null}
          </pre>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            placeholder={EXAMPLES[exampleCloud]}
            rows={16}
            className="relative w-full font-mono text-tiny leading-relaxed p-3 bg-transparent resize-y focus:outline-none"
            style={{ color: value ? 'transparent' : undefined, caretColor: isDark ? '#e5e7eb' : '#1f2937' }}
          />
        </div>
      </div>

      {/* Feedback de detecção ao vivo */}
      {value.trim() && (
        <div className={`flex items-start gap-2 text-tiny px-3 py-2 rounded-lg ${
          liveDetection?.cloud || candidateCount > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
        }`}>
          {liveDetection?.cloud || candidateCount > 0
            ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
            : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
          <span>
            {liveDetection?.cloud ? (
              <>{CLOUD_META[liveDetection.cloud].label} detectado ✓ <span className="opacity-70">— {liveDetection.reason}</span></>
            ) : candidateCount > 0 ? (
              <>{candidateCount} {t('eval.rolesInJson')}</>
            ) : (
              t('eval.cloudNotDetected')
            )}
            {liveDetection && liveDetection.notes.length > 0 && (
              <span className="opacity-70"> · <code className="font-mono">{liveDetection.notes.join(' · ')}</code></span>
            )}
          </span>
        </div>
      )}

      {/* Seleção manual de cloud */}
      {showManualPicker && (
        <div>
          <label className="text-3xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5 block">
            Selecionar cloud manualmente
          </label>
          <select
            value={manualCloud ?? ''}
            onChange={(e) => onManualCloudChange((e.target.value || null) as EvaluateCloud | null)}
            className="w-full text-tiny px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">{t('empty.select')}</option>
            {EVALUATE_CLOUDS.map((c) => (
              <option key={c} value={c}>{CLOUD_META[c].label}</option>
            ))}
          </select>
        </div>
      )}

      {parseError && (
        <div className="flex items-start gap-2 text-tiny px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onEvaluate}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-[#006cbe] disabled:opacity-40 disabled:cursor-not-allowed text-white text-body font-medium transition-colors"
        >
          <Play size={14} /> {t('action.evaluateRole')}
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-fg-muted text-body font-medium transition-colors"
        >
          <Trash2 size={14} /> Limpar
        </button>
      </div>
    </div>
  )
}
