import Link from 'next/link'
import AppShell from '@/components/AppShell'
import EntraScopeIcon from '@/components/EntraScopeIcon'
import {
  Globe, Search, BookOpen, Layers, ExternalLink, Github, Linkedin,
  ShieldCheck, ListTree, KeyRound, GitCompare, Sparkles, Shield, RefreshCw,
  ScanSearch, FileJson, ShieldAlert,
} from 'lucide-react'
import { DATA_SYNC, getLatestSync } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'

export const metadata = { title: 'Sobre' }

/**
 * Changelog do site. Manter em ordem cronológica inversa e registrar tanto
 * mudança de dado quanto de produto — é o que dá ao usuário motivo para
 * confiar (ou desconfiar) do que está vendo.
 */
const SITE_CHANGELOG: { date: string; kind: 'Dados' | 'Produto'; title: string; detail: string }[] = [
  {
    date: '2026-07-27', kind: 'Produto',
    title: 'Permissões do Azure RBAC ganham página própria',
    detail: 'Catálogo de todas as actions usadas pelas roles, com busca, filtros e página de detalhe por permissão mostrando quais roles a concedem.',
  },
  {
    date: '2026-07-27', kind: 'Dados',
    title: 'Oracle Cloud (OCI) removido do catálogo',
    detail: 'O catálogo de policies OCI era um conjunto de padrões compostos por nós, não um catálogo publicado pela Oracle. Saiu inteiro em vez de seguir no ar como dado oficial. O site passa a cobrir 6 clouds.',
  },
  {
    date: '2026-07-27', kind: 'Dados',
    title: 'Descrições do Entra ID substituídas pelas oficiais',
    detail: '130 de 132 roles tinham descrição gerada pelo nosso conversor (primeiro item do texto longo) em vez do campo oficial da Microsoft. Todas trocadas, casadas por GUID contra a permissions-reference.',
  },
  {
    date: '2026-07-27', kind: 'Dados',
    title: 'Texto próprio removido das páginas de role',
    detail: 'Os 138 blocos de contexto escritos para o site (Azure e Entra) foram apagados. As páginas passam a exibir apenas texto oficial do provedor.',
  },
  {
    date: '2026-07-27', kind: 'Produto',
    title: 'Classificação Tier 0 deixou de ser enganosa',
    detail: 'O tier de uma role é o da sua ação mais alta — então uma única ação de Control Plane entre dezenas a tornava "Tier 0". A caixa agora mostra a composição real (ex.: AI Reader = 1 de 42 ações). Afetava 25 das 65 roles Tier 0.',
  },
  {
    date: '2026-07-27', kind: 'Produto',
    title: 'Permission Scope',
    detail: 'Busca reversa de permissão nas 6 clouds, com resultado em tabela, recolher/expandir e exportação.',
  },
  {
    date: '2026-07-27', kind: 'Produto',
    title: 'Tabela de permissões padronizada',
    detail: 'Todas as páginas de detalhe passaram a usar a mesma tabela com busca, filtros por tipo, copiar e exportar.',
  },
  {
    date: '2026-07-06', kind: 'Dados',
    title: 'AWS — categorias corrigidas',
    detail: 'As 1.526 policies estavam todas marcadas como "Management" por um erro de geração. Reclassificadas a partir dos statements reais de cada policy.',
  },
  {
    date: '2026-07-01', kind: 'Dados',
    title: 'Azure RBAC — 3 roles ausentes adicionadas',
    detail: 'Container Apps SandboxGroup Contributor e Storage File Backup/Restore Contributor, conferidas contra export autoritativo.',
  },
]

