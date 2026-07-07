import AppShell from '@/components/AppShell'
import { AWS_POLICIES, AWS_TIER_META, AwsTier } from '@/data/aws'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'

const TIERS: AwsTier[] = ['FullAccess', 'PowerUser', 'ReadOnly', 'Operator', 'Specialized']

const CAT_COLORS: Record<string, string> = {
  IAM: '#dc2626', Compute: '#0891b2', Storage: '#16a34a', Database: '#7c3aed',
  Networking: '#0369a1', Security: '#b91c1c', DevOps: '#ea580c', Serverless: '#f59e0b',
  Containers: '#326ce5', AI: '#8b5cf6', Analytics: '#14b8a6', Management: '#6b7280',
  IoT: '#059669', Billing: '#475569', Messaging: '#d97706',
}

const AWS_DOCS = [
  { title: 'AWS Managed Policies Reference', url: 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/about-managed-policy-reference.html' },
  { title: 'IAM Best Practices', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html' },
  { title: 'Understanding Policies', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html' },
  { title: 'IAM Access Analyzer', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html' },
  { title: 'Service Control Policies (SCPs)', url: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
  { title: 'IAM Identity Center (SSO)', url: 'https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html' },
  { title: 'Permission Boundaries', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html' },
  { title: 'Attribute-Based Access Control', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html' },
]

export default function AwsReference() {
  return (
    <AppShell headerTitle="AWS IAM Reference" headerSub="Tiers, tipos de policy e boas práticas"
      headerActions={<ExportButton filename="aws-data-sync" label="Exportar frescor dos dados"
        data={DATA_SYNC.filter(d => d.platform === 'AWS IAM').map((d) => ({ dataset: d.label, lastSynced: d.lastSynced, source: d.sourceLabel }))} />}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl space-y-6">

          {/* Tier reference */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Tiers de Acesso</h2>
            <div className="space-y-3">
              {TIERS.map(t => {
                const meta = AWS_TIER_META[t]
                const count = AWS_POLICIES.filter(p => p.tier === t).length
                return (
                  <div key={t} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        <Link href={`/aws/policies?filter=${t}`} className="text-[10px] text-gray-400 hover:text-[#ff9900] transition-colors">{count} policies →</Link>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{meta.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Policy types */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Tipos de Policy</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: 'managed', label: 'AWS Managed', color: '#0891b2', desc: 'Criadas e mantidas pela AWS. Atualizadas automaticamente quando novos serviços são lançados. Boa base, mas geralmente mais amplas que o necessário.' },
                { type: 'service-role', label: 'Service Role', color: '#7c3aed', desc: 'Assumidas por serviços AWS (Lambda, ECS, EC2). Permitem que o serviço acesse outros recursos em seu nome com o princípio do menor privilégio.' },
                { type: 'permission-set', label: 'Permission Set', color: '#16a34a', desc: 'Usadas via IAM Identity Center para acesso federado em múltiplas contas. Combinam managed policies para uso em SSO enterprise.' },
                { type: 'permission-boundary', label: 'Permission Boundary', color: '#dc2626', desc: 'Policy customer-managed que define o teto máximo de permissões de uma identidade. A permissão efetiva é a interseção entre a identity policy e a boundary — nunca a união.' },
              ].map(t => (
                <div key={t.type} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span className="text-[12px] font-semibold" style={{ color: t.color }}>{t.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{t.desc}</p>
                  <div className="mt-1 text-[11px] text-gray-400">
                    {AWS_POLICIES.filter(p => p.type === t.type).length} policies
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permission Boundaries — deep dive */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">Permission Boundaries — como funciona a avaliação</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              Uma permission boundary não concede permissão por si só — ela define o <strong className="text-gray-700 dark:text-gray-300">teto</strong> do
              que a identity policy pode conceder. A AWS calcula a permissão efetiva como a <strong className="text-gray-700 dark:text-gray-300">interseção</strong> entre
              as duas, nunca a soma:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
              <div className="flex-1 p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Identity Policy</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">Ex.: <code className="font-mono">s3:*</code>, <code className="font-mono">ec2:*</code></p>
              </div>
              <div className="flex items-center justify-center text-[16px] font-bold text-gray-400">∩</div>
              <div className="flex-1 p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Permission Boundary</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">Ex.: <code className="font-mono">s3:*</code>, deny <code className="font-mono">iam:*</code></p>
              </div>
              <div className="flex items-center justify-center text-[16px] font-bold text-gray-400">=</div>
              <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-center">
                <p className="text-[10px] text-red-500 uppercase tracking-wider mb-1">Efetivo</p>
                <p className="text-[11px] text-red-700 dark:text-red-400">Só <code className="font-mono">s3:*</code> — <code className="font-mono">ec2:*</code> é cortado pela boundary</p>
              </div>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Ao contrário das managed policies (ARNs oficiais <code className="font-mono text-[11px]">arn:aws:iam::aws:policy/...</code>),
              boundaries são <strong className="text-gray-700 dark:text-gray-300">customer-managed</strong> — não existe um catálogo nomeado publicado
              pela AWS. Os exemplos catalogados neste site (
              <Link href="/aws/policies?filter=all&category=IAM" className="text-[#ff9900] hover:underline">ver policies IAM</Link>
              ) seguem os padrões oficiais documentados no AWS Security Blog e no AWS Prescriptive Guidance para delegação de administração de IAM.
            </p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
              Para o mecanismo equivalente a nível de conta/organização (em vez de por identidade), veja{' '}
              <Link href="/aws/scp-vs-identity-policies" className="text-[#ff9900] hover:underline">SCP vs Identity Policies</Link>.
            </p>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Categorias por Serviço</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CAT_COLORS).map(([cat, color]) => {
                const count = AWS_POLICIES.filter(p => p.category === cat).length
                if (!count) return null
                return (
                  <Link key={cat} href={`/aws/policies?category=${cat}`}
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
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-4">Boas Práticas AWS IAM</h2>
            <div className="space-y-3">
              {[
                { title: 'Nunca use AdministratorAccess em produção', body: 'Substitua por policies granulares por serviço. Use SCPs na org para limitar o blast radius e evitar escalação de privilégios.' },
                { title: 'Prefira Roles a usuários IAM com chaves', body: 'IAM Roles não têm credenciais de longo prazo. Use Instance Profiles para EC2, Execution Roles para Lambda e ECS.' },
                { title: 'Use IAM Identity Center para acesso humano', body: 'Centralize acesso multi-conta via SSO com Permission Sets. Integre com IdP corporativo (Okta, Azure AD) via SAML/OIDC.' },
                { title: 'Implemente Permission Boundaries', body: 'Limite as permissões máximas que uma role pode conceder. Essencial em ambientes de multi-tenant e delegação de administração.' },
                { title: 'Revise com IAM Access Analyzer', body: 'Identifica recursos acessíveis externamente e gera policies de menor privilégio com base em CloudTrail logs de 90 dias.' },
                { title: 'Aplique MFA em todas as contas humanas', body: 'Enforce MFA via SCP na org. Para acesso programático, prefira roles temporárias via STS AssumeRole.' },
              ].map((p, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="w-5 h-5 rounded-full bg-[#ff9900]/10 text-[#ff9900] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{p.title}</div>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Docs */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3">Documentação Oficial</h2>
            <div className="grid grid-cols-2 gap-2">
              {AWS_DOCS.map(d => (
                <a key={d.url} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#ff9900]/50 hover:bg-[#ff9900]/5 transition-all group">
                  <ExternalLink size={12} className="text-gray-300 dark:text-gray-600 group-hover:text-[#ff9900] shrink-0" />
                  <span className="text-[12px] text-gray-600 dark:text-gray-400 group-hover:text-[#ff9900] transition-colors">{d.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Frescor dos dados */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">Frescor dos dados (AWS IAM)</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Data da última verificação de cada conjunto de dados AWS contra sua fonte oficial. Veja a página{' '}
              <Link href="/info" className="text-[#ff9900] hover:underline">Sobre</Link> para o frescor das demais clouds.
            </p>
            <table className="w-full text-[13px] border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Conjunto de dados</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Última verificação</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter(d => d.platform === 'AWS IAM').map((d, i, arr) => (
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
