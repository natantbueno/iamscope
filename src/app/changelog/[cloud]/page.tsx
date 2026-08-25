import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ChangelogView from '@/components/ChangelogView'
import { LIMITE_DA_PAGINA, CHANGE_CLOUDS, type ChangeCloud } from '@/lib/changelog'
import { loadChangelog } from '@/lib/changelogSource'

/**
 * O changelog de uma nuvem.
 *
 * `generateStaticParams` é obrigatório com `output: 'export'` — sem ele o build
 * aborta na rota dinâmica. As seis nuvens vêm de CHANGE_CLOUDS, não do
 * changelog.json: a página de uma nuvem que ainda não teve mudança nenhuma
 * PRECISA existir, porque é dela que sai o link do feed. Uma rota que só nasce
 * depois da primeira mudança daria 404 exatamente para quem quer ser avisado
 * antes de a mudança acontecer.
 */
const ROTULO: Record<ChangeCloud, string> = {
  'entraid': 'Entra ID',
  'azure-rbac': 'Azure RBAC',
  'aws': 'AWS IAM',
  'gcp': 'GCP IAM',
  'google-workspace': 'Google Workspace',
  'ibm-cloud': 'IBM Cloud',
}

export function generateStaticParams() {
  return CHANGE_CLOUDS.map((cloud) => ({ cloud }))
}

// `params` é Promise no Next 15 — é assim em todas as rotas dinâmicas do
// projeto (ver /gcp/roles/[slug]).
export async function generateMetadata({ params }: { params: Promise<{ cloud: string }> }): Promise<Metadata> {
  const { cloud } = await params
  const nome = ROTULO[cloud as ChangeCloud] ?? cloud
  return {
    title: `${nome} — Changelog`,
    description: `Every change observed in the ${nome} IAM catalogue: roles created and removed, `
      + 'description and permission changes, plus tier and segregation-of-duties changes, '
      + `which no provider publishes. Atom feed available, including a privileged-only cut.`,
  }
}

export default async function ChangelogDaNuvemPage({ params }: { params: Promise<{ cloud: string }> }) {
  const { cloud: bruto } = await params
  const cloud = bruto as ChangeCloud
  if (!CHANGE_CLOUDS.includes(cloud)) notFound()

  const { meta, events } = loadChangelog()
  const daNuvem = events.filter((e) => e.cloud === cloud)
  const visiveis = daNuvem.slice(0, LIMITE_DA_PAGINA)

  return (
    <ChangelogView
      events={visiveis}
      meta={meta}
      cloud={cloud}
      truncated={Math.max(0, daNuvem.length - visiveis.length)}
    />
  )
}
