'use client'

import { useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import ReferenceIndex from '@/components/ReferenceIndex'
import { ExternalLink, Info, Server, Network, Package, Building2, ShoppingCart, ShieldCheck, Search } from 'lucide-react'
import {
  IBM_CLASSIC_CATEGORIES, IBM_CLASSIC_NOTES, IBM_CLASSIC_MODEL_NOTE,
  IBM_CLASSIC_PERMISSIONS, IBM_CLASSIC_PERMISSIONS_COUNT,
  IBM_CLASSIC_PERMISSIONS_AVAILABLE, IBM_CLASSIC_PERMISSIONS_NOTE, IBM_SOURCES,
} from '@/data/ibmCloud'
import { useT } from '@/i18n/LanguageProvider'

/**
 * Infraestrutura clássica do IBM Cloud.
 *
 * POR QUE É UMA PÁGINA SEPARADA
 *   O IBM Cloud tem dois modelos de acesso que não se parecem. O IAM tem 7
 *   roles. O clássico — herdado da SoftLayer — não tem role nenhuma: o acesso é
 *   concedido por permissão individual, em seis categorias, mais acesso por
 *   dispositivo e por VPN subnet.
 *
 *   Misturar os dois numa lista de "roles" foi exatamente o erro do dataset
 *   anterior, que inventou 83 roles clássicas que a IBM não publica. Separar em
 *   página própria não é organização: é o que impede a confusão de voltar.
 *
 * A LACUNA QUE ESTA PÁGINA DECLARAVA
 *   Até 04/08 esta tela dizia que a lista enumerada não tinha sido coletada,
 *   porque a página oficial é renderizada no cliente. O doc-fonte migrou para
 *   ibm-cloud-docs/iam e as seis tabelas estão lá em markdown: as 71 permissões
 *   entraram em 05/08, verbatim. A mesma coleta corrigiu a estrutura — eram
 *   quatro categorias declaradas contra as seis reais.
 */

const ICONE: Record<string, React.ReactNode> = {
  administrative: <Building2 size={16} />,
  devices: <Server size={16} />,
  network: <Network size={16} />,
  sales: <ShoppingCart size={16} />,
  security: <ShieldCheck size={16} />,
  software: <Package size={16} />,
}

export default function IbmClassicClient() {
  const t = useT()
  const fonteClassica = IBM_SOURCES.find((s) => s.id === 'mngclassicinfra')

  const [aba, setAba] = useState<string>(IBM_CLASSIC_CATEGORIES[0]?.id ?? '')
  const [busca, setBusca] = useState('')

  const porCategoria = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of IBM_CLASSIC_PERMISSIONS) m[p.category] = (m[p.category] ?? 0) + 1
    return m
  }, [])

  const termo = busca.trim().toLowerCase()

  /* A busca atravessa as abas de propósito: quem procura 'VPN' não sabe de
     antemão que ela mora em Network. Sem termo, vale a aba selecionada. */
  const visiveis = useMemo(() => {
    if (termo) {
      return IBM_CLASSIC_PERMISSIONS.filter(
        (p) => p.name.toLowerCase().includes(termo) || p.description.toLowerCase().includes(termo),
      )
    }
    return IBM_CLASSIC_PERMISSIONS.filter((p) => p.category === aba)
  }, [termo, aba])

  const nomeCategoria = (id: string) => IBM_CLASSIC_CATEGORIES.find((c) => c.id === id)?.name ?? id

  return (
    <AppShell
      headerTitle="IBM Cloud — Classic Infrastructure"
      headerSub={t('ibmc.headerSub')}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-4xl space-y-10">

          {/* O ponto que a página existe para fazer */}
          <section className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-2.5">
              <Info size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-body font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  {t('ibmc.noRolesTitle')}
                </p>
                <p className="text-tiny text-amber-700 dark:text-amber-400 leading-relaxed">
                  {IBM_CLASSIC_MODEL_NOTE}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sub font-semibold text-fg mb-1">{t('ibmc.catTitle')}</h2>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('ibmc.catIntro')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {IBM_CLASSIC_CATEGORIES.map((c) => (
                <div key={c.id} className="rounded-lg border border-line-strong bg-surface-alt p-4">
                  <div className="flex items-center gap-2 mb-1.5 text-csp-ibm-onDark">
                    {ICONE[c.id]}
                    <span className="text-body font-semibold">{c.name}</span>
                    <span className="ml-auto text-tiny font-mono text-fg-subtle">{porCategoria[c.id] ?? 0}</span>
                  </div>
                  <p className="text-tiny text-fg-muted leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* A lista enumerada — o que esta página não tinha até 05/08 */}
          {IBM_CLASSIC_PERMISSIONS_AVAILABLE && (
            <section>
              <h2 className="text-sub font-semibold text-fg mb-1">
                {t('ibmc.permsTitle').replace('{n}', String(IBM_CLASSIC_PERMISSIONS_COUNT))}
              </h2>
              <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('ibmc.permsIntro')}</p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex flex-wrap gap-1">
                  {IBM_CLASSIC_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setAba(c.id); setBusca('') }}
                      className={`px-2.5 py-1 rounded-md text-tiny font-medium border transition-colors ${
                        !termo && aba === c.id
                          ? 'border-csp-ibm-onDark text-csp-ibm-onDark bg-surface-alt'
                          : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                      }`}
                    >
                      {c.name}
                      <span className="ml-1.5 font-mono text-fg-subtle">{porCategoria[c.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-subtle" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={t('ibmc.searchPlaceholder')}
                    className="pl-7 pr-2 py-1 w-56 rounded-md border border-line bg-surface text-tiny text-fg placeholder:text-fg-subtle focus:outline-none focus:border-line-strong"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-line-strong overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-3 py-2 text-tiny font-semibold text-fg-muted w-1/3">{t('ibmc.colPerm')}</th>
                      <th className="px-3 py-2 text-tiny font-semibold text-fg-muted">{t('ibmc.colDesc')}</th>
                      {termo ? <th className="px-3 py-2 text-tiny font-semibold text-fg-muted w-32">{t('ibmc.colCat')}</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((p) => (
                      <tr key={`${p.category}/${p.name}`} className="border-t border-line align-top">
                        <td className="px-3 py-2.5 text-tiny font-medium text-fg">{p.name}</td>
                        <td className="px-3 py-2.5 text-tiny text-fg-muted leading-relaxed">{p.description}</td>
                        {termo ? <td className="px-3 py-2.5 text-tiny text-fg-subtle">{nomeCategoria(p.category)}</td> : null}
                      </tr>
                    ))}
                    {visiveis.length === 0 && (
                      <tr className="border-t border-line">
                        <td colSpan={3} className="px-3 py-6 text-tiny text-fg-subtle text-center">
                          {t('ibmc.noResults')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-tiny text-fg-subtle mt-2 leading-relaxed">{IBM_CLASSIC_PERMISSIONS_NOTE}</p>
            </section>
          )}

          <section>
            <h2 className="text-sub font-semibold text-fg mb-1">{t('ibmc.rulesTitle')}</h2>
            <p className="text-note text-fg-subtle leading-relaxed mb-4">{t('ibmc.rulesIntro')}</p>
            <ul className="space-y-2">
              {IBM_CLASSIC_NOTES.map((n, i) => (
                <li key={i} className="flex gap-2.5 text-note text-fg-muted leading-relaxed">
                  <span className="text-fg-subtle shrink-0 mt-1">▸</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sub font-semibold text-fg mb-4 pb-2 border-b border-line">{t('data.sources')}</h2>
            <ul className="space-y-2 text-note text-fg-subtle">
              {IBM_SOURCES.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-csp-ibm-onDark hover:underline inline-flex items-center gap-1">
                    {s.title} <ExternalLink size={12} />
                  </a>
                  {s.note && <p className="text-tiny text-fg-subtle mt-0.5">{s.note}</p>}
                </li>
              ))}
            </ul>
          </section>

          {fonteClassica?.docLastUpdated && (
            <p className="text-tiny text-fg-subtle">
              {t('ibmc.docDate').replace('{d}', fonteClassica.docLastUpdated)}
            </p>
          )}

          <ReferenceIndex cloud="ibmCloud" />

        </div>
      </div>
    </AppShell>
  )
}
