import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { ShieldAlert, GitCompare } from 'lucide-react'
import { CloudId, CLOUD_META, CLOUD_ORDER, Equivalence, getCloudUrl } from '@/data/compare/types'
import equivalencesData from '@/data/compare/equivalences.json'
import tiersData from '@/data/compare/tiers.json'
import ExportButton from '@/components/ExportButton'

const equivalences = equivalencesData as Equivalence[]
const tier0 = tiersData.find(t => t.level === 0)!
const globalAdmin = equivalences.find(eq => eq.id === 'global-admin')!

// A verdadeira primitiva Tier 0 de cada cloud — nem sempre é o role "administrativo" mais óbvio.
const TIER0_NOTES: Partial<Record<CloudId, string>> = {
  entraId: 'Global Administrator é a role de directory mais alta, mas o verdadeiro Tier 0 do tenant inclui também o Company Administrator implícito e contas de emergency access (break-glass) fora do Conditional Access.',
  aws: 'O root user da conta é o Tier 0 absoluto — não pode ser restringido por SCP, permission boundary ou identity policy. OrganizationAccountAccessRole é o Tier 0 operacional de qualquer conta membro, criado automaticamente pela AWS Organizations e frequentemente mais amplo que a policy AdministratorAccess.',
  gcp: 'Organization Admin opera no nível da hierarquia de recursos (organização), enquanto Project Owner — mais comumente citado — é limitado a um único projeto. Confundir os dois subestima o blast radius real de uma organização GCP.',
  azureRbac: 'Owner no nível de Management Group root é equivalente a controle total de todas as subscriptions da tenant — escopo maior que Owner em uma subscription isolada.',
  oci: 'Tenancy Administrator tem "manage all-resources in tenancy" — equivalente ao root de outras clouds, sem limite de compartment.',
  ibmCloud: 'Administrator (All Services) no nível de conta é o Tier 0 — trusted profiles com essa role herdada por workloads automatizados ampliam o blast radius além de identidades humanas.',
  googleWorkspace: 'Super Admin controla identidade e dados de todos os usuários do domínio — é o Tier 0 do workspace, mas não necessariamente do GCP (são planos de controle separados que compartilham apenas a conta Google).',
}

export default function TierComparisonPage() {
  return (
    <AppShell
      headerTitle="Comparação de Tiers entre Clouds"
      headerSub="Onde está o verdadeiro Tier 0 em cada plataforma — root, org admin e as armadilhas de equivalência"
      headerActions={
        <div className="flex items-center gap-3">
          <Link href="/compare" className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 hover:text-[#0078d4]">
            <GitCompare size={14} />
            <span>Ver comparativo completo (todos os tiers)</span>
          </Link>
          <ExportButton
            filename="tier0-comparison"
            data={CLOUD_ORDER.map((cloud) => {
              const entry = globalAdmin.clouds[cloud]
              return {
                cloud: CLOUD_META[cloud].label,
                tier0Role: entry?.role ?? '',
                scope: SCOPE_LABEL[cloud] ?? '',
                note: TIER0_NOTES[cloud] ?? '',
              }
            })}
          />
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-4xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title="Por que uma página dedicada a Tier 0">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              O modelo <strong className="text-gray-800 dark:text-gray-200">Enterprise Access Model (EAM)</strong> usado
              neste site classifica Tier 0 como controle irrestrito sobre identidade, billing e todos os recursos —
              comprometimento leva a tomada total do tenant ou conta. Essa definição é direta no Entra ID, mas em
              multi-cloud é comum equiparar a role administrativa mais <em>visível</em> de cada plataforma (ex.:{' '}
              <code className="font-mono text-[11px]">AdministratorAccess</code> na AWS, <code className="font-mono text-[11px]">Project Owner</code> no
              GCP) ao Tier 0 real — o que subestima o blast radius verdadeiro.
            </p>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Esta página isola especificamente a equivalência de Tier 0 entre as 7 clouds do catálogo, com a
              primitiva de acesso <strong className="text-gray-800 dark:text-gray-200">correta</strong> — não apenas a
              mais nomeada — para cada uma.
            </p>
          </Section>

          <Divider />

          {/* ── Cards per cloud ──────────────────────────── */}
          <Section id="cards" title="Tier 0 por cloud">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CLOUD_ORDER.map(cloud => {
                const entry = globalAdmin.clouds[cloud]
                if (!entry) return null
                const meta = CLOUD_META[cloud]
                const note = TIER0_NOTES[cloud]
                return (
                  <div key={cloud} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                    {entry.slug ? (
                      <Link href={getCloudUrl(cloud, entry.slug)} className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 hover:underline">
                        {entry.role}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-100">{entry.role}</span>
                    )}
                    {note && (
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2">{note}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>

          <Divider />

          {/* ── Comparison table ─────────────────────────── */}
          <Section id="table" title="Tabela de equivalência">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>Cloud</Th>
                    <Th>Primitiva Tier 0</Th>
                    <Th>Escopo</Th>
                    <Th>Risco</Th>
                  </tr>
                </thead>
                <tbody>
                  {CLOUD_ORDER.map((cloud, i) => {
                    const entry = globalAdmin.clouds[cloud]
                    if (!entry) return null
                    const meta = CLOUD_META[cloud]
                    return (
                      <TR key={cloud} last={i === CLOUD_ORDER.length - 1}>
                        <TD bold>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                            {meta.label}
                          </span>
                        </TD>
                        <TD>
                          {entry.slug ? (
                            <Link href={getCloudUrl(cloud, entry.slug)} className="text-[#0078d4] dark:text-[#85b7eb] hover:underline">{entry.role}</Link>
                          ) : entry.role}
                        </TD>
                        <TD>{SCOPE_LABEL[cloud]}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-1 text-red-500">
                            <ShieldAlert size={12} /> Critical
                          </span>
                        </TD>
                      </TR>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Divider />

          {/* ── Tier model recap ─────────────────────────── */}
          <Section id="model" title="Modelo de Tiers (EAM)">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              O restante do modelo de 3 tiers (Tier 1 — Management Plane e Tier 2 — Data/Workload Plane) aplica-se
              igualmente a todas as 7 clouds e está disponível na íntegra no{' '}
              <Link href="/compare" className="text-[#0078d4] dark:text-[#85b7eb] hover:underline">comparativo multi-cloud completo</Link>,
              que cobre todas as funções catalogadas (billing admin, security admin, privileged role admin,
              conditional access admin, entre outras).
            </p>
            <div className="p-3 rounded-lg" style={{ background: tier0.bg, borderLeft: `3px solid ${tier0.color}` }}>
              <p className="text-[12px] font-semibold" style={{ color: tier0.color }}>{tier0.name}</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{tier0.description}</p>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  )
}

const SCOPE_LABEL: Partial<Record<CloudId, string>> = {
  entraId: 'Tenant (directory)',
  azureRbac: 'Management Group / Subscription',
  aws: 'Conta (root: além de qualquer política)',
  gcp: 'Organização',
  oci: 'Tenancy',
  ibmCloud: 'Conta',
  googleWorkspace: 'Domínio (Workspace)',
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-[16px] font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-gray-200 dark:border-gray-800" />
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">
      {children}
    </th>
  )
}

function TR({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <tr className={`${last ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
      {children}
    </tr>
  )
}

function TD({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-4 py-2.5 align-top text-[13px] ${bold ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
      {children}
    </td>
  )
}
