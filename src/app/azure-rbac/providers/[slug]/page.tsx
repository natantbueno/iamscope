// Detalhe de um resource provider do Azure RBAC.
//
// Com `output: 'export'` toda rota dinâmica precisa de generateStaticParams.
// O índice dos providers vive em public/ (fora do bundle), então aqui ele é
// lido do disco em build time — é o mesmo arquivo que o cliente baixa depois.
// A página em si é só um shell: os dados vêm de
// public/azure-providers/<slug>.json, resolvidos no cliente, o que mantém
// pequeno o HTML de cada uma das 151 páginas em vez de embutir até 1.696 ações
// com descrição em cada arquivo.

import fs from 'fs'
import path from 'path'
import AzureProviderClient from '@/components/AzureProviderClient'

interface ProviderIndex {
  providers: { slug: string; name: string; actions: number }[]
}

function readIndex(): ProviderIndex {
  const p = path.join(process.cwd(), 'public', 'azure-providers', 'index.json')
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

export function generateStaticParams() {
  return readIndex().providers.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = readIndex().providers.find((x) => x.slug === slug)
  // Nome de provider é nome próprio: fica em inglês nos dois idiomas.
  return { title: p ? `${p.name} · Azure RBAC` : `${slug} · Azure RBAC` }
}

export default async function AzureProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <AzureProviderClient slug={slug} />
}
