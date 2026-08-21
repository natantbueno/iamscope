// ── Universo de actions de IAM da AWS ───────────────────────────────────────
//
// O QUE ESTE MÓDULO EXISTE PARA RESPONDER
//   O índice do Permission Scope conhece só o que as managed policies citam.
//   Quando alguém procura uma action que existe na AWS mas nenhuma policy
//   gerenciada concede, a página respondia "nenhuma permissão encontrada" — e
//   isso se lê como "essa action não existe". A resposta certa é outra, e é
//   mais útil: **existe, e nenhuma policy gerenciada a concede** — ou seja, só
//   uma policy inline ou custom pode ter dado.
//
// O ARQUIVO É OPCIONAL, DE PROPÓSITO
//   `public/aws-actions-universe.json` é gerado por
//   scripts/fetch-aws-actions-universe.js, que só roda com acesso ao host da
//   AWS. Enquanto o arquivo não existir, tudo aqui devolve `null` e a página
//   se comporta exatamente como antes. Nada quebra por ausência.

interface AwsUniverseFile {
  generatedAt: string
  serviceCount: number
  actionCount: number
  /** prefixo do serviço -> nomes de operação. Ver o cabeçalho do coletor. */
  services: Record<string, string[]>
}

interface AwsUniverse {
  generatedAt: string
  actionCount: number
  byService: Map<string, Set<string>>
}

let _cache: AwsUniverse | null = null
let _inflight: Promise<AwsUniverse | null> | null = null
/** Já tentamos e não existe. Evita repetir o 404 a cada busca. */
let _ausente = false

/** null = não carregado (ou inexistente). Nunca dispara rede. */
export function getAwsUniverseSync(): AwsUniverse | null {
  return _cache
}

export async function loadAwsUniverse(): Promise<AwsUniverse | null> {
  if (_cache) return _cache
  if (_ausente) return null
  if (_inflight) return _inflight

  _inflight = (async () => {
    try {
      const res = await fetch('/aws-actions-universe.json')
      if (!res.ok) { _ausente = true; return null }
      const data = (await res.json()) as AwsUniverseFile
      const byService = new Map<string, Set<string>>()
      for (const [svc, ops] of Object.entries(data.services ?? {})) {
        byService.set(svc.toLowerCase(), new Set(ops.map((o) => o.toLowerCase())))
      }
      _cache = { generatedAt: data.generatedAt, actionCount: data.actionCount, byService }
      return _cache
    } catch {
      _ausente = true
      return null
    } finally {
      _inflight = null
    }
  })()

  return _inflight
}

/** `s3:GetObject` — prefixo de serviço, dois pontos, operação. Sem wildcard. */
export function looksLikeAwsAction(query: string): boolean {
  return /^[a-z][a-z0-9-]*:[a-z][a-z0-9]*$/i.test(query.trim())
}

/**
 * A action existe no catálogo oficial da AWS?
 *
 * @returns true/false quando o universo está carregado; `null` quando não há
 *   arquivo — e aí a interface não deve afirmar nada, nem que existe nem que
 *   não existe.
 */
export function isKnownAwsAction(action: string): boolean | null {
  const u = _cache
  if (!u) return null
  const i = action.indexOf(':')
  if (i <= 0) return false
  const svc = action.slice(0, i).toLowerCase()
  const op = action.slice(i + 1).toLowerCase()
  return u.byService.get(svc)?.has(op) ?? false
}
