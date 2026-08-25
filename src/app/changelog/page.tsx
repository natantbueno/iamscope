import type { Metadata } from 'next'
import ChangelogView from '@/components/ChangelogView'
import { LIMITE_DA_PAGINA } from '@/lib/changelog'
import { loadChangelog } from '@/lib/changelogSource'

/**
 * O changelog global — as seis nuvens numa lista só.
 *
 * Componente de SERVIDOR, avaliado em build time: é ele que lê
 * public/changelog.json do disco e fatia antes de mandar para o cliente. Com
 * `output: 'export'` isso vira HTML materializado, então a lista sai no markup
 * — que é o que importa numa página cujo valor é ser indexada e citada.
 *
 * Metadata em inglês, como as demais rotas: o HTML é gerado uma vez e a troca
 * de idioma acontece no cliente, então title/description não trocam junto.
 */
export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Every change observed in the IAM catalogues of Entra ID, Azure RBAC, AWS, GCP, '
    + 'Google Workspace and IBM Cloud — including tier and segregation-of-duties changes, '
    + 'which no provider publishes. Atom feeds per cloud.',
}

export default function ChangelogPage() {
  const { meta, events } = loadChangelog()
  const visiveis = events.slice(0, LIMITE_DA_PAGINA)
  return (
    <ChangelogView
      events={visiveis}
      meta={meta}
      cloud={null}
      truncated={Math.max(0, events.length - visiveis.length)}
    />
  )
}
