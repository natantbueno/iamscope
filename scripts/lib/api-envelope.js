'use strict'
/**
 * O envelope da API pública v1 do IAM Scope.
 *
 * POR QUE É UM MÓDULO E NÃO UM OBJETO DENTRO DE UM SCRIPT
 *   A Fase 1 da API vai gerar 14 arquivos em public/api/v1/. Se cada script
 *   montasse o próprio cabeçalho, os 14 divergiriam — e o consumidor que
 *   escreveu um parser contra um deles quebraria no seguinte. /api/v1/changes.json
 *   é o primeiro arquivo a nascer; build-api.js herda daqui.
 *
 * AS TRÊS REGRAS QUE O ENVELOPE CARREGA
 *
 * 1. `classification` em TODO campo de curadoria.
 *    tier, category, isPrivileged, eamLevel e as regras de SoD são
 *    classificação editorial do IAM Scope — nenhum provedor publica isso. O
 *    eamLevels.ts já diz isso em comentário; comentário de código não chega no
 *    consumidor. É o mesmo defeito do "busca semântica" do Role Advisor: o
 *    produto sabia de uma ressalva e não a dizia em voz alta.
 *
 * 2. Nativo E normalizado, sempre juntos.
 *    `nativeTier: 'FullAccess'` ao lado de `eamLevel: 0`. Só o normalizado
 *    destrói a volta ao dado do provedor; só o nativo torna a API inútil para
 *    quem quer comparar nuvens — que é a razão de ela existir.
 *
 * 3. Atribuição não é opcional.
 *    O eamTier do Entra vem do EntraOps e as API permissions do Graph vêm do
 *    merill/microsoft-info, ambos MIT. A licença MIT exige o aviso de copyright
 *    junto de "substantial portions". Sai em `sources`, em todo arquivo.
 */

const CONTRACT = 'public-v1'
const LICENSE = {
  id: 'CC-BY-4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'IAM Scope — https://iamscope.cloud',
  note: 'A licença cobre a CURADORIA (tier, category, isPrivileged, eamLevel, regras de SoD, '
    + 'equivalências, richDescription e a seleção/estrutura do conjunto). O fato bruto dos provedores '
    + 'não é relicenciado aqui e segue os termos de Microsoft, AWS, Google e IBM.',
}

const SOURCES = [
  {
    id: 'entraops',
    label: 'AzurePrivilegedIAM / EntraOps — Thomas Naunheim',
    url: 'https://github.com/Cloud-Architekt/AzurePrivilegedIAM',
    license: 'MIT',
    covers: ['entraid.roles.eamTier'],
  },
  {
    id: 'microsoft-info',
    label: 'merill/microsoft-info — inventário do service principal do Microsoft Graph',
    url: 'https://github.com/merill/microsoft-info',
    license: 'MIT',
    covers: ['entraid.apiPermissions'],
  },
  {
    id: 'microsoft-learn',
    label: 'Microsoft Learn — Entra ID e Azure RBAC',
    url: 'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    license: 'Termos da Microsoft',
    covers: ['entraid.roles', 'azure-rbac.roles', 'azure-rbac.actions'],
  },
  {
    id: 'aws-managed-policy-reference',
    label: 'AWS Managed Policy Reference',
    url: 'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/policy-list.html',
    license: 'Termos da AWS',
    covers: ['aws.policies'],
  },
  {
    id: 'google-cloud-iam',
    label: 'Google Cloud IAM — Roles and permissions',
    url: 'https://docs.cloud.google.com/iam/docs/roles-permissions',
    license: 'Termos do Google',
    covers: ['gcp.roles', 'gcp.permissions'],
  },
  {
    id: 'google-workspace-admin-help',
    label: 'Google Workspace Admin Help — Prebuilt administrator roles',
    url: 'https://support.google.com/a/answer/2405986',
    license: 'Termos do Google',
    covers: ['google-workspace.roles', 'google-workspace.privileges'],
  },
  {
    id: 'ibm-cloud-docs',
    label: 'IBM Cloud Docs — IAM roles e Managing classic infrastructure access',
    url: 'https://cloud.ibm.com/docs/iam?topic=iam-userroles',
    license: 'Termos da IBM',
    covers: ['ibm-cloud.roles', 'ibm-cloud.classic-permissions'],
  },
]

/**
 * Campos de cada recurso que são curadoria nossa, declarados por nome.
 *
 * Uma lista nominal, e não um `classification` solto no topo do arquivo: o
 * consumidor precisa saber QUAIS campos são editoriais, não que "algo aqui é".
 * Um parser pode ler esta lista e marcar as colunas na própria interface dele.
 */
const EDITORIAL_FIELDS = {
  change: ['type', 'tierFrom', 'tierTo', 'categoryFrom', 'categoryTo', 'privileged', 'sodAdded', 'sodRemoved'],
  role: ['tier', 'nativeTier', 'eamLevel', 'category', 'isPrivileged'],
}

/**
 * Monta o envelope de um arquivo da API v1.
 *
 * @param {object} o
 * @param {string} o.resource      nome do recurso, ex.: 'changes'
 * @param {string} o.description   uma linha sobre o que o arquivo contém
 * @param {string[]} o.editorial   campos de curadoria deste arquivo
 * @param {object} o.meta          metadados específicos do recurso
 * @param {object} o.payload       o corpo, já pronto
 */
function envelope({ resource, description, editorial = [], meta = {}, payload }) {
  return {
    $schema: `https://iamscope.cloud/api/v1/schema/${resource}.json`,
    contract: CONTRACT,
    resource,
    description,
    generatedAt: new Date().toISOString(),
    license: LICENSE,
    sources: SOURCES,
    /**
     * O aviso mais importante do arquivo, e por isso ele fica no envelope e não
     * numa nota de rodapé: os campos listados aqui são classificação do IAM
     * Scope, derivada das permissões oficiais — não são publicados pelos
     * provedores. Quem citar o dado precisa saber qual metade é fato de quem.
     */
    classification: {
      value: 'iamscope-editorial',
      fields: editorial,
      note: 'Os campos listados são classificação editorial do IAM Scope, derivada das permissões '
        + 'oficiais de cada role. Não são classificação do provedor. Os demais campos são fato '
        + 'literal da fonte oficial identificada em `sources`.',
    },
    meta,
    ...payload,
  }
}

module.exports = { CONTRACT, LICENSE, SOURCES, EDITORIAL_FIELDS, envelope }
