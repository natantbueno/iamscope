// Detalhe de uma permissão do Azure RBAC.
//
// Com `output: 'export'` toda rota dinâmica precisa de generateStaticParams.
// O índice de permissões vive em public/ (fora do bundle), então aqui ele é
// lido do disco em build time — é o mesmo arquivo que o cliente baixa depois.
// A página em si é só um shell: os dados são resolvidos no cliente a partir do
// índice já cacheado, o que mantém o HTML de cada uma das milhares de páginas
// pequeno em vez de embutir a lista de roles em cada arquivo.

import fs from 'fs'
import path from 'path'
import AzurePermissionClient from '@/components/AzurePermissionClient'
import { actionToSlug } from '@/lib/azurePermissions'

interface PermIndex { slugs: string[]; index: Record<string, number[]> }

function readIndex(): PermIndex {
  const p = path.join(process.cwd(), 'public', 'azure-perms-index.json')
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

/** Mesma desambiguação de slug usada em lib/azurePermissions.ts. */
function allSlugs(): string[] {
  const idx = readIndex()
  const seen = new Map<string, number>()
  const out: string[] = []
  for (const action of Object.keys(idx.index).sort()) {
    let slug = actionToSlug(action)
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    if (n > 0) slug = `${slug}-${n + 1}`
    out.push(slug)
  }
  return out
}

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `${slug} · Permissão Azure RBAC` }
}

export default async function AzurePermissionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AzurePermissionClient slug={slug} />
}
