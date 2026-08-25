/**
 * Tipos e constantes do changelog.
 *
 * ESTE ARQUIVO NÃO PODE IMPORTAR `fs` — E ISSO CUSTOU UM BUILD
 *   A primeira versão tinha o `loadChangelog()` aqui dentro. O ChangelogView é
 *   `'use client'` e importa CHANGE_CLOUDS e CLOUD_ROUTE daqui como VALOR (não
 *   como `import type`), então o webpack seguiu a cadeia e tentou empacotar o
 *   `fs` do Node para o navegador:
 *
 *     ./src/lib/changelog.ts
 *     Module not found: Can't resolve 'fs'
 *
 *   `import type` some na compilação e não puxa nada; import de valor puxa o
 *   módulo inteiro. Por isso a leitura do disco mora em `./changelogSource.ts`,
 *   importado só por componentes de servidor.
 *
 * É a mesma classe de problema que fez existirem o `counts.ts` e o
 * `roleIndex.ts`: o que um componente compartilhado importa determina o que vai
 * parar no bundle de todo mundo.
 */
export type ChangeCloud =
  | 'entraid' | 'azure-rbac' | 'aws' | 'gcp' | 'google-workspace' | 'ibm-cloud'

export type ChangeType =
  | 'created' | 'removed' | 'renamed' | 'description-changed' | 'permissions-changed'
  | 'tier-changed' | 'category-changed' | 'privilege-changed' | 'sod-changed'
  | 'genesis' | 'coverage-changed' | 'unknown'
  | 'dataset-recollected' | 'dataset-corrected'

/**
 * De onde o evento veio.
 *
 * `derived`  — diferença medida entre dois snapshots gravados.
 * `attested` — registro datado que já existia no repositório antes de haver
 *              snapshot. É informação de qualidade diferente, e a interface
 *              marca a diferença em vez de escondê-la.
 */
export type ChangeOrigin = 'derived' | 'attested'

/**
 * De quem é o fato.
 *
 * `provider-fact`      — a Microsoft/AWS/Google/IBM mudou algo.
 * `iamscope-editorial` — a classificação NOSSA mudou (tier, categoria,
 *                        privilégio, regra de SoD). Nenhum provedor publica isso.
 * `iamscope-process`   — fato sobre a coleta em si (início do histórico,
 *                        cobertura parcial, desconhecido).
 */
export type ChangeClassification = 'provider-fact' | 'iamscope-editorial' | 'iamscope-process'

export interface ChangeEvent {
  id: string
  date: string
  cloud: ChangeCloud
  collection: string
  collectionLabel: string
  type: ChangeType
  itemId: string | null
  itemName: string
  route?: string | null
  /** Prosa nossa, logo interface, logo traduzida — ver docs/ADR-001. */
  summary: { pt: string; en: string }
  origin: ChangeOrigin
  classification: ChangeClassification
  /** created/removed */
  tier?: string | null
  category?: string | null
  privileged?: boolean
  permissionCount?: number | null
  /** renamed / tier-changed / category-changed / permissions-changed */
  from?: string | number | boolean | null
  to?: string | number | boolean | null
  delta?: number | null
  /** sod-changed */
  sodAdded?: string[]
  sodRemoved?: string[]
  /** unknown */
  count?: number
  reason?: string
  sample?: string[]
  /** coverage-changed */
  complete?: boolean
  missing?: string[]
  /** genesis */
  counts?: Record<string, number>
  /** attested */
  source?: { label: string; path: string }
  confirmedByHuman?: boolean
}

export interface ChangelogMeta {
  historyStartsAt: string | null
  firstObservedAt: string | null
  clouds: Record<string, { snapshots: number; first: string | null; derived: number }>
  counts: {
    total: number
    derived: number
    attested: number
    byType: Record<string, number>
  }
  quarantineOpen: number
  disclosure: { pt: string; en: string }
  typeLabels: Record<string, string>
  typeLabelsEn: Record<string, string>
  cloudLabels: Record<string, string>
}

export interface Changelog {
  meta: ChangelogMeta
  events: ChangeEvent[]
}

/** Teto de eventos embutidos no HTML de uma página. Ver o cabeçalho. */
export const LIMITE_DA_PAGINA = 300

export const CHANGE_CLOUDS: ChangeCloud[] = [
  'entraid', 'azure-rbac', 'aws', 'gcp', 'google-workspace', 'ibm-cloud',
]

/** Rota do dashboard de cada nuvem — para o link "ver catálogo". */
export const CLOUD_ROUTE: Record<ChangeCloud, string> = {
  'entraid': '/entraid',
  'azure-rbac': '/azure-rbac',
  'aws': '/aws',
  'gcp': '/gcp',
  'google-workspace': '/google-workspace',
  'ibm-cloud': '/ibm-cloud',
}
