// ── Léxico do Role Advisor ───────────────────────────────────────────────────
//
// Cinco mapas, cinco problemas distintos. Vivem separados do `roleAdvisor.ts`
// porque são CURADORIA — mudam por conhecimento de domínio, não por mudança de
// algoritmo — e porque é aqui que alguém vai mexer quando uma busca falhar.
//
// REGRA DE OURO: nada aqui inventa dado. O léxico só decide QUAIS palavras
// procurar no catálogo; o que é exibido continua vindo do provedor.

import type { AdvisorPlatform } from './roleAdvisor'

// ── 1. Plataforma é ESCOPO, não conteúdo ─────────────────────────────────────
//
// Este é o mapa que conserta o defeito nº 2. Antes, "no Azure" pontuava +12 nas
// ~300 roles cujo NOME começa com "Azure" — e a `Reader`, que é a resposta
// certa para "somente leitura no Azure", ficava de fora porque não tem "Azure"
// no nome. Quando um destes apelidos aparece na frase, ele sai dos termos de
// pontuação e vira filtro de plataforma.
//
// "azure" sozinho é ambíguo de propósito: pode ser Azure RBAC (plano de
// recurso) ou Entra ID (plano de identidade). Sem contexto, aceita os dois —
// errar para o lado de mostrar demais é recuperável; esconder a resposta certa,
// não. Um apelido inequívoco ("entra", "azure rbac") desempata.
export const PLATFORM_ALIASES: { alias: string; platforms: AdvisorPlatform[] }[] = [
  // Os multipalavra vêm primeiro: o casamento é guloso da esquerda para a direita.
  { alias: 'azure active directory', platforms: ['entraId'] },
  { alias: 'microsoft entra id',     platforms: ['entraId'] },
  { alias: 'microsoft entra',        platforms: ['entraId'] },
  { alias: 'entra id',               platforms: ['entraId'] },
  { alias: 'azure ad',               platforms: ['entraId'] },
  { alias: 'microsoft 365',          platforms: ['entraId'] },
  { alias: 'office 365',             platforms: ['entraId'] },
  { alias: 'azure rbac',             platforms: ['azureRbac'] },
  { alias: 'google workspace',       platforms: ['googleWorkspace'] },
  { alias: 'google cloud platform',  platforms: ['gcp'] },
  { alias: 'google cloud',           platforms: ['gcp'] },
  { alias: 'ibm cloud',              platforms: ['ibmCloud'] },
  { alias: 'amazon web services',    platforms: ['aws'] },

  { alias: 'entraid',   platforms: ['entraId'] },
  { alias: 'entra',     platforms: ['entraId'] },
  { alias: 'aad',       platforms: ['entraId'] },
  { alias: 'm365',      platforms: ['entraId'] },
  { alias: 'azure',     platforms: ['azureRbac', 'entraId'] },
  { alias: 'arm',       platforms: ['azureRbac'] },
  { alias: 'aws',       platforms: ['aws'] },
  { alias: 'amazon',    platforms: ['aws'] },
  { alias: 'gcp',       platforms: ['gcp'] },
  { alias: 'workspace', platforms: ['googleWorkspace'] },
  { alias: 'gsuite',    platforms: ['googleWorkspace'] },
  { alias: 'gws',       platforms: ['googleWorkspace'] },
  { alias: 'ibm',       platforms: ['ibmCloud'] },
  { alias: 'softlayer', platforms: ['ibmCloud'] },
]

/**
 * Expansão de um termo, em dois níveis.
 *
 * POR QUE DOIS NÍVEIS, E NÃO UMA LISTA SÓ
 *   A primeira versão dava o mesmo peso a toda expansão. Medido em 07/08:
 *   "senha" abria em password + credential + reset + authentication com peso
 *   igual, e a busca por "resetar senha de usuário" devolvia **Firebase
 *   Authentication editor** e **AKS Cluster User Role** à frente de **Password
 *   Administrator** — porque "authentication" e "credential" aparecem no NOME
 *   daquelas, e "password" só aparecia no nome da role certa.
 *
 *   `strong` é a palavra que o catálogo realmente usa para o conceito; `weak` é
 *   vizinhança que ajuda quando não há nada melhor e que não pode ganhar de uma
 *   tradução direta. A distância entre os dois pesos é o que impede vizinhança
 *   de virar resposta.
 *
 *   Em `strong` vai a palavra como ela aparece em NOME de role, que é o campo
 *   de maior peso: para "leitura" isso é reader/viewer — Azure usa `Reader`,
 *   GCP usa `Viewer` —, não o verbo "read".
 */
export interface Expansion { strong: string[]; weak: string[] }

