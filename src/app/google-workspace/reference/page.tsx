'use client'

import AppShell from '@/components/AppShell'
import { GWS_ROLES, GWS_SCOPES, GWS_TIER_META, GWS_SCOPE_META, GwsTier, GwsScopeSensitivity } from '@/data/googleWorkspace'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'

const TIER_ORDER: GwsTier[] = ['SuperAdmin', 'DelegatedAdmin', 'ServiceAdmin', 'SpecializedAdmin', 'ReadOnly']
const SENS_ORDER: GwsScopeSensitivity[] = ['restricted', 'sensitive', 'standard']

export default function GwsReferencePage() {
  return (
    <AppShell headerTitle="Google Workspace — Reference" headerSub="Documentação técnica das Admin Roles e OAuth Scopes">
      <div className="flex-1 overflow-y-auto">
      <div className="px-8 py-8 space-y-12 max-w-3xl">

        <Section title="Admin Tier — Classificação de Risco">
          <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
            As Admin Roles são classificadas em 5 tiers de acordo com o impacto potencial no tenant:
          </p>
          <div className="space-y-3">
            {TIER_ORDER.map((tier) => {
              const meta = GWS_TIER_META[tier]
              const count = GWS_ROLES.filter((r) => r.tier === tier).length
              return (
                <div key={tier} className="rounded-lg border p-4" style={{ backgroundColor: meta.darkBg, borderColor: meta.darkText + '30' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                      style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '50' }}>
                      {meta.short}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: meta.darkText }}>{meta.label}</span>
                    <span className="ml-auto text-[11px]" style={{ color: meta.darkText + 'aa' }}>{count} roles</span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: meta.darkText + 'cc' }}>{meta.description}</p>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="OAuth Scopes — Níveis de Sensibilidade">
          <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
            O Google classifica os escopos OAuth em 3 categorias que determinam os requisitos de verificação para apps publicados:
          </p>
          <div className="space-y-3">
            {SENS_ORDER.map((sens) => {
              const meta = GWS_SCOPE_META[sens]
              const count = GWS_SCOPES.filter((s) => s.sensitivity === sens).length
              return (
                <div key={sens} className="rounded-lg border p-4" style={{ backgroundColor: meta.darkBg, borderColor: meta.textColor + '30' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold" style={{ color: meta.darkText }}>{meta.label}</span>
                    <span className="ml-auto text-[11px]" style={{ color: meta.darkText + 'aa' }}>{count} escopos</span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: meta.darkText + 'cc' }}>{meta.description}</p>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Fontes">
          <ul className="space-y-2 text-[14px] text-gray-400">
            <li><ExtLink href="https://developers.google.com/workspace/admin/roles">Google Workspace Admin SDK — Roles</ExtLink></li>
            <li><ExtLink href="https://developers.google.com/identity/protocols/oauth2/scopes">OAuth 2.0 Scopes for Google APIs</ExtLink></li>
            <li><ExtLink href="https://support.google.com/a/answer/33325">Administrator privilege definitions</ExtLink></li>
            <li><ExtLink href="https://developers.google.com/workspace/guides/auth-overview">Authentication and authorization overview</ExtLink></li>
          </ul>
        </Section>

        <Section title="Frescor dos dados (Google Workspace)">
          <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
            Data da última verificação de cada conjunto de dados do Google Workspace contra sua fonte oficial. Veja a página{' '}
            <a href="/info" className="text-[#4ade80] hover:underline">Sobre</a> para o frescor das demais clouds.
          </p>
          <table className="w-full text-[13px] border border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Conjunto de dados</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Última verificação</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SYNC.filter((d) => d.platform === 'Google Workspace').map((d, i, arr) => (
                <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-gray-800'} hover:bg-gray-800/50 transition-colors`}>
                  <td className="px-4 py-2.5 align-top text-[13px] font-medium text-gray-300">{d.label}</td>
                  <td className="px-4 py-2.5 align-top text-[13px] text-gray-400"><code className="font-mono text-[12px]">{d.lastSynced}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

      </div>
      </div>
    </AppShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-gray-100 mb-4 pb-2 border-b border-gray-800">{title}</h2>
      {children}
    </section>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#4ade80] hover:underline inline-flex items-center gap-1">
      {children} <ExternalLink size={12} />
    </a>
  )
}
