import AppShell from '@/components/AppShell'
import { IBM_TIER_META, IbmTier } from '@/data/ibmCloud'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'

const TIERS: IbmTier[] = ['AccountAdmin', 'PlatformAdmin', 'PlatformOperator', 'ServiceManager', 'ReadOnly']

export default function IbmReferenceePage() {
  return (
    <AppShell
      headerTitle="IBM Cloud IAM — Reference"
      headerSub="Guia de tiers, escopos e boas práticas"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-3xl space-y-8">

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Tiers de Acesso IBM Cloud</h2>
            <div className="space-y-3">
              {TIERS.map(tier => {
                const m = IBM_TIER_META[tier]
                return (
                  <div key={tier} className="flex items-start gap-3 p-4 rounded-xl border border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: m.color }} />
                    <div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: m.color }}>{m.label}</div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Modelo de Políticas IAM</h2>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              No IBM Cloud IAM, as permissões são concedidas através de <strong>políticas de acesso</strong> que combinam três elementos:
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Sujeito', desc: 'Usuário, grupo de acesso, ID de serviço ou perfil confiável', color: '#7c3aed' },
                { label: 'Role', desc: 'Platform role (Admin, Editor, Operator, Viewer) ou Service role (Manager, Writer, Reader)', color: '#0f62fe' },
                { label: 'Recurso', desc: 'Serviço específico, grupo de recursos, instância ou toda a conta', color: '#16a34a' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-lg border border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="text-[12px] font-semibold mb-1" style={{ color: item.color }}>{item.label}</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Platform vs Service Roles</h2>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900">
                <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-200 mb-1">Platform Roles</h3>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Controlam o que pode ser feito com <em>instâncias de serviço</em> — criar, listar, deletar instâncias e gerenciar acesso de outros usuários. São: Administrator, Editor, Operator, Viewer e Service Configuration Reader.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[#dde3ec] dark:border-gray-800 bg-white dark:bg-gray-900">
                <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-200 mb-1">Service Roles</h3>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Controlam o que pode ser feito <em>dentro</em> de um serviço específico — por exemplo, criar/ler segredos no Secrets Manager ou gerenciar chaves no Key Protect. São definidas individualmente por cada serviço.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Access Groups & Trusted Profiles</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              <strong>Access Groups</strong> permitem atribuir políticas a um grupo e adicionar usuários/IDs de serviço — simplifica o gerenciamento em escala. <strong>Trusted Profiles</strong> permitem que workloads (compute resources, workloads externas com federação) assumam identidades sem credenciais estáticas. Ver página dedicada:{' '}
              <Link href="/ibm-cloud/access-groups" className="text-[#0f62fe] dark:text-[#4589ff] hover:underline">Access Groups & Trusted Profiles</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Fontes</h2>
            <div className="space-y-2">
              {[
                { label: 'IBM Cloud IAM Roles', url: 'https://cloud.ibm.com/docs/account?topic=account-userroles' },
                { label: 'Platform & Service Roles', url: 'https://cloud.ibm.com/docs/account?topic=account-iam-service-roles-actions' },
                { label: 'Access Groups', url: 'https://cloud.ibm.com/docs/account?topic=account-groups' },
                { label: 'Trusted Profiles', url: 'https://cloud.ibm.com/docs/account?topic=account-create-trusted-profile' },
                { label: 'Classic Infrastructure Permissions', url: 'https://cloud.ibm.com/docs/account?topic=account-infrapermission' },
              ].map(s => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] text-[#0f62fe] dark:text-[#4589ff] hover:underline">
                  <ExternalLink size={12} /> {s.label}
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 mb-3">Frescor dos dados (IBM Cloud)</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Data da última verificação de cada conjunto de dados IBM Cloud contra sua fonte oficial. Veja a página{' '}
              <Link href="/info" className="text-[#0f62fe] dark:text-[#4589ff] hover:underline">Sobre</Link> para o frescor das demais clouds.
            </p>
            <table className="w-full text-[13px] border border-[#dde3ec] dark:border-gray-800 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-[#dde3ec] dark:border-gray-800">
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Conjunto de dados</th>
                  <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Última verificação</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter(d => d.platform === 'IBM Cloud').map((d, i, arr) => (
                  <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-[#dde3ec] dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                    <td className="px-4 py-2.5 align-top text-[13px] font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2.5 align-top text-[13px] text-gray-500 dark:text-gray-400"><code className="font-mono text-[12px]">{d.lastSynced}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