// ── 2. Conceito: português → o inglês do catálogo ────────────────────────────
//
// Defeito nº 3, primeira metade. Todo o dado é em inglês por decisão registrada
// (docs/ADR-001) e a pessoa escreve em português. Antes, "leitura", "senha" e
// "faturamento" simplesmente não casavam com nada — e o estado vazio pedia para
// "tentar em inglês", o que é transferir o problema para quem veio pedir ajuda.
export const CONCEPT_LEXICON: Record<string, Expansion> = {
  // ── Verbos de acesso ──
  leitura:      { strong: ['reader', 'viewer', 'read'], weak: ['view', 'readonly'] },
  ler:          { strong: ['reader', 'read', 'viewer'], weak: ['view'] },
  ver:          { strong: ['viewer', 'reader'],         weak: ['view', 'read'] },
  visualizar:   { strong: ['viewer', 'reader'],         weak: ['view', 'read'] },
  consultar:    { strong: ['reader', 'viewer'],         weak: ['read'] },
  auditar:      { strong: ['audit', 'auditor'],         weak: ['reader', 'compliance', 'log'] },
  auditoria:    { strong: ['audit', 'auditor'],         weak: ['compliance', 'reader'] },
  escrita:      { strong: ['writer', 'contributor'],    weak: ['write', 'editor'] },
  escrever:     { strong: ['writer', 'contributor'],    weak: ['write', 'editor'] },
  gravar:       { strong: ['writer', 'contributor'],    weak: ['write'] },
  alterar:      { strong: ['editor', 'contributor'],    weak: ['write', 'update'] },
  editar:       { strong: ['editor', 'contributor'],    weak: ['write', 'update'] },
  criar:        { strong: ['creator', 'contributor'],   weak: ['create', 'editor'] },
  apagar:       { strong: ['delete'],                   weak: ['remove', 'admin'] },
  excluir:      { strong: ['delete'],                   weak: ['remove'] },
  gerenciar:    { strong: ['manager', 'admin'],         weak: ['manage', 'administrator'] },
  administrar:  { strong: ['admin', 'administrator'],   weak: ['manager', 'manage'] },
  publicar:     { strong: ['publisher', 'publish'],     weak: ['push', 'writer', 'deploy'] },
  implantar:    { strong: ['deploy', 'deployment'],     weak: ['release', 'contributor'] },
  resetar:      { strong: ['password', 'reset'],        weak: ['credential'] },
  redefinir:    { strong: ['password', 'reset'],        weak: ['credential'] },
  rotacionar:   { strong: ['rotate'],                   weak: ['key', 'secret', 'credential'] },
  aprovar:      { strong: ['approver', 'approval'],     weak: ['approve'] },

  // ── Objetos ──
  usuario:      { strong: ['user'],              weak: ['account'] },
  usuarios:     { strong: ['user'],              weak: ['account'] },
  grupo:        { strong: ['group'],             weak: ['membership', 'directory'] },
  grupos:       { strong: ['group'],             weak: ['membership', 'directory'] },
  senha:        { strong: ['password'],          weak: ['credential', 'reset'] },
  senhas:       { strong: ['password'],          weak: ['credential', 'reset'] },
  segredo:      { strong: ['secret'],            weak: ['credential', 'vault'] },
  segredos:     { strong: ['secret'],            weak: ['credential', 'vault'] },
  cofre:        { strong: ['vault', 'keyvault'], weak: ['key', 'secret'] },
  chave:        { strong: ['key', 'kms'],        weak: ['crypto', 'secret'] },
  chaves:       { strong: ['key', 'kms'],        weak: ['crypto'] },
  certificado:  { strong: ['certificate'],       weak: ['ssl', 'tls', 'cert'] },
  rede:         { strong: ['network', 'networking'], weak: ['vpc', 'subnet'] },
  firewall:     { strong: ['firewall'],          weak: ['network', 'security'] },
  dominio:      { strong: ['domain', 'dns'],     weak: ['zone'] },
  banco:        { strong: ['database', 'sql'],   weak: ['data'] },
  dados:        { strong: ['data'],              weak: ['database', 'storage'] },
  armazenamento:{ strong: ['storage'],           weak: ['blob', 'bucket', 'disk'] },
  arquivo:      { strong: ['file'],              weak: ['storage', 'blob'] },
  maquina:      { strong: ['compute', 'machine'],weak: ['instance'] },
  servidor:     { strong: ['server', 'compute'], weak: ['instance', 'machine'] },
  container:    { strong: ['container'],         weak: ['registry', 'image', 'kubernetes'] },
  conteiner:    { strong: ['container'],         weak: ['registry', 'image', 'kubernetes'] },
  imagem:       { strong: ['image'],             weak: ['registry', 'container', 'artifact'] },
  registro:     { strong: ['registry'],          weak: ['log', 'record'] },
  log:          { strong: ['log', 'logs', 'logging'], weak: ['monitoring'] },
  logs:         { strong: ['log', 'logs', 'logging'], weak: ['monitoring'] },
  monitoramento:{ strong: ['monitoring', 'monitor'],  weak: ['metric', 'observability'] },
  metrica:      { strong: ['metric'],            weak: ['monitoring', 'observability'] },
  faturamento:  { strong: ['billing'],           weak: ['cost', 'invoice', 'payment'] },
  fatura:       { strong: ['billing', 'invoice'],weak: ['cost'] },
  custo:        { strong: ['cost'],              weak: ['billing', 'budget'] },
  custos:       { strong: ['cost'],              weak: ['billing', 'budget'] },
  cobranca:     { strong: ['billing'],           weak: ['cost', 'invoice'] },
  seguranca:    { strong: ['security'],          weak: ['defender', 'protection'] },
  backup:       { strong: ['backup'],            weak: ['restore', 'recovery', 'snapshot'] },
  suporte:      { strong: ['support'],           weak: ['helpdesk'] },
  relatorio:    { strong: ['report', 'reports'], weak: ['reporting', 'insights'] },
  relatorios:   { strong: ['report', 'reports'], weak: ['reporting', 'insights'] },
  dispositivo:  { strong: ['device'],            weak: ['endpoint', 'intune'] },
  aplicacao:    { strong: ['application'],       weak: ['app', 'service'] },
  aplicativo:   { strong: ['application'],       weak: ['app'] },
  assinatura:   { strong: ['subscription'],      weak: ['account'] },
  projeto:      { strong: ['project'],           weak: ['resource'] },
  recurso:      { strong: ['resource'],          weak: ['asset'] },
  recursos:     { strong: ['resource'],          weak: ['asset'] },
  politica:     { strong: ['policy'],            weak: ['rule'] },
  politicas:    { strong: ['policy'],            weak: ['rule'] },
  conformidade: { strong: ['compliance'],        weak: ['governance', 'audit'] },
  identidade:   { strong: ['identity'],          weak: ['directory', 'principal'] },
  cluster:      { strong: ['cluster', 'kubernetes'], weak: ['container'] },
  fila:         { strong: ['queue'],             weak: ['message', 'topic'] },
  funcao:       { strong: ['function'],          weak: ['serverless', 'lambda'] },
}