export default function InfoPage() {
  return (
    <AppShell
      headerTitle="Sobre"
      headerSub="IAM Scope — proposta, plataformas e autor"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8 space-y-8">

          {/* Hero */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-8 flex flex-col items-center text-center gap-4">
            <EntraScopeIcon size={56} />
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 mb-1">IAM Scope</h1>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Referência multi-cloud de roles, políticas e permissões IAM — 6 plataformas em um único lugar
              </p>
            </div>
            <a
              href="https://iamscope.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline"
            >
              iamscope.cloud <ExternalLink size={12} />
            </a>
          </section>

          {/* Proposta */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">O que é o IAM Scope?</h2>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              O IAM Scope é uma ferramenta de referência rápida para profissionais de identidade e segurança que trabalham com múltiplas plataformas cloud. O objetivo é centralizar roles, policies e permissões das principais CSPs em um único lugar — com classificação de risco, filtros e pesquisa integrada.
            </p>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
              A documentação oficial de cada provedor é extensa e dispersa. O IAM Scope traz essa informação organizada, filtrável e pesquisável — ideal para revisões de acesso, design de roles customizadas, auditorias de segurança e análise comparativa entre nuvens.
            </p>
          </section>

          {/* Plataformas */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Plataformas cobertas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Microsoft Entra ID', color: '#0078d4', desc: '144 built-in roles + role actions + Microsoft Graph API permissions, classificados pelo Enterprise Access Model (EAM).' },
                { name: 'Azure RBAC', color: '#0078d4', desc: '926 roles built-in do Azure Resource Manager com Risk Tier e escopos de atribuição.' },
                { name: 'Google Cloud (GCP)', color: '#4285f4', desc: 'Roles predefinidas do GCP IAM por serviço, tier e categoria — Primitive, Predefined e Custom.' },
                { name: 'Google Workspace', color: '#34a853', desc: 'Admin Roles predefinidas e OAuth Scopes classificados por sensibilidade.' },
                { name: 'AWS IAM', color: '#ff9900', desc: 'Managed Policies, Service Roles e Permission Boundaries com categorização por serviço AWS.' },
                { name: 'IBM Cloud', color: '#0f62fe', desc: 'Roles de plataforma e de serviço, Account Management Services e Classic Infrastructure.' },
              ].map((p) => (
                <div key={p.name} className="flex gap-3 p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-[#dde3ec] dark:border-gray-700">
                  <span className="mt-1 shrink-0 w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 mb-0.5">{p.name}</p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Ferramentas */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Ferramentas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: <ScanSearch size={14} />, title: 'Permission Scope', href: '/permission-scope', badge: 'Beta', desc: 'Busca reversa: informe uma permissão de qualquer cloud e veja todas as roles e policies que a concedem, agrupadas por plataforma.' },
                { icon: <Sparkles size={14} />, title: 'Role Advisor', href: '/advisor', badge: 'Beta', desc: 'Busca semântica cross-platform: descreva o que você precisa fazer e receba sugestões de roles em todas as 6 plataformas.' },
                { icon: <GitCompare size={14} />, title: 'Multi-Cloud Compare', href: '/compare', badge: 'Beta', desc: 'Comparativo lado a lado das equivalências IAM entre plataformas — Global Admin, Billing, Read-Only, User Admin e mais.' },
                { icon: <FileJson size={14} />, title: 'Role Evaluator', href: '/evaluate', badge: 'Beta', desc: 'Cole o JSON de uma role de qualquer cloud e receba análise de risco: a plataforma é detectada automaticamente pela estrutura.' },
                { icon: <ShieldAlert size={14} />, title: 'SoD Analyzer', href: '/sod', badge: 'Beta', desc: 'Catálogo de regras de Segregation of Duties e verificação de conflito entre duas roles. Cobertura atual: Entra ID e Azure RBAC.' },
                { icon: <ShieldCheck size={14} />, title: 'Tier 0 Comparison', href: '/tier-comparison', desc: 'Onde está o verdadeiro Tier 0 em cada plataforma — root, org admin e as armadilhas de equivalência entre clouds.' },
              ].map((item) => (
                <Link key={item.title} href={item.href}
                  className="flex gap-3 p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-[#dde3ec] dark:border-gray-700 hover:border-[#0078d4]/50 dark:hover:border-[#85b7eb]/50 transition-colors">
                  <span className="text-[#0078d4] dark:text-[#85b7eb] mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100">{item.title}</p>
                      {item.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 bg-violet-900/30 dark:bg-violet-900/60 px-1.5 py-0.5 rounded">{item.badge}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Sobre o autor */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Sobre o autor</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-16 h-16 rounded-full bg-[#e8f1fb] dark:bg-[#0c2a47] border-2 border-[#0078d4] dark:border-[#85b7eb] flex items-center justify-center shrink-0">
                <span className="text-[22px] font-bold text-[#0078d4] dark:text-[#85b7eb]">N</span>
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Natan Tomaz</h3>
                <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  Profissional de identidade e segurança com foco em Microsoft Entra ID, Zero Trust e ambientes multi-cloud. Apaixonado por automação, governança de acesso e compartilhamento de conhecimento técnico com a comunidade.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www.linkedin.com/in/natantomazbueno/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#0a66c2] hover:bg-[#094fa1] text-white transition-colors"
                  >
                    <Linkedin size={13} /> LinkedIn
                  </a>
                  <a
                    href="https://iamscope.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink size={13} /> iamscope.cloud
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Atualizações no site */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
                <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Atualizações no site</h2>
              </div>
              <ExportButton filename="data-sync-status" data={DATA_SYNC.map((d) => ({
                dataset: d.label, platform: d.platform, lastSynced: d.lastSynced, source: d.sourceLabel, notes: d.notes ?? '',
              }))} />
            </div>

            {/* Changelog — mudanças recentes de dado e de produto */}
            <div className="mb-5">
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3">
                O que mudou recentemente, em ordem cronológica inversa.
              </p>
              <ul className="space-y-2.5">
                {SITE_CHANGELOG.map((c) => (
                  <li key={c.title} className="flex gap-3">
                    <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 shrink-0 w-20 pt-0.5">{c.date}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[12px] font-medium text-gray-700 dark:text-gray-200">{c.title}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          c.kind === 'Dados'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                        }`}>{c.kind}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mt-0.5">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#dde3ec] dark:border-gray-800">
              <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-200 mb-1">Frescor por conjunto de dados</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">
                Última verificação geral: <strong className="text-gray-700 dark:text-gray-300">{getLatestSync()}</strong>. Cada
                conjunto é sincronizado independentemente contra sua fonte oficial — consulte a data e a fonte
                específica antes de tomar decisões de acesso baseadas neste site.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 text-[10px]">Conjunto de dados</th>
                    <th className="text-left font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 text-[10px]">Última verificação</th>
                    <th className="text-left font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 text-[10px]">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA_SYNC.map((d, i) => (
                    <tr key={d.id} className={`${i === DATA_SYNC.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                      <td className="px-3 py-2 align-top text-gray-700 dark:text-gray-300 font-medium">
                        {d.label}
                        {d.notes && <p className="text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{d.notes}</p>}
                      </td>
                      <td className="px-3 py-2 align-top text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-[11px]">{d.lastSynced}</td>
                      <td className="px-3 py-2 align-top">
                        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-1">
                          {d.sourceLabel}
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fontes */}
          <section className="text-left pb-4">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Projeto comunitário independente. Dados compilados das documentações oficiais de cada provedor. Sem vínculo com Microsoft, Google, Amazon ou IBM.
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
