import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { AWS_POLICIES } from '@/data/aws'
import { ExternalLink, ShieldAlert, ShieldCheck, Lock, Building2 } from 'lucide-react'

export default function ScpVsIdentityPoliciesPage() {
  const orgAccountAccessRole = AWS_POLICIES.find(p => p.slug === 'organization-account-access-role')
  const boundaries = AWS_POLICIES.filter(p => p.type === 'permission-boundary')

  return (
    <AppShell
      headerTitle="SCP vs Identity Policies"
      headerSub="Como as camadas de política da AWS se combinam para formar a permissão efetiva"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── Overview ─────────────────────────────────── */}
          <Section id="overview" title="Duas camadas, um propósito diferente">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Um erro comum de modelagem é tratar{' '}
              <strong className="text-gray-800 dark:text-gray-200">Service Control Policies (SCPs)</strong> e{' '}
              <strong className="text-gray-800 dark:text-gray-200">Identity-based Policies</strong> como o mesmo
              tipo de controle em escopos diferentes. Não são: SCPs nunca concedem permissão — apenas
              definem o teto máximo do que qualquer identidade dentro de uma conta ou OU pode fazer, mesmo que
              a identity policy dessa identidade permita mais. Identity policies são o único mecanismo que
              efetivamente <em>concede</em> uma permissão a um principal (usuário, role, grupo).
            </p>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Esta página existia no site apenas como um link de referência isolado. A tabela abaixo e o fluxo de
              avaliação substituem essa lacuna com o mecanismo completo — incluindo{' '}
              <Link href="/aws/reference" className="text-[#ff9900] hover:underline">Permission Boundaries</Link>,
              a terceira camada, aplicável por identidade.
            </p>
          </Section>

          <Divider />

          {/* ── Comparison ───────────────────────────────── */}
          <Section id="comparison" title="SCP vs Identity Policy — comparação direta">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={16} className="text-blue-500" />
                  <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Service Control Policy (SCP)</h3>
                </div>
                <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li>Aplicada em <strong>AWS Organizations</strong> — nível de conta, OU ou organização inteira</li>
                  <li><strong>Nunca concede</strong> permissão — apenas restringe o que é permitido, mesmo com <code className="font-mono text-[11px]">AdministratorAccess</code></li>
                  <li>Não afeta a conta de <strong>management</strong> da organização por padrão</li>
                  <li>Não afeta o <strong>root user</strong> — SCPs limitam identidades IAM, não o usuário root</li>
                  <li>Editada por administradores de Organizations, tipicamente um time central de plataforma</li>
                </ul>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={16} className="text-emerald-500" />
                  <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Identity-based Policy</h3>
                </div>
                <ul className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1.5 list-disc list-inside">
                  <li>Anexada diretamente a um <strong>usuário, grupo ou role</strong> IAM</li>
                  <li><strong>Concede</strong> permissão — é o único mecanismo dos dois que efetivamente permite uma ação</li>
                  <li>Pode ser managed (AWS ou customer) ou inline</li>
                  <li>Ainda está sujeita a <Link href="/aws/reference" className="text-[#ff9900] hover:underline">Permission Boundaries</Link>, se a identidade tiver uma anexada</li>
                  <li>Editada por administradores IAM da própria conta</li>
                </ul>
              </div>
            </div>
            <Note>
              Regra mental simples: SCP e Permission Boundary respondem <strong>&ldquo;qual é o teto?&rdquo;</strong>.
              Identity policy responde <strong>&ldquo;o que foi de fato concedido?&rdquo;</strong>. A permissão final é
              sempre a interseção entre teto(s) e concessão — nunca a união.
            </Note>
          </Section>

          <Divider />

          {/* ── Evaluation logic ─────────────────────────── */}
          <Section id="evaluation" title="Ordem de avaliação — como a AWS decide Allow ou Deny">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Para toda requisição, a AWS avalia todas as políticas aplicáveis e o resultado é sempre{' '}
              <strong className="text-gray-800 dark:text-gray-200">deny por padrão</strong>, a menos que exista um Allow
              explícito em todas as camadas relevantes e nenhum Deny explícito em nenhuma delas:
            </p>
            <ol className="space-y-3 mb-4">
              <EvalStep n={1} title="SCP da organização (se a conta pertence a uma AWS Organization)">
                Deve conter um Allow (explícito ou via wildcard) para a ação — senão, deny implícito, mesmo que a
                identity policy permita. Não se aplica à conta de management nem ao root user.
              </EvalStep>
              <EvalStep n={2} title="Resource-based policy (se o recurso tiver uma, ex.: bucket policy do S3)">
                Um Allow aqui pode conceder acesso mesmo entre contas, independente da identity policy do principal.
              </EvalStep>
              <EvalStep n={3} title="Permission Boundary (se a identidade tiver uma anexada)">
                Define o teto de permissões daquela identidade específica. A identity policy só é efetiva dentro
                da interseção com a boundary.
              </EvalStep>
              <EvalStep n={4} title="Identity-based Policy (anexada ao usuário, grupo ou role)">
                A concessão real de permissão. Sem um Allow explícito aqui, não há acesso — independente do que as
                outras camadas permitam.
              </EvalStep>
              <EvalStep n={5} title="Session Policy (se assumido via AssumeRole com policy inline na sessão)">
                Camada final, opcional, usada para restringir ainda mais uma sessão temporária específica.
              </EvalStep>
            </ol>
            <Note>
              Um <strong>Deny explícito em qualquer camada sempre vence</strong> — não existe combinação de Allows em
              outras camadas que sobreponha um Deny explícito.
            </Note>
          </Section>

          <Divider />

          {/* ── Worked example ──────────────────────────── */}
          <Section id="example" title="Exemplo prático">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <Th>Camada</Th>
                    <Th>Conteúdo</Th>
                    <Th>Efeito</Th>
                  </tr>
                </thead>
                <tbody>
                  <TR>
                    <TD bold>SCP (OU &ldquo;Production&rdquo;)</TD>
                    <TD>Deny em todas as ações <code className="font-mono text-[11px]">iam:*</code> exceto para a role de break-glass</TD>
                    <TD><span className="text-red-500 font-medium">Bloqueia iam:* para todos, inclusive admins</span></TD>
                  </TR>
                  <TR>
                    <TD bold>Permission Boundary</TD>
                    <TD>Allow <code className="font-mono text-[11px]">s3:*</code>, <code className="font-mono text-[11px]">ec2:Describe*</code> apenas</TD>
                    <TD>Teto: só S3 total + EC2 leitura, mesmo se a identity policy permitir mais</TD>
                  </TR>
                  <TR last>
                    <TD bold>Identity Policy (role do desenvolvedor)</TD>
                    <TD>Allow <code className="font-mono text-[11px]">s3:*</code>, <code className="font-mono text-[11px]">ec2:*</code>, <code className="font-mono text-[11px]">iam:CreateUser</code></TD>
                    <TD><span className="text-emerald-600 dark:text-emerald-400 font-medium">Efetivo: só s3:* (interseção com a boundary, e iam:CreateUser é bloqueado pela SCP)</span></TD>
                  </TR>
                </tbody>
              </table>
            </div>
          </Section>

          <Divider />

          {/* ── Related catalog entries ─────────────────── */}
          <Section id="related" title="Entradas relacionadas no catálogo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orgAccountAccessRole && (
                <Link href={`/aws/policies/${orgAccountAccessRole.slug}`}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-[#ff9900]/60 transition-colors group">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={14} className="text-red-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 group-hover:text-[#ff9900]">{orgAccountAccessRole.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{orgAccountAccessRole.description}</p>
                </Link>
              )}
              {boundaries.map(b => (
                <Link key={b.slug} href={`/aws/policies/${b.slug}`}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:border-[#ff9900]/60 transition-colors group">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-red-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 group-hover:text-[#ff9900]">{b.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{b.description}</p>
                </Link>
              ))}
            </div>
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
                    <TD bold>Service Control Policies (SCPs)</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html">docs.aws.amazon.com</ExtLink></TD>
                  </TR>
                  <TR>
                    <TD bold>Policy Evaluation Logic</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html">docs.aws.amazon.com</ExtLink></TD>
                  </TR>
                  <TR last>
                    <TD bold>Permission Boundaries</TD>
                    <TD><ExtLink href="https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html">docs.aws.amazon.com</ExtLink></TD>
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

function EvalStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#ff9900] text-white text-[12px] font-semibold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-0.5">{title}</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{children}</p>
      </div>
    </li>
  )
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#ff9900] hover:underline inline-flex items-center gap-0.5">
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