// ── 3. Intenção → capacidade ─────────────────────────────────────────────────
//
// Defeito nº 3, segunda metade — e o mais difícil. "quero rodar terraform"
// devolvia 2 resultados, ambos sem relação, porque NENHUMA role de NENHUMA
// cloud tem "terraform" no nome ou na descrição. O termo não descreve um objeto
// do catálogo; descreve o que a pessoa vai fazer.
//
// A tradução aqui é editorial e opinativa — mesma natureza da classificação de
// tier do site, e merece o mesmo tratamento: fica registrada, não some no
// código, e a interface diz que interpretou. Muita coisa aqui é `weak` de
// propósito: é palpite sobre intenção, não tradução de palavra.
export const INTENT_LEXICON: Record<string, Expansion> = {
  terraform:   { strong: ['infrastructure'], weak: ['contributor', 'editor', 'resource', 'deployment'] },
  opentofu:    { strong: ['infrastructure'], weak: ['contributor', 'editor', 'resource'] },
  iac:         { strong: ['infrastructure'], weak: ['contributor', 'editor', 'deployment'] },
  ansible:     { strong: [],                 weak: ['contributor', 'operator', 'compute', 'instance'] },
  pipeline:    { strong: ['pipeline'],       weak: ['deploy', 'build', 'release', 'artifact'] },
  esteira:     { strong: ['pipeline'],       weak: ['deploy', 'build', 'release'] },
  cicd:        { strong: ['pipeline'],       weak: ['deploy', 'build', 'release', 'artifact'] },
  devops:      { strong: ['devops'],         weak: ['deploy', 'build', 'release'] },
  deploy:      { strong: ['deploy', 'deployment'], weak: ['release', 'contributor'] },
  kubernetes:  { strong: ['kubernetes'],     weak: ['cluster', 'container', 'gke', 'aks', 'eks'] },
  k8s:         { strong: ['kubernetes'],     weak: ['cluster', 'container'] },
  docker:      { strong: ['container'],      weak: ['registry', 'image'] },
  estagiario:  { strong: ['reader', 'viewer'], weak: ['read', 'readonly'] },
  estagiarios: { strong: ['reader', 'viewer'], weak: ['read', 'readonly'] },
  junior:      { strong: ['reader', 'viewer'], weak: ['read'] },
  terceiro:    { strong: ['guest'],          weak: ['external', 'reader', 'viewer'] },
  terceiros:   { strong: ['guest'],          weak: ['external', 'reader', 'viewer'] },
  fornecedor:  { strong: ['guest'],          weak: ['external', 'reader'] },
  auditor:     { strong: ['auditor', 'audit'], weak: ['reader', 'compliance', 'security'] },
  helpdesk:    { strong: ['helpdesk'],       weak: ['support', 'password', 'user'] },
  onboarding:  { strong: [],                 weak: ['user', 'account', 'provisioning', 'identity'] },
  offboarding: { strong: [],                 weak: ['user', 'account', 'delete', 'identity'] },
  jit:         { strong: ['privileged'],     weak: ['eligible', 'identity', 'management'] },
  pim:         { strong: ['privileged'],     weak: ['identity', 'management', 'eligible'] },
  emergencia:  { strong: [],                 weak: ['break', 'glass', 'privileged', 'global'] },
  observabilidade: { strong: ['observability', 'monitoring'], weak: ['log', 'metric', 'monitor'] },
  serverless:  { strong: ['function', 'serverless'], weak: ['lambda', 'run'] },
  datalake:    { strong: ['lake'],           weak: ['data', 'storage', 'analytics'] },
  etl:         { strong: ['dataflow'],       weak: ['data', 'pipeline', 'analytics'] },
  llm:         { strong: ['ai'],             weak: ['machine', 'learning', 'vertex', 'cognitive'] },
}

