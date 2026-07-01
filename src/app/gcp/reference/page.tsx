import AppShell from '@/components/AppShell'
import { GCP_ROLES, GCP_TIER_META, GcpTier } from '@/data/gcp'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'

const TIERS: GcpTier[] = ['ProjectOwner', 'Admin', 'Editor', 'Operator', 'Developer', 'Viewer', 'Specialized']

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', BigQuery: '#4285f4',
  Kubernetes: '#326ce5', Database: '#7c3aed', Networking: '#0369a1',
  Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  AI: '#8b5cf6', Analytics: '#14b8a6', Observability: '#ca8a04',
  Billing: '#6b7280', Management: '#475569',
}

const GCP_DOCS = [
  { title: 'Understanding IAM Roles', url: 'https://cloud.google.com/iam/docs/understanding-roles' },
  { title: 'Predefined Roles Reference', url: 'https://cloud.google.com/iam/docs/predefined-roles' },
  { title: 'Using IAM Securely', url: 'https://cloud.google.com/iam/docs/using-iam-securely' },
  { title: 'IAM Conditions', url: 'https://cloud.google.com/iam/docs/conditions-overview' },
  { title: 'Service Account Best Practices', url: 'https://cloud.google.com/iam/docs/best-practices-for-securing-service-accounts' },
  { title: 'Resource Hierarchy', url: 'https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy' },
  { title: 'Org Policy Service', url: 'https://cloud.google.com/resource-manager/docs/organization-policy/overview' },
  { title: 'VPC Service Controls', url: 'https://cloud.google.com/vpc-service-controls/docs/overview' },
]

export default function GcpReference() {
  return (
    <AppShell
      headerTitle="GCP IAM Reference"
      headerSub="Guia de tiers, escopos e boas práticas"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-6">

          {/* Tier reference table */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Tiers de Role</h2>
            <div className="space-y-3">
              {TIERS.map(t => {
                const meta = GCP_TIER_META[t]
                const count = GCP_ROLES.filter(r => r.tier === t).length
                return (
                  <div key={t} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        <Link href={`/gcp/roles?filter=${t}`}
                          className="text-[10px] text-gray-400 hover:text-[#4285f4] transition-colors">{count} roles →</Link>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{meta.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scope reference */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Escopos de Atribuição</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { scope: 'org', label: 'Organização', desc: 'Atribuição herdada por todas as pastas, projetos e recursos. Use apenas para roles de auditoria e gestão.', color: '#dc2626' },
                { scope: 'folder', label: 'Pasta (Folder)', desc: 'Herdada por todos os projetos dentro da pasta. Útil para estruturas departamentais.', color: '#ea580c' },
                { scope: 'project', label: 'Projeto', desc: 'Escopo mais comum. Aplica-se a todos os recursos do projeto. Balanceia controle e praticidade.', color: '#4285f4' },
                { scope: 'resource', label: 'Recurso', desc: 'Menor escopo possível — um bucket, tópico ou instância específica. Princípio do menor privilégio.', color: '#16a34a' },
              ].map(s => (
                <div key={s.scope} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{s.label}</span>
                    <span className="text-[10px] font-mono text-gray-400">{s.scope}</span>
                  </div>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                  <div className="mt-1 text-[11px] text-gray-400">
                    {GCP_ROLES.filter(r => r.scope === s.scope).length} roles
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Categorias por Serviço</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(CAT_COLORS).map(([cat, color]) => {
                const count = GCP_ROLES.filter(r => r.category === cat).length
                if (!count) return null
                return (
                  <Link key={cat} href={`/gcp/roles?category=${cat}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-current transition-colors group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] text-gray-600 dark:text-gray-400 group-hover:font-medium">{cat}</span>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color }}>{count}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Best practices */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Boas Práticas de IAM no GCP</h2>
            <div className="space-y-3">
              {[
                { title: 'Princípio do menor privilégio', body: 'Prefira roles de menor escopo (Viewer, User, Invoker) a roles amplas (Admin, Editor). Atribua no nível de recurso sempre que possível.' },
                { title: 'Evite roles primitivas em produção', body: 'roles/owner, roles/editor e roles/viewer são muito amplas. Substitua por predefined roles específicas do serviço.' },
                { title: 'Use Service Accounts com cuidado', body: 'Service accounts não devem ter roles de Owner/Editor. Use roles mínimas e desative chaves de SA quando possível — prefira Workload Identity.' },
                { title: 'Monitore com Cloud Audit Logs', body: 'Ative Admin Activity, Data Access e System Event logs. Use Security Command Center para visibilidade de IAM em toda a org.' },
                { title: 'Implemente VPC Service Controls', body: 'Para dados sensíveis, crie perímetros de serviço que impeçam exfiltração mesmo com IAM mal configurado.' },
                { title: 'Rotacione credenciais regularmente', body: 'Use Workload Identity Federation em vez de chaves de SA. Se usar chaves, rotacione via Cloud KMS e monitore acesso via Cloud Monitoring.' },
              ].map((p, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="w-5 h-5 rounded-full bg-[#4285f4]/10 text-[#4285f4] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{p.title}</div>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* External docs */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">Documentação Oficial</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {GCP_DOCS.map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#4285f4]/50 hover:bg-[#4285f4]/5 transition-all group">
                  <ExternalLink size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-[#4285f4] shrink-0" />
                  <span className="text-[12px] text-gray-600 dark:text-gray-400 group-hover:text-[#4285f4] transition-colors">{d.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Frescor dos dados */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">Frescor dos dados (GCP IAM)</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Data da última verificação de cada conjunto de dados GCP contra sua fonte oficial. Veja a página{' '}
              <Link href="/info" className="text-[#4285f4] hover:underline">Sobre</Link> para o frescor das demais clouds.
            </p>
            <table className="w-full text-[13px] border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Conjunto de dados</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Última verificação</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter(d => d.platform === 'GCP IAM').map((d, i, arr) => (
                  <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                    <td className="px-4 py-2.5 align-top text-[13px] font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2.5 align-top text-[13px] text-gray-500 dark:text-gray-400"><code className="font-mono text-[12px]">{d.lastSynced}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
