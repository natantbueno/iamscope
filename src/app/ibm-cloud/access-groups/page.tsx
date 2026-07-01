import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { ExternalLink, Users, ShieldCheck, Layers, Network } from 'lucide-react'
import { IBM_ACCESS_PRIMITIVES } from '@/data/ibmAccessPrimitives'

export default function IbmAccessGroupsPage() {
  const accessGroup = IBM_ACCESS_PRIMITIVES.find(p => p.slug === 'access-group')!
  const trustedProfile = IBM_ACCESS_PRIMITIVES.find(p => p.slug === 'trusted-profile')!

  return (
    <AppShell
      headerTitle="Access Groups & Trusted Profiles"
      headerSub="Os primitivos de agrupamento e delegação de identidade do IBM Cloud IAM"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title="Por que estes primitivos precisam de página própria">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              O restante deste catálogo IBM Cloud é organizado em torno de <strong className="text-gray-800 dark:text-gray-200">roles</strong> —
              o que uma identidade pode <em>fazer</em>. Mas <strong className="text-gray-800 dark:text-gray-200">Access Groups</strong> e{' '}
              <strong className="text-gray-800 dark:text-gray-200">Trusted Profiles</strong> respondem a uma pergunta diferente: <em>quem</em> ou{' '}
              <em>o quê</em> pode receber essas roles, e como. São entidades centrais do modelo de identidade do
              IBM Cloud IAM, equivalentes a Security Groups + Managed Identities de outras clouds — mas até agora
              apareciam neste site apenas como texto descritivo dentro da role{' '}
              <Link href="/ibm-cloud/roles/iam-administrator" className="text-[#0f62fe] hover:underline">IAM Administrator</Link>,
              sem serem catalogados como entidades próprias.
            </p>
          </Section>

          <Divider />

          {/* ── Access Group ─────────────────────────────── */}
          <PrimitiveSection icon={<Users size={16} className="text-[#0f62fe]" />} data={accessGroup} />

          <Divider />

          {/* ── Trusted Profile ──────────────────────────── */}
          <PrimitiveSection icon={<ShieldCheck size={16} className="text-[#0f62fe]" />} data={trustedProfile} />

          <Divider />

          {/* ── Comparison ───────────────────────────────── */}
          <Section id="comparison" title="Access Group vs Trusted Profile vs Service ID">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>Primitivo</Th>
                    <Th>É uma identidade?</Th>
                    <Th>Uso principal</Th>
                    <Th>Análogo em outras clouds</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>Access Group</TD>
                    <TD>Não — é um contêiner</TD>
                    <TD>Atribuição de policy em massa a múltiplos membros</TD>
                    <TD>AWS IAM Group / Azure AD Group (role-assignable)</TD>
                  </TR>
                  <TR>
                    <TD bold>Trusted Profile</TD>
                    <TD>Sim — identidade sem credenciais próprias</TD>
                    <TD>Acesso federado/cross-cloud e workloads de computação</TD>
                    <TD>AWS IAM Role (assumable) / Azure Managed Identity</TD>
                  </TR>
                  <TR last>
                    <TD bold>Service ID</TD>
                    <TD>Sim — identidade não-humana com chave de API</TD>
                    <TD>Automação legada que ainda depende de credenciais estáticas</TD>
                    <TD>AWS IAM User (service account) / GCP Service Account com chave</TD>
                  </TR>
                </tbody>
              </table>
            </div>
            <Note>
              Recomendação: prefira <strong>Trusted Profiles</strong> a Service IDs sempre que possível — eliminam a
              necessidade de rotacionar chaves de API estáticas, que são a causa mais comum de vazamento de
              credenciais em pipelines de automação.
            </Note>
          </Section>

          <Divider />

          {/* ── How they compose ─────────────────────────── */}
          <Section id="composition" title="Como se combinam com as roles do catálogo">
            <ol className="space-y-3 mb-2">
              <Step n={1} title="Uma role é definida" icon={<Layers size={14} />}>
                Ex.: <Link href="/ibm-cloud/roles" className="text-[#0f62fe] hover:underline">Editor no serviço Cloud Object Storage</Link> — o que pode ser feito.
              </Step>
              <Step n={2} title="A role é atribuída a um Access Group ou diretamente a um Trusted Profile" icon={<Network size={14} />}>
                Atribuir ao grupo escala melhor: novos membros herdam automaticamente.
              </Step>
              <Step n={3} title="Identidades entram no Access Group" icon={<Users size={14} />}>
                Usuários, Service IDs ou Trusted Profiles — manualmente ou via dynamic rules baseadas em atributos do IdP.
              </Step>
              <Step n={4} title="Trusted Profiles são assumidos por entidades confiáveis" icon={<ShieldCheck size={14} />}>
                Um recurso de computação, uma federação SAML/OIDC ou uma workload de outra cloud assume o profile e
                herda o acesso efetivo — sem nunca ter uma credencial de longo prazo.
              </Step>
            </ol>
          </Section>

          <Divider />

          {/* ── Sources ──────────────────────────────────── */}
          <Section id="sources" title="Fontes">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>Documento</Th>
                    <Th>Link</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>Setting up access groups</TD>
                    <TD><ExtLink href={accessGroup.docsUrl}>cloud.ibm.com</ExtLink></TD>
                  </TR>
                  <TR last>
                    <TD bold>Creating a trusted profile</TD>
                    <TD><ExtLink href={trustedProfile.docsUrl}>cloud.ibm.com</ExtLink></TD>
                  </TR>
                </tbody>
              </table>
            </div>
          </Section>

        </div>
      </div>
    </AppShell>
  )
}

function PrimitiveSection({ icon, data }: { icon: React.ReactNode; data: typeof IBM_ACCESS_PRIMITIVES[number] }) {
  return (
    <Section id={data.slug} title={data.name}>
      <div className="flex items-start gap-2 mb-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">{data.description}</p>
      </div>

      {data.members && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Membros permitidos</p>
          <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            {data.members.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {data.trustedBy && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Confiado por</p>
          <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            {data.trustedBy.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Casos de uso</p>
          <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            {data.useCases.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Capacidades principais</p>
          <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            {data.keyCapabilities.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>

      {data.limits && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Limites</p>
          <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
            {data.limits.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}
    </Section>
  )
}

function Step({ n, title, icon, children }: { n: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#0f62fe] text-white text-[12px] font-semibold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-0.5 flex items-center gap-1.5">
          {title} <span className="text-[#0f62fe]">{icon}</span>
        </p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{children}</p>
      </div>
    </li>
  )
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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
      <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#0f62fe] hover:underline inline-flex items-center gap-0.5">
      {children}
      <ExternalLink size={11} className="inline shrink-0" />
    </a>
  )
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