// ── 4. Marcadores de negação ─────────────────────────────────────────────────
//
// Defeito nº 1, o mais grave. Cada entrada consome os N termos seguintes e os
// joga na lista de exclusão. `span` é quantos termos o marcador alcança.
//
// Alcance curto é deliberado. Numa frase como "acesso total ao Kubernetes, sem
// billing, e leitura no Storage", um alcance longo engoliria "leitura" e
// "storage" — trocar um falso positivo por um falso negativo silencioso é pior,
// porque a interface mostra o que foi excluído e a pessoa vê o erro.
export const NEGATION_MARKERS: { marker: string; span: number }[] = [
  { marker: 'sem permissao de', span: 2 },
  { marker: 'sem permissao',    span: 2 },
  { marker: 'sem acesso a',     span: 2 },
  { marker: 'sem acesso',       span: 2 },
  { marker: 'sem tocar em',     span: 2 },
  { marker: 'sem tocar',        span: 2 },
  { marker: 'nao quero dar',    span: 3 },
  { marker: 'nao quero',        span: 3 },
  { marker: 'nao pode',         span: 3 },
  { marker: 'nao deve',         span: 3 },
  { marker: 'nada de',          span: 2 },
  { marker: 'exceto',           span: 2 },
  { marker: 'menos',            span: 2 },
  { marker: 'sem',              span: 2 },
  { marker: 'without',          span: 2 },
  { marker: 'excluding',        span: 2 },
  { marker: 'except',           span: 2 },
  { marker: 'not',              span: 2 },
]

// POR QUE 'no' NÃO ESTÁ NA LISTA
//   Entrou na primeira versão como negação em inglês e foi removido no mesmo
//   dia, pelo teste: "quero rodar terraform **no** meu ambiente" excluía
//   "ambiente", e "publicar imagem **no** registry" excluía "registry" — a
//   consulta perdia justamente a palavra que importava. Em português "no" é
//   preposição e aparece em quase toda frase. "without", "not" e "except" dão
//   conta do inglês; o custo de perder "no billing" é muito menor que o de
//   quebrar toda frase em português.
//
//   Nota: "no Azure" continua funcionando porque o escopo de plataforma é
//   consumido ANTES da negação — "no azure" some inteiro do texto ali.

// ── 5. Sinais de que a pessoa QUER poder alto ────────────────────────────────
//
// A versão anterior multiplicava por 0,85 toda role privilegiada, sempre. Numa
// consulta como "quem tem acesso equivalente a root ou owner", isso empurra
// para baixo exatamente o que foi pedido. A penalidade continua existindo — não
// se recomenda role destrutiva por acaso — mas some quando o pedido é explícito.
export const PRIVILEGE_INTENT = new Set([
  'admin', 'administrator', 'administrador', 'administrar', 'root', 'owner',
  'dono', 'total', 'full', 'completo', 'privilegiada', 'privilegiado',
  'privileged', 'superadmin', 'super', 'global', 'elevado', 'maximo',
])

/** Peso de uma tradução direta, contra 1,0 do termo escrito pela pessoa. */
export const STRONG_WEIGHT = 0.85
/** Peso de vizinhança semântica. A distância para o `strong` é o ponto. */
export const WEAK_WEIGHT = 0.32
