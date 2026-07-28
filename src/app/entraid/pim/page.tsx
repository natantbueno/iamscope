import AppShell from '@/components/AppShell'
import Link from 'next/link'
import { ROLES } from '@/data/roles'
import EamTierBadge from '@/components/EamTierBadge'
import { ExternalLink, Clock, ShieldCheck, UserCheck, Timer, AlertTriangle } from 'lucide-react'
import ExportButton from '@/components/ExportButton'

export const metadata = { title: 'Privileged Identity Management (PIM)' }

export default function PimPage() {
  // As roles Control Plane privilegiadas são as melhores candidatas a eligible assignment em PIM.
  const topControlPlaneRoles = ROLES
    .filter((r) => r.eamTier === 'ControlPlane' && r.isPrivileged)
    .sort((a, b) => b.permissionCount - a.permissionCount)
    .slice(0, 12)

  return (
    <AppShell
      headerTitle="Privileged Identity Management (PIM)"
      headerSub="Eligible vs Active assignments e acesso just-in-time no Entra ID"
      headerActions={<ExportButton filename="entraid-pim-candidate-roles" data={topControlPlaneRoles.map((r) => ({
        name: r.name, eamTier: r.eamTier, permissionCount: r.permissionCount, isPrivileged: r.isPrivileged,
      }))} />}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 space-y-12 max-w-3xl">

          {/* ── O que é ──────────────────────────────────── */}
          <Section id="overview" title="O que é o PIM">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              O <ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure">Privileged Identity Management</ExtLink> é
              o serviço do Entra ID (Microsoft Entra ID Governance, requer P2) que implementa acesso{' '}
              <strong className="text-gray-800 dark:text-gray-200">just-in-time (JIT)</strong> às roles privilegiadas
              catalogadas neste site. Em vez de manter um usuário permanentemente como, por exemplo,{' '}
              <Link href="/entraid/roles/global-administrator" className="text-[#0078d4] dark:text-[#85b7eb] hover:underline">Global Administrator</Link>,
              o PIM concede a role apenas pelo tempo necessário para a tarefa, com aprovação, justificativa e MFA opcionais.
            </p>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
              O PIM se aplica a três tipos de atribuição: <strong className="text-gray-800 dark:text-gray-200">Microsoft Entra roles</strong> (as
              144 directory roles deste catálogo), <strong className="text-gray-800 dark:text-gray-200">Azure resource roles</strong> (roles do
              Azure RBAC sobre subscriptions/resource groups) e <strong className="text-gray-800 dark:text-gray-200">PIM for Groups</strong> (grupos
              role-assignable, que por sua vez concedem uma ou mais directory roles aos seus membros).
            </p>
            <Note>
              O PIM não substitui a classificação de tier deste site — ele é o <strong>controle operacional</strong> recomendado
              para qualquer role marcada como <EamTierBadge tier="ControlPlane" showLabel={false} /> Control Plane ou{' '}
              <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-semibold text-amber-700 dark:text-amber-400">privilegiada</span>{' '}
              nas páginas de role deste catálogo.
            </Note>
          </Section>

          <Divider />

          {/* ── Eligible vs Active ───────────────────────── */}
          <Section id="eligible-vs-active" title="Eligible vs Active assignments">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Toda atribuição de role no PIM é configurada como <strong>Eligible</strong> ou <strong>Active</strong> — a
              distinção central do modelo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={16} className="text-amber-500" />
                  <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Eligible (elegível)</h3>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  O usuário <strong>não tem a permissão da role</strong> no dia a dia. Ele precisa ativá-la explicitamente
                  (self-activation) quando necessário, por tempo limitado. É o estado recomendado para praticamente toda
                  role Control Plane / Management Plane.
                </p>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <h3 className="text-[13px] font-semibold text-gray-800 dark:text-gray-100">Active (ativa)</h3>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  O usuário <strong>já possui a permissão</strong>, igual a uma atribuição direta tradicional fora do PIM
                  (opcionalmente com data de expiração). Reservado para contas de serviço sem suporte a ativação interativa
                  e para o mínimo de Global Administrators permanentes recomendado pela Microsoft.
                </p>
              </div>
            </div>
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Característica</Th>
                  <Th>Eligible</Th>
                  <Th>Active</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>Permissão efetiva fora de uma ativação</TD><TD>Nenhuma</TD><TD>Total, igual a uma atribuição direta</TD></TR>
                <TR><TD bold>Exige ativação para uso</TD><TD>Sim — self-activation</TD><TD>Não</TD></TR>
                <TR><TD bold>Pode exigir aprovação</TD><TD>Sim, configurável por role</TD><TD>Não aplicável</TD></TR>
                <TR><TD bold>Pode exigir MFA/justificativa/ticket</TD><TD>Sim, configurável por role</TD><TD>Apenas no momento da atribuição</TD></TR>
                <TR last><TD bold>Uso recomendado</TD><TD>Roles Control Plane / Management Plane</TD><TD>Break-glass accounts e exceções documentadas</TD></TR>
              </tbody>
            </table>
          </Section>

          <Divider />

          {/* ── Fluxo JIT ────────────────────────────────── */}
          <Section id="jit-flow" title="Fluxo de ativação just-in-time">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Quando um usuário com uma atribuição <strong>Eligible</strong> precisa exercer a role, o fluxo típico é:
            </p>
            <ol className="space-y-3">
              <JitStep n={1} title="Solicitação de ativação">
                O usuário acessa <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">My roles</code> no
                portal do Entra (ou via Microsoft Graph API <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">roleManagement/directory/roleAssignmentScheduleRequests</code>)
                e solicita ativação da role eligible.
              </JitStep>
              <JitStep n={2} title="Verificações de política (Conditional Access for PIM)">
                A política de ativação da role pode exigir MFA, justificativa textual, número de ticket, e/ou aprovação
                de um aprovador designado antes de liberar o acesso.
              </JitStep>
              <JitStep n={3} title="Janela de tempo limitada">
                A role fica ativa por um período configurável (padrão de até 8h, máximo de até 24h dependendo da
                configuração), após o qual é automaticamente revogada — sem exigir intervenção manual.
              </JitStep>
              <JitStep n={4} title="Auditoria">
                Toda ativação, aprovação e expiração gera eventos no <strong>PIM audit log</strong>, consumíveis via
                Microsoft Graph ou exportáveis para SIEM (Sentinel, etc.) para correlação com os logs de auditoria de
                directory roles.
              </JitStep>
            </ol>
          </Section>

          <Divider />

          {/* ── PIM for Groups ───────────────────────────── */}
          <Section id="pim-for-groups" title="PIM for Groups">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Em vez de colocar uma role individual em PIM, é possível criar um <strong>grupo role-assignable</strong> (um
              grupo de segurança com <code className="font-mono text-[11px] bg-gray-100 dark:bg-gray-800 px-1 rounded">isAssignableToRole: true</code>),
              atribuí-lo a uma ou mais directory roles, e colocar a <strong>associação ao grupo</strong> em PIM (eligible/active)
              em vez da role diretamente.
            </p>
            <ul className="text-[13px] text-gray-600 dark:text-gray-400 space-y-1.5 list-disc pl-5">
              <li>Permite agrupar múltiplas roles relacionadas (ex.: Helpdesk Administrator + Authentication Administrator) em uma única ativação</li>
              <li>Facilita a governança via Access Reviews recorrentes sobre o grupo</li>
              <li>Grupos role-assignable não podem ser dinâmicos nem aninhados em outro grupo — limitação importante de design</li>
            </ul>
          </Section>

          <Divider />

          {/* ── Roles candidatas ─────────────────────────── */}
          <Section id="candidate-roles" title="Candidatas prioritárias para PIM neste catálogo">
            <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              As roles abaixo são as de maior contagem de permissões dentre as classificadas como{' '}
              <EamTierBadge tier="ControlPlane" showLabel={false} /> Control Plane e privilegiadas neste site —
              ou seja, as que causam o maior dano em caso de comprometimento e que mais se beneficiam de eligible assignment
              em vez de atribuição permanente.
            </p>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {topControlPlaneRoles.map((role, i) => (
                <Link
                  key={role.slug}
                  href={`/entraid/roles/${role.slug}`}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    i === topControlPlaneRoles.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{role.name}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{role.permissionCount} permissões</span>
                    <EamTierBadge tier={role.eamTier} showLabel={false} />
                  </span>
                </Link>
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── Licenciamento ────────────────────────────── */}
          <Section id="licensing" title="Licenciamento">
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Recurso</Th>
                  <Th>Licença mínima</Th>
                </tr>
              </thead>
              <tbody>
                <TR><TD bold>PIM para Microsoft Entra roles</TD><TD>Microsoft Entra ID P2 ou Microsoft Entra ID Governance</TD></TR>
                <TR><TD bold>PIM para Azure resource roles</TD><TD>Microsoft Entra ID P2 (por usuário gerenciado via PIM)</TD></TR>
                <TR last><TD bold>PIM for Groups</TD><TD>Microsoft Entra ID P2 ou Microsoft Entra ID Governance</TD></TR>
              </tbody>
            </table>
            <Note>
              Sem licença P2/Governance, todas as atribuições de directory role permanecem como <strong>Active</strong> permanente
              — não há como configurar eligible assignment, aprovação ou expiração automática.
            </Note>
          </Section>

          <Divider />

          {/* ── Fontes ───────────────────────────────────── */}
          <Section id="sources" title="Fontes">
            <table className="w-full text-[13px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <Th>Fonte</Th>
                  <Th>Conteúdo</Th>
                </tr>
              </thead>
              <tbody>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure">Microsoft Learn — What is PIM</ExtLink></TD>
                  <TD>Visão geral e configuração do PIM</TD>
                </TR>
                <TR>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-assign-roles">Assign Eligible/Active roles</ExtLink></TD>
                  <TD>Passo a passo de atribuição eligible vs active</TD>
                </TR>
                <TR last>
                  <TD><ExtLink href="https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/concept-pim-for-groups">PIM for Groups</ExtLink></TD>
                  <TD>Conceito e limitações de grupos role-assignable em PIM</TD>
                </TR>
              </tbody>
            </table>
          </Section>

          <div className="pb-8" />
        </div>
      </div>
    </AppShell>
  )
}

/* ── Layout helpers (mesmo padrão de /reference) ────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="text-[18px] font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h2>
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

function JitStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#0078d4] text-white text-[12px] font-semibold flex items-center justify-center mt-0.5">
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
      className="text-[#0078d4] dark:text-[#85b7eb] hover:underline inline-flex items-center gap-0.5">
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
