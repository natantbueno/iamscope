'use client'

// Paleta de comando (⌘K) — busca global que SEMPRE cruza as 6 clouds e SEMPRE
// navega até o resultado escolhido. Nunca filtra a lista da página atual: esse
// é o trabalho do InlineListFilter, embutido na linha de chips de cada tabela.
//
// As duas coisas viviam juntas numa caixa só (GlobalSearch.tsx), que decidia
// "filtro ou navego?" olhando a rota. Separadas, cada uma faz um trabalho.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ShieldAlert, CornerDownLeft } from 'lucide-react'
import { type Indice, type Resultado, pareceAction, ranquear, carregarIndice } from '@/lib/searchIndex'
import { useT } from '@/i18n/LanguageProvider'

const MAX_RESULTADOS = 8

export default function CommandPalette() {
  const t = useT()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [indice, setIndice] = useState<Indice | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [selecionado, setSelecionado] = useState(0)
  const [mac, setMac] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform))
  }, [])

  const fechar = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelecionado(0)
  }, [])

  const abrir = useCallback(() => {
    setOpen(true)
    if (!indice && !carregando) {
      setCarregando(true)
      carregarIndice()
        .then((d) => { setIndice(d); setErro(false) })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false))
    }
  }, [indice, carregando])

  // Atalho global — funciona de qualquer tela, inclusive com foco num campo de
  // filtro de tabela, porque só reage à combinação de teclas, nunca a uma
  // tecla sozinha.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) fechar()
        else abrir()
      } else if (e.key === 'Escape' && open) {
        fechar()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, abrir, fechar])

  useEffect(() => {
    if (open) {
      // O input já está no DOM neste ponto (mesmo commit) — não precisa
      // esperar frame nenhum, e esperar um rAF que a aba pode adiar
      // (throttling de segundo plano) só atrasaria o foco sem necessidade.
      inputRef.current?.focus()
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const termo = query.trim().toLowerCase()

  const resultados = useMemo<Resultado[]>(() => {
    if (!termo || !indice) return []
    return ranquear(indice, termo)
  }, [termo, indice])

  const mostrados = resultados.slice(0, MAX_RESULTADOS)

  useEffect(() => { setSelecionado(0) }, [termo])

  const irParaResultado = useCallback((r: Resultado) => {
    if (!indice) return
    const base = indice.clouds[r.cloud]?.base
    if (!base) return
    router.push(`${base}${r.slug}/`)
    fechar()
  }, [indice, router, fechar])

  const verTodos = useCallback(() => {
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    fechar()
  }, [query, router, fechar])

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((i) => Math.min(i + 1, mostrados.length)) // +1 = linha "ver todos"
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selecionado < mostrados.length) irParaResultado(mostrados[selecionado])
      else if (termo) verTodos()
    }
  }

  const kbd = mac ? '⌘K' : 'Ctrl K'

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-1.5 sm:gap-2 h-8 pl-2.5 pr-2 sm:pl-3 sm:pr-2.5 rounded-full border border-line-strong bg-surface-alt text-fg-subtle hover:text-fg hover:border-line-strong text-tiny transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={t('search.paletteTrigger')}
      >
        <Search size={13} />
        <span className="hidden sm:inline">{t('search.paletteTrigger')}</span>
        <kbd className="hidden sm:inline-flex items-center font-mono text-micro border border-line-strong rounded bg-surface px-1.5 py-0.5 text-fg-subtle">
          {kbd}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-overlay flex items-start justify-center px-4 pt-[12vh] bg-black/60"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) fechar() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('search.paletteTrigger')}
            className="w-full max-w-lg bg-surface border border-line-strong rounded-lg shadow-dropdown overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-line">
              <Search size={16} className="text-fg-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t('search.palettePlaceholder')}
                className="flex-1 min-w-0 bg-transparent text-body text-fg placeholder-fg-subtle focus:outline-none"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {!termo && (
                <p className="px-4 py-6 text-tiny text-fg-subtle text-center">{t('search.paletteHint')}</p>
              )}

              {termo && carregando && (
                <p className="px-4 py-6 text-tiny text-fg-subtle text-center">{t('state.loading')}</p>
              )}

              {termo && erro && (
                <p className="px-4 py-6 text-tiny text-danger text-center">{t('search.paletteError')}</p>
              )}

              {termo && !carregando && !erro && indice && (
                <>
                  {mostrados.length === 0 && (
                    <p className="px-4 py-6 text-tiny text-fg-subtle text-center">
                      {t('search.noResults').replace('{q}', query)}
                    </p>
                  )}

                  <ul>
                    {mostrados.map((r, i) => {
                      const c = indice.clouds[r.cloud]
                      const tier = indice.tiers[r.cloud]?.[r.tier]
                      const novoGrupo = i === 0 || mostrados[i - 1].cloud !== r.cloud
                      return (
                        <li key={`${r.cloud}-${r.slug}`}>
                          {novoGrupo && (
                            <p className="px-4 pt-2.5 pb-1 text-micro font-bold uppercase tracking-wider text-fg-subtle">
                              {c?.label ?? r.cloud}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => irParaResultado(r)}
                            onMouseEnter={() => setSelecionado(i)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                              selecionado === i ? 'bg-surface-alt' : ''
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c?.color }} />
                            <span className="min-w-0 flex-1 truncate text-tiny text-fg">{r.name}</span>
                            {r.privileged && <ShieldAlert size={12} className="text-danger shrink-0" />}
                            {tier && (
                              <span className="shrink-0 text-micro font-semibold px-1.5 py-0.5 rounded-full border"
                                style={{ color: tier.color, borderColor: tier.color + '50', background: tier.color + '18' }}>
                                {tier.label}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>

                  {pareceAction(termo) && (
                    <p className="px-4 py-2 text-micro text-fg-subtle border-t border-line">
                      {t('search.looksLikeAction')}{' '}
                      <a href={`/permission-scope?q=${encodeURIComponent(query.trim())}`}
                        className="text-accent underline" onClick={fechar}>
                        Permission Scope
                      </a>.
                    </p>
                  )}

                  {resultados.length > 0 && (
                    <button
                      type="button"
                      onClick={verTodos}
                      onMouseEnter={() => setSelecionado(mostrados.length)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-tiny border-t border-line transition-colors ${
                        selecionado === mostrados.length ? 'bg-surface-alt text-fg' : 'text-fg-muted'
                      }`}
                    >
                      <span>{t('search.paletteViewAll').replace('{n}', String(resultados.length))}</span>
                      <CornerDownLeft size={12} className="shrink-0" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
