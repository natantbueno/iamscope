import AppShell from '@/components/AppShell'
import { AZURE_ROLES, AZURE_TIER_META, AzureRbacTier } from '@/data/azureRbac'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'
import ExportButton from '@/components/ExportButton'

const TIER_ORDER: AzureRbacTier[] = ['FullControl', 'AccessManagement', 'Contributor', 'DataPlane', 'Reader', 'Specialized']

export default function AzureRbacReferencePage() {
  const totalRoles = AZURE_ROLES.length
  const privileged = AZURE_ROLES.filter((r) => r.isPrivileged).length
  const categories = [...new Set(AZURE_ROLES.map((r) => r.category))].length

  return (
    <AppShell
      headerTitle="Reference"
      headerSub="Documentação técnica do Azure Role-Based Access Control"
      headerActions={<ExportButton filename="azure-rbac-data-sync" label="Exportar frescor dos dados"
        data={DATA_SYNC.filter((d) => d.platform === 'Azure RBAC').map((d) => ({ dataset: d.label, lastSynced: d.lastSynced, source: d.sourceLabel }))} />}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl px-8 py-8 space-y-12">

          <Section id="risk-tier" title="Risk Tier — Classificação de Risco">
            <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
              O Risk Tier é uma classificação própria do IAM Scope para roles do Azure RBAC, inspirada no Enterprise Access Model da Microsoft. Cada tier representa o nível de risco associado à role:
            </p>
            <div className="space-y-3">
              {TIER_ORDER.map((tier) => {
                const meta = AZURE_TIER_META[tier]
                return (
                  <div key={tier} className="flex items-start gap-4 p-3 border border-gray-700 rounded-lg bg-gray-900">
                    <div className="pt-0.5 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                        style={{ backgroundColor: meta.darkBg, color: meta.darkText, borderColor: meta.darkText + '40' }}>
                        {meta.short} — {meta.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[12px] text-gray-300 leading-relaxed">{meta.description}</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {AZURE_ROLES.filter((r) => r.tier === tier).length} roles nesta categoria
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Note>
              A classificação de Risk Tier é baseada nas capacidades da role, não no escopo de atribuição. Uma role Reader atribuída em escopo de Subscription ainda é classificada como Reader — o risco real depende também de onde a role é atribuída.
            </Note>
          </Section>

          <Divider />

          <Section id="permissions" title="Tipos de Permissão">
            <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
              Cada role do Azure RBAC é composta por até quatro tipos de permissão:
            </p>
            <table className="w-full text-[13px] border border-gray-700 rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <Th>Tipo</Th>
                  <Th>Descrição</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Actions</TD><TD>Operações de gerenciamento (control plane) que a role pode executar. Ex: criar VMs, gerenciar storage accounts.</TD></TR>
                <TR><TD bold>NotActions</TD><TD>Operações excluídas das Actions. As permissões efetivas = Actions − NotActions.</TD></TR>
                <TR><TD bold>DataActions</TD><TD>Operações no plano de dados que afetam dados dentro dos recursos. Ex: ler/escrever blobs, enviar mensagens para filas.</TD></TR>
                <TR last><TD bold>NotDataActions</TD><TD>Operações de dados excluídas das DataActions. As permissões efetivas de dados = DataActions − NotDataActions.</TD></TR>
              </tbody>
            </table>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              O formato das permissões segue o padrão{' '}
              <code className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-[12px] text-gray-200">{'provider/resourceType/action'}</code> —
              por exemplo, <code className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-[12px] text-gray-200">Microsoft.Compute/virtualMachines/write</code>.
            </p>
            <Note>
              Actions e NotActions operam no <strong>control plane</strong> (Azure Resource Manager). DataActions e NotDataActions operam no <strong>data plane</strong> dos serviços. Uma role pode ter ambos os tipos, mas security principals como Azure AD service principals só recebem data plane permissions via RBAC — nunca via políticas de recurso.
            </Note>
          </Section>

          <Divider />

          <Section id="scopes" title="Escopos de Atribuição">
            <p className="text-[14px] text-gray-400 leading-relaxed mb-3">
              Roles do Azure RBAC são atribuídas em um escopo específico. Os escopos disponíveis, do mais amplo ao mais restrito:
            </p>
            <CodeBlock>{`Management Group  →  /providers/Microsoft.Management/managementGroups/{mgId}
Subscription      →  /subscriptions/{subId}
Resource Group    →  /subscriptions/{subId}/resourceGroups/{rgName}
Resource          →  /subscriptions/{subId}/resourceGroups/{rg}/providers/{type}/{name}`}</CodeBlock>
            <p className="text-[13px] text-gray-400 leading-relaxed mt-3">
              A propriedade <code className="font-mono bg-gray-800 px-1 rounded text-[12px] text-gray-200">assignableScopes</code> de cada role define os escopos em que ela pode ser atribuída. Visível na página de detalhes de cada role.
            </p>
          </Section>

          <Divider />

          <Section id="privileged" title="Roles Privilegiadas">
            <p className="text-[14px] text-gray-400 leading-relaxed mb-3">
              Roles marcadas como <strong className="text-red-400">Privilegiada</strong> no IAM Scope são aquelas que conferem capacidades de alto risco, incluindo:
            </p>
            <ul className="text-[13px] text-gray-400 space-y-1.5 list-disc pl-5 mb-3">
              <li>Capacidade de atribuir ou revogar roles (escalonamento de privilégios)</li>
              <li>Acesso irrestrito a todos os recursos de uma subscription ou management group</li>
              <li>Controle sobre configurações de segurança, identidade ou políticas de acesso</li>
              <li>Acesso a dados sensíveis como chaves de criptografia, secrets e certificados</li>
            </ul>
            <p className="text-[13px] text-gray-400 leading-relaxed">
              Atualmente <strong className="text-gray-200">{privileged} roles</strong> são classificadas como privilegiadas. Use o filtro <em>Privilegiadas</em> na página de Built-in Roles para visualizá-las.
            </p>
          </Section>

          <Divider />

          <Section id="sources" title="Fontes de dados">
            <table className="w-full text-[13px] border border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <Th>Fonte</Th>
                  <Th>Conteúdo</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://www.azadvertizer.net">AzAdvertizer</ExtLink></TD>
                  <TD>Base de dados das roles built-in com permissões detalhadas</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles">Microsoft Learn — Built-in Roles</ExtLink></TD>
                  <TD>Documentação oficial com descrições e escopos</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/azure/role-based-access-control/overview">Microsoft Learn — Azure RBAC Overview</ExtLink></TD>
                  <TD>Conceitos fundamentais do sistema de controle de acesso</TD>
                </TR>
              </tbody>
            </table>
          </Section>

          <Divider />

          <Section id="data-freshness" title="Frescor dos dados (Azure RBAC)">
            <p className="text-[14px] text-gray-400 leading-relaxed mb-4">
              Data da última verificação de cada conjunto de dados do Azure RBAC contra sua fonte oficial. Veja a página{' '}
              <a href="/info" className="text-[#85b7eb] hover:underline">Sobre</a> para o frescor das demais clouds.
            </p>
            <table className="w-full text-[13px] border border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-800 border-b border-gray-700">
                  <Th>Conjunto de dados</Th>
                  <Th>Última verificação</Th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter((d) => d.platform === 'Azure RBAC').map((d, i, arr) => (
                  <TR key={d.id} last={i === arr.length - 1}>
                    <TD bold>{d.label}</TD>
                    <TD><code className="font-mono text-[12px]">{d.lastSynced}</code></TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-[18px] font-semibold text-gray-100 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Divider() {
  return <hr className="border-gray-800" />
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-950/40 border border-blue-900 rounded-lg">
      <p className="text-[12px] text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 p-3 bg-gray-950 text-gray-100 text-[11px] font-mono rounded-lg overflow-x-auto leading-relaxed border border-gray-800">
      {children}
    </pre>
  )
}

function StatsRow({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="flex gap-4 mt-3">
      {items.map((item) => (
        <div key={item.label} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-center">
          <div className="text-[20px] font-bold text-[#85b7eb]">{item.value.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#85b7eb] hover:underline inline-flex items-center gap-0.5">
      {children}
      <ExternalLink size={11} className="inline shrink-0" />
    </a>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">
      {children}
    </th>
  )
}

function TR({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <tr className={`${last ? '' : 'border-b border-gray-800'} hover:bg-gray-800/50 transition-colors`}>
      {children}
    </tr>
  )
}

function TD({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-4 py-2.5 align-top text-[13px] ${bold ? 'font-medium text-gray-300' : 'text-gray-400'}`}>
      {children}
    </td>
  )
}
