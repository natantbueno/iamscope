import AppShell from '@/components/AppShell'
import { EAM_META, CATEGORY_META, ROLES } from '@/data/roles'
import { API_PERMISSIONS } from '@/data/apiPermissions'
import EamTierBadge from '@/components/EamTierBadge'
import CategoryBadge from '@/components/CategoryBadge'
import { ExternalLink } from 'lucide-react'
import { DATA_SYNC } from '@/data/syncMeta'

export default function ReferencePage() {
  const totalRoles = ROLES.length
  const totalActions = [...new Set(ROLES.flatMap((r) => r.permissions.map((p) => p.action)))].length
  const totalApiPerms = API_PERMISSIONS.length

  return (
    <AppShell
      headerTitle="Reference"
      headerSub="Documentação e guia de uso do IAM Scope"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── Sobre ──────────────────────────────────── */}

          {/* ── Como navegar ───────────────────────────── */}

          {/* ── EAM ────────────────────────────────────── */}
          <Section id="eam" title="Enterprise Access Model (EAM)">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              O <ExtLink href="https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model">Enterprise Access Model</ExtLink> é um framework da Microsoft para classificar o risco de identidades e permissões em ambientes Azure/Entra ID. Cada role e role action é classificada em um dos tiers abaixo:
            </p>
            <div className="space-y-3">
              {(Object.entries(EAM_META) as [keyof typeof EAM_META, typeof EAM_META[keyof typeof EAM_META]][]).map(([tier, meta]) => (
                <div key={tier} className="flex items-start gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                  <div className="pt-0.5 shrink-0">
                    <EamTierBadge tier={tier} />
                  </div>
                  <div>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed">{meta.description}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      Abreviação exibida nos badges: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{meta.short}</code>
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Note>
              A classificação de tier de uma role corresponde ao <strong>tier mais alto</strong> de suas role actions individuais. Uma role com uma única action de Control Plane é classificada como Control Plane mesmo que todas as demais sejam User Access.
            </Note>
          </Section>

          <Divider />

          {/* ── Categorias ─────────────────────────────── */}
          <Section id="categories" title="Categorias de Roles">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Cada built-in role é agrupada em uma categoria funcional para facilitar a navegação:
            </p>
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Badge</Th>
                  <Th>Descrição</Th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(CATEGORY_META) as [keyof typeof CATEGORY_META, typeof CATEGORY_META[keyof typeof CATEGORY_META]][]).map(([cat, meta], i, arr) => (
                  <TR key={cat} last={i === arr.length - 1}>
                    <TD><CategoryBadge category={cat} /></TD>
                    <TD>{getCategoryDescription(cat)}</TD>
                  </TR>
                ))}
              </tbody>
            </table>
          </Section>

          <Divider />

          {/* ── Role Actions ───────────────────────────── */}
          <Section id="role-actions" title="Role Actions">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Role actions (também chamadas de <em>directory permissions</em> ou <em>resource actions</em>) são as permissões atômicas que compõem uma role. Cada action segue o formato:
            </p>
            <CodeBlock>{`{namespace}/{resource...}/{verb}`}</CodeBlock>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mt-3 mb-4">
              Exemplos e significado de cada parte:
            </p>
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Parte</Th>
                  <Th>Exemplo</Th>
                  <Th>Significado</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Namespace</TD><TD mono>microsoft.directory</TD><TD>Serviço/recurso raiz (antes da primeira <code className="font-mono">/</code>)</TD></TR>
                <TR><TD bold>Resource</TD><TD mono>users/password</TD><TD>Segmentos do meio — o recurso específico sendo operado</TD></TR>
                <TR last><TD bold>Verb</TD><TD mono>update</TD><TD>Operação realizada: <code className="font-mono">read</code>, <code className="font-mono">update</code>, <code className="font-mono">delete</code>, <code className="font-mono">allTasks</code>, etc.</TD></TR>
              </tbody>
            </table>
            <Note>
              A página de <strong>Role Actions</strong> agrega todas as actions únicas e mostra quais roles as utilizam — útil para descobrir o menor privilégio necessário para uma operação específica.
            </Note>
          </Section>

          <Divider />

          {/* ── API Permissions ─────────────────────────── */}
          <Section id="api-permissions" title="API Permissions (Microsoft Graph)">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              As API permissions são permissões do <ExtLink href="https://learn.microsoft.com/en-us/graph/overview">Microsoft Graph</ExtLink> utilizadas por aplicações registradas no Entra ID. Existem dois tipos:
            </p>
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Tipo</Th>
                  <Th>Badge</Th>
                  <Th>Descrição</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD bold>Application</TD>
                  <TD>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">AppRole</span>
                  </TD>
                  <TD>A aplicação age por conta própria, sem usuário logado. Requer consentimento de administrador. Alto impacto de segurança.</TD>
                </TR>
                <TR last>
                  <TD bold>Delegated</TD>
                  <TD>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Delegated</span>
                  </TD>
                  <TD>A aplicação age em nome do usuário logado. A permissão efetiva é a interseção entre as permissões da app e as do usuário.</TD>
                </TR>
              </tbody>
            </table>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              O nome das permissões segue o padrão <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-[12px]">Resource.Action.Scope</code> — por exemplo, <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-[12px]">User.ReadWrite.All</code> indica acesso de leitura e escrita a todos os usuários.
            </p>
          </Section>

          <Divider />

          {/* ── Custom Roles ─────────────────────────────── */}
          <Section id="custom-roles" title="Custom Roles — Limitações no Entra ID">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Custom roles permitem criar perfis de permissão granulares no Entra ID, mas possuem limitações importantes em relação às built-in roles:
            </p>

            <SubSection title="Requisitos">
              <ul className="text-[13px] text-gray-600 dark:text-gray-400 space-y-1.5 list-disc pl-5">
                <li>Exigem licença <strong className="text-gray-800 dark:text-gray-200">Microsoft Entra ID P1 ou P2</strong> (ou equivalente via Microsoft 365)</li>
                <li>Limite de <strong className="text-gray-800 dark:text-gray-200">5.000 definições de custom roles</strong> por tenant</li>
                <li>Criação exclusivamente via Portal do Entra, PowerShell (<code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">New-MgRoleManagementDirectoryRoleDefinition</code>) ou Microsoft Graph API</li>
              </ul>
            </SubSection>

            <SubSection title="Permissões disponíveis (subconjunto)">
              <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                <strong className="text-gray-700 dark:text-gray-300">Nem todas as role actions das built-in roles estão disponíveis para custom roles.</strong> Algumas permissões são reservadas exclusivamente para roles nativas da Microsoft.
              </p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                Para listar as permissões disponíveis para custom roles no seu tenant, utilize o Microsoft Graph:
              </p>
              <CodeBlock>{`GET https://graph.microsoft.com/v1.0/roleManagement/directory/resourceNamespaces
# ou via PowerShell:
Get-MgRoleManagementDirectoryResourceNamespace | ForEach-Object {
  Get-MgRoleManagementDirectoryResourceNamespaceResourceAction -UnifiedRbacResourceNamespaceId $_.Id
}`}</CodeBlock>
            </SubSection>

            <SubSection title="Limitações de escopo de atribuição">
              <ul className="text-[13px] text-gray-600 dark:text-gray-400 space-y-1.5 list-disc pl-5">
                <li>Custom roles podem ser atribuídas ao <strong>tenant inteiro</strong> ou a uma <strong>Administrative Unit</strong> específica</li>
                <li>Não suportam escopo por objeto individual (ex: apenas um grupo específico) — ao contrário de algumas built-in roles que têm escopos especiais</li>
                <li>Não podem ser usadas como <strong>Eligible assignments</strong> em PIM para todos os recursos — suporte parcial dependendo da licença</li>
              </ul>
            </SubSection>

            <SubSection title="Operações não suportadas em custom roles">
              <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <Th>Limitação</Th>
                    <Th>Detalhes</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR><TD bold>Permissões de preview</TD><TD>Ações marcadas como preview pela Microsoft não estão disponíveis para custom roles até tornarem-se GA</TD></TR>
                  <TR><TD bold>Permissões cross-service</TD><TD>Permissões que cruzam múltiplos serviços (ex: Exchange + SharePoint) não são composíveis via custom roles; requerem built-in roles</TD></TR>
                  <TR><TD bold>Herança de permissão</TD><TD>Custom roles não herdam permissões implícitas; cada permissão deve ser declarada explicitamente</TD></TR>
                  <TR><TD bold>Acesso ao tenant raiz</TD><TD>Algumas operações de controle total do tenant (ex: gerenciar propriedades do próprio tenant) são restritas a built-in roles como Global Administrator</TD></TR>
                  <TR last><TD bold>Permissões de parceiros (CSP)</TD><TD>As roles Partner Tier1/Tier2 Support são reservadas para parceiros Microsoft e não podem ser replicadas em custom roles</TD></TR>
                </tbody>
              </table>
            </SubSection>

            <Note>
              Ao projetar uma custom role, use a página de <strong>Role Actions</strong> deste site para identificar as permissões mínimas necessárias. Verifique sempre se as actions desejadas estão na lista retornada pelo endpoint <code className="font-mono text-[11px]">resourceNamespaces</code> antes de incluí-las na definição da role.
            </Note>
          </Section>

          <Divider />

          {/* ── Fontes ─────────────────────────────────── */}
          <Section id="sources" title="Fontes de dados">
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Fonte</Th>
                  <Th>Conteúdo</Th>
                  <Th>Atualização</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://github.com/Cloud-Architekt/AzurePrivilegedIAM">AzurePrivilegedIAM (EntraOps)</ExtLink></TD>
                  <TD>Classificação EAM de roles e role actions</TD>
                  <TD>Comunidade (Thomas Naunheim)</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference">Microsoft Learn — Permissions Reference</ExtLink></TD>
                  <TD>Descrições oficiais das roles e suas capacidades</TD>
                  <TD>Microsoft</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/graph/permissions-reference">Microsoft Graph Permissions Reference</ExtLink></TD>
                  <TD>Documentação das API permissions do Microsoft Graph (Application + Delegated)</TD>
                  <TD>Microsoft</TD>
                </TR>
              </tbody>
            </table>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-3">
              Os dados são atualizados manualmente a partir dos arquivos de classificação do repositório AzurePrivilegedIAM. Para contribuir com correções, abra uma issue no{' '}
              <ExtLink href="https://github.com/natebzurg/entraid.permissions">repositório do site</ExtLink>.
            </p>
          </Section>

          <Divider />

          {/* ── Frescor dos dados ──────────────────────── */}
          <Section id="data-freshness" title="Frescor dos dados (Entra ID)">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Data da última verificação de cada conjunto de dados do Entra ID contra sua fonte oficial. Veja a página{' '}
              <a href="/info" className="text-[#0078d4] dark:text-[#85b7eb] hover:underline">Sobre</a> para o frescor das
              demais 6 clouds.
            </p>
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Conjunto de dados</Th>
                  <Th>Última verificação</Th>
                </tr>
              </thead>
              <tbody>
                {DATA_SYNC.filter((d) => d.platform === 'Entra ID').map((d, i, arr) => (
                  <TR key={d.id} last={i === arr.length - 1}>
                    <TD bold>{d.label}</TD>
                    <TD mono>{d.lastSynced}</TD>
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

/* ── Layout helpers ──────────────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-[18px] font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-200 dark:border-gray-800" />
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
      <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 p-3 bg-gray-900 dark:bg-gray-950 text-gray-100 text-[11px] font-mono rounded-lg overflow-x-auto leading-relaxed border border-gray-700 dark:border-gray-800">
      {children}
    </pre>
  )
}

function StatsRow({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="flex gap-4 mt-3">
      {items.map((item) => (
        <div key={item.label} className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-center shadow-sm">
          <div className="text-[20px] font-bold text-[#0078d4] dark:text-[#85b7eb]">{item.value.toLocaleString()}</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-0.5">
      {children}
      <ExternalLink size={11} className="inline shrink-0" />
    </a>
  )
}

/* ── Table helpers ───────────────────────────────────────────── */

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

function TD({ children, bold, mono }: { children: React.ReactNode; bold?: boolean; mono?: boolean }) {
  return (
    <td className={`px-4 py-2.5 align-top text-[13px] ${bold ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'} ${mono ? 'font-mono text-[11px]' : ''}`}>
      {children}
    </td>
  )
}

/* ── Data helpers ────────────────────────────────────────────── */

function getCategoryDescription(cat: string): string {
  const desc: Record<string, string> = {
    Identity:    'Gestão de usuários, grupos, senhas, autenticação e estrutura de diretório do Entra ID',
    Application: 'Registro e gestão de aplicações, service principals e permissões de API',
    Security:    'Políticas de segurança, Conditional Access, Identity Protection e operações de auditoria',
    Compliance:  'Conformidade, proteção de dados, atributos de classificação e Purview',
    M365:        'Serviços Microsoft 365: Exchange, SharePoint, Teams, Viva e relacionados',
    Device:      'Gestão de dispositivos registrados e integrados ao Entra ID',
    Other:       'Roles que não se enquadram nas categorias funcionais principais',
  }
  return desc[cat] ?? ''
}
