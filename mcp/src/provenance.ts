// provenance.ts — o envelope que sai grudado em toda resposta de ferramenta.
//
// POR QUE UM ENVELOPE, E NÃO UMA NOTA NO README
//   O README é lido por quem instala. O modelo lê o retorno da ferramenta. Se
//   a marcação de curadoria mora só na documentação, ela não existe para o
//   único leitor que vai transformar este dado em frase — e a frase sai
//   dizendo que "a Microsoft classifica o Global Administrator como EAM 0",
//   que é falso: quem classifica somos nós.
//
//   Mesmo defeito do "busca semântica" do Role Advisor, e mesma correção:
//   a afirmação de método viaja junto com o resultado.

/** As três camadas do DATA-LICENSE.md, como valores que a resposta carrega. */
export type Classification =
  /** Fato publicado pelo provedor. Nome, id, ação, descrição oficial. */
  | 'provider-fact'
  /** Trabalho editorial do IAM Scope. CC BY 4.0. */
  | 'iamscope-editorial'
  /** Editorial nosso, mas derivado de projeto MIT de terceiro. */
  | 'iamscope-editorial-derived'

/**
 * Quais campos de um resultado são curadoria — enumerados por nome, para o
 * consumidor poder apontar sem adivinhar.
 *
 * A lista sai do DATA-LICENSE.md, camada 2. Quando um campo novo de curadoria
 * nascer no site, ele entra aqui — e `scripts/smoke.mjs` falha se um campo
 * listado sumir do retorno, que é o jeito de a lista não envelhecer sozinha.
 */
export const EDITORIAL_FIELDS = [
  'tier',
  'nativeTier',
  'eamLevel',
  'eamTier',
  'category',
  'isPrivileged',
  'severity',
  'riskLevel',
  'risk',
  'mitigations',
  'frameworks',
  'richDescription',
] as const

export const LICENSE = {
  curation: 'CC-BY-4.0',
  curationUrl: 'https://creativecommons.org/licenses/by/4.0/',
  providerFacts:
    'Fato bruto de Microsoft, AWS, Google e IBM — não relicenciado por este pacote; valem os termos de uso de cada provedor.',
  attributionLine:
    'Classificação de risco e tiers: IAM Scope (https://iamscope.cloud), CC BY 4.0. Não modificado.',
} as const

/**
 * Atribuição de terceiros. Obrigatória, não decorativa: os dois projetos são
 * MIT e a licença exige o crédito em qualquer redistribuição — e este pacote
 * redistribui o dado deles em toda resposta que toca Entra ID.
 */
export const THIRD_PARTY = [
  {
    source: 'AzurePrivilegedIAM / EntraOps',
    author: 'Thomas Naunheim',
    license: 'MIT',
    url: 'https://github.com/Cloud-Architekt/AzurePrivilegedIAM',
    covers: 'O eamTier das 144 directory roles do Entra ID',
  },
  {
    source: 'merill/microsoft-info',
    author: 'Merill Fernando',
    license: 'MIT',
    url: 'https://github.com/merill/microsoft-info',
    covers: 'O inventário das API permissions do Microsoft Graph',
  },
] as const

/** Plataformas em que a curadoria de terceiros efetivamente aparece. */
const THIRD_PARTY_PLATFORMS = new Set(['entraId', 'entra-id'])

export interface Envelope {
  source: 'iamscope-mcp'
  version: string
  catalog: string
  license: typeof LICENSE
  classification: {
    editorialFields: readonly string[]
    note: string
  }
  attribution: readonly unknown[]
  guardrail: string
}

const GUARDRAIL_TEXT =
  'Toda role citada na sua resposta tem de ter vindo de um retorno de ferramenta deste servidor. ' +
  'Nome que você não viu aqui não existe até prova em contrário: passe-o por verify_role_names antes de escrever. ' +
  'Se a verificação disser NOT_IN_CATALOG, não cite o nome — diga que não achou.'

const CLASSIFICATION_NOTE =
  'Os campos listados em editorialFields são classificação editorial do IAM Scope, não são publicados por provedor nenhum. ' +
  'Ao citá-los, atribua a fonte; não os apresente como posição oficial da Microsoft, AWS, Google ou IBM.'

export function envelope(version: string, catalogDate: string, platforms: string[] = []): Envelope {
  const touchesThirdParty = platforms.length === 0 || platforms.some((p) => THIRD_PARTY_PLATFORMS.has(p))
  return {
    source: 'iamscope-mcp',
    version,
    catalog: catalogDate,
    license: LICENSE,
    classification: { editorialFields: EDITORIAL_FIELDS, note: CLASSIFICATION_NOTE },
    attribution: touchesThirdParty ? THIRD_PARTY : [],
    guardrail: GUARDRAIL_TEXT,
  }
}

/** Instruções do servidor. Os clientes MCP passam isto ao modelo antes da primeira chamada. */
export const SERVER_INSTRUCTIONS = `
Este servidor responde sobre controle de acesso em seis nuvens — Entra ID, Azure RBAC, AWS IAM,
GCP IAM, Google Workspace e IBM Cloud — a partir de um catálogo que roda inteiro na máquina de
quem pergunta. Nada do que passa por aqui sai para a rede.

REGRA QUE NÃO TEM EXCEÇÃO
  Toda role, policy ou permissão que você citar tem de ter vindo do retorno de uma ferramenta
  deste servidor, nesta conversa. Você não sabe de cor os nomes de role destas plataformas: são
  4.603 roles e mais de 32 mil permissões, e nomes plausíveis que não existem — roles/bigquery.readOnly
  é o exemplo canônico — são exatamente o tipo de coisa que se inventa sem perceber.

  Antes de escrever um nome que não veio de uma chamada, passe por verify_role_names. Se voltar
  NOT_IN_CATALOG, o nome não entra na resposta.

O QUE É CURADORIA, E PRECISA SAIR DITO
  tier, eamLevel, category, isPrivileged, severity e as regras de SoD são classificação editorial
  do IAM Scope (CC BY 4.0). Nenhum provedor publica isso. Ao usá-los, diga de onde vêm — não os
  apresente como posição oficial da Microsoft, AWS, Google ou IBM. Nome, identificador, ação e
  descrição oficial, esses sim são fato do provedor.

ESCREVER CUSTOM ROLE DO AZURE
  Existe um caminho proprio para isso, e ele nao passa por adivinhacao: descubra o provider com
  list_azure_providers, ache a acao com search_azure_actions, confira o que cada wildcard cobre com
  expand_azure_wildcard, e passe o JSON rascunhado por check_azure_custom_role ANTES de mostra-lo.

  Duas coisas que so aparecem nessa conferencia: acao que nao existe (o comando az role
  definition create falha sem dizer qual linha), e NotActions que nao subtrai nada — a pessoa acha que fechou um
  buraco que continua aberto. E se um built-in ja cobrir tudo, diga isso: custom role tem custo
  permanente.

QUANDO A BUSCA NÃO ACHA
  search_roles devolve um campo "plan" com os termos que entendeu, o escopo que deduziu, o que
  excluiu e o que não casou com nada. Quando o resultado vier fraco, leia o plan e diga o que
  não casou, em vez de preencher a lacuna com o que parece razoável.
`.trim()
