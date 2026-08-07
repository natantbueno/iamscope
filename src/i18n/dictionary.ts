/**
 * Dicionário da INTERFACE.
 *
 * O que entra aqui: navegação, botões, filtros, cabeçalhos de tabela, avisos e
 * os rótulos da classificação editorial do IAM Scope (tier, categoria).
 *
 * O que NÃO entra: descrição oficial, nome de role/policy, action ou permission.
 * Esses ficam em inglês sempre — ver docs/ADR-001-idioma-dos-dados.md.
 *
 * Convenção de chave: `area.item` — dois segmentos, só letras (o checador de
 * escopo não enxerga chave com dígito ou com três segmentos). Chave sem
 * tradução aparece crua na tela, de propósito: é mais fácil notar um
 * `table.priv` na interface do que um texto em português vazando na versão em
 * inglês.
 *
 * A prosa longa das páginas de conteúdo mora em `./pages.ts` e é fundida no
 * DICTIONARY no fim deste arquivo — ver o cabeçalho de lá para o porquê.
 */

import { PAGES_DICTIONARY } from './pages'

const SHARED = {
  // ── Ações comuns ──────────────────────────────────────────────────────────
  'action.search':        { pt: 'Buscar',              en: 'Search' },
  'action.export':        { pt: 'Exportar',            en: 'Export' },
  'action.clear':         { pt: 'Limpar',              en: 'Clear' },
  'action.clearFilters':  { pt: 'Limpar filtros',      en: 'Clear filters' },
  'action.evaluate':      { pt: 'Avaliar',              en: 'Evaluate' },
  'action.evaluateRole':  { pt: 'Avaliar role',         en: 'Evaluate role' },

  // ── Rótulos de CONTAGEM ───────────────────────────────────────────────────
  // Vêm sempre depois de um número, então são plurais. Antes a home
  // reaproveitava `table.category` (cabeçalho de coluna, singular por
  // definição) e imprimia "13 Categoria". Nomes de produto — Roles, Policies,
  // Actions — ficam iguais nos dois idiomas, como manda o ADR-001.
  'count.roles':            { pt: 'Roles',              en: 'Roles' },
  'count.iamRoles':         { pt: 'IAM Roles',          en: 'IAM Roles' },
  'count.policies':         { pt: 'Policies',           en: 'Policies' },
  'count.actions':          { pt: 'Actions',            en: 'Actions' },
  'count.roleActions':      { pt: 'Role Actions',       en: 'Role Actions' },
  'count.apiPermissions':   { pt: 'API Permissions',    en: 'API Permissions' },
  'count.permissions':      { pt: 'Permissões',         en: 'Permissions' },
  'count.services':         { pt: 'Serviços',           en: 'Services' },
  'count.categories':       { pt: 'Categorias',         en: 'Categories' },
  'count.privileged':       { pt: 'Privilegiadas',      en: 'Privileged' },
  'count.oauthScopes':      { pt: 'OAuth Scopes',       en: 'OAuth Scopes' },
  'count.accessPrimitives': { pt: 'Access Primitives',  en: 'Access Primitives' },

  // ── Rótulos da linha de KPI das landings ──────────────────────────────────
  // Antes cada landing escrevia os quatro rótulos à mão, e três delas
  // misturavam português e inglês na mesma linha ("Total Policies · Privileged
  // · FullAccess · Categorias").
  'kpi.builtinRoles':     { pt: 'Built-in roles',      en: 'Built-in roles' },
  'kpi.totalRoles':       { pt: 'Total de roles',      en: 'Total roles' },
  'kpi.totalPolicies':    { pt: 'Total de policies',   en: 'Total policies' },
  'kpi.adminRoles':       { pt: 'Admin roles',         en: 'Admin roles' },
  'kpi.fullAccess':       { pt: 'Full access',         en: 'Full access' },
  'kpi.fullControl':      { pt: 'Full control',        en: 'Full control' },
  'kpi.adminOwner':       { pt: 'Admin / Owner',       en: 'Admin / Owner' },
  'kpi.accountAdmin':     { pt: 'Account admin',       en: 'Account admin' },
  'kpi.restrictedScopes': { pt: 'Scopes restritos',    en: 'Restricted scopes' },
  'count.total':          { pt: 'Total',              en: 'Total' },

  // ── SUBTÍTULOS de cabeçalho das listagens ─────────────────────────────────
  // Dizem o QUE a página lista, nunca QUANTOS itens ela tem: a contagem já
  // aparece logo abaixo, na StatsBar, com o recorte por tier e link de filtro.
  // Repetir o número no subtítulo dava duas fontes para o mesmo fato — e as
  // duas divergiam assim que um filtro entrava.
  'sub.entraRoleActions': { pt: 'Actions distintas usadas pelas roles built-in do Entra ID',
                            en: 'Distinct actions used by Entra ID built-in roles' },
  'sub.azureRoles':       { pt: 'Roles built-in do Azure RBAC classificadas por risk tier',
                            en: 'Azure RBAC built-in roles classified by risk tier' },
  'sub.azurePerms':       { pt: 'Catálogo de actions concedidas pelas built-in roles',
                            en: 'Catalogue of actions granted by the built-in roles' },
  'sub.awsPolicies':      { pt: 'Managed policies, service roles e permission sets da AWS',
                            en: 'AWS managed policies, service roles and permission sets' },
  'sub.awsActions':       { pt: 'Padrões de action usados pelas managed policies',
                            en: 'Action patterns used by the managed policies' },
  'sub.gcpRoles':         { pt: 'Predefined roles do GCP IAM classificadas por tier',
                            en: 'GCP IAM predefined roles classified by tier' },
  'sub.gcpPerms':         { pt: 'Permissões concedidas pelas predefined roles',
                            en: 'Permissions granted by the predefined roles' },
  'sub.gwsRoles':         { pt: 'Roles de administração do Google Workspace por admin tier',
                            en: 'Google Workspace admin roles by admin tier' },
  'sub.gwsPrivileges':    { pt: 'Privilégios oficiais de administração do Google Workspace',
                            en: 'Official Google Workspace admin privileges' },
  'sub.gwsScopes':        { pt: 'Escopos OAuth por serviço e nível de sensibilidade',
                            en: 'OAuth scopes by service and sensitivity level' },
  'sub.ibmRoles':         { pt: 'Roles de IAM da IBM Cloud — platform e service',
                            en: 'IBM Cloud IAM roles — platform and service' },

  // Rótulos usados só nas StatsBar das listagens.
  'label.wildcards':      { pt: 'Wildcards',           en: 'Wildcards' },
  'label.groups':         { pt: 'Grupos',              en: 'Groups' },
  'label.subPrivileges':  { pt: 'Sub-privilégios',     en: 'Sub-privileges' },
  'label.namespaces':     { pt: 'Namespaces',          en: 'Namespaces' },
  'label.providers':      { pt: 'Providers',           en: 'Providers' },
  'label.types':          { pt: 'Tipos',               en: 'Types' },

  // Frescor do dado na página de detalhe. Ver getPlatformSync().
  'sync.verifiedOn':      { pt: 'Dado verificado em',   en: 'Data verified on' },
  'sync.source':          { pt: 'Fonte',                en: 'Source' },
  'action.copy':          { pt: 'Copiar',              en: 'Copy' },
  'action.download':      { pt: 'Baixar',              en: 'Download' },
  'action.back':          { pt: 'Voltar',              en: 'Back' },
  'action.showMore':      { pt: 'Ver mais',            en: 'Show more' },
  'action.collapseAll':   { pt: 'Recolher tudo',       en: 'Collapse all' },
  'action.expandAll':     { pt: 'Expandir tudo',       en: 'Expand all' },

  // ── Paginação ─────────────────────────────────────────────────────────────
  'pagination.perPage':   { pt: 'Por página',          en: 'Per page' },
  'pagination.all':       { pt: 'Tudo',                en: 'All' },
  'pagination.of':        { pt: 'de',                  en: 'of' },
  'pagination.empty':     { pt: 'Nenhum resultado',    en: 'No results' },
  'pagination.first':     { pt: 'Primeira página',     en: 'First page' },
  'pagination.prev':      { pt: 'Página anterior',     en: 'Previous page' },
  'pagination.next':      { pt: 'Próxima página',      en: 'Next page' },
  'pagination.last':      { pt: 'Última página',       en: 'Last page' },
  'pagination.heavy':     { pt: 'linhas — pode travar por alguns segundos',
                            en: 'rows — may freeze for a few seconds' },

  // ── Cabeçalhos de tabela ──────────────────────────────────────────────────
  'table.role':           { pt: 'Role',                en: 'Role' },
  'table.policy':         { pt: 'Policy',              en: 'Policy' },
  'table.description':    { pt: 'Descrição',           en: 'Description' },
  'table.tier':           { pt: 'Tier',                en: 'Tier' },
  'table.category':       { pt: 'Categoria',           en: 'Category' },
  'table.type':           { pt: 'Tipo',                en: 'Type' },
  'table.scope':          { pt: 'Escopo',              en: 'Scope' },
  'table.priv':           { pt: 'Priv.',               en: 'Priv.' },
  'table.permission':     { pt: 'Permissão',           en: 'Permission' },
  'table.permissions':    { pt: 'Permissões',          en: 'Permissions' },
  'table.action':         { pt: 'Action',              en: 'Action' },
  'table.actions':        { pt: 'Actions',             en: 'Actions' },
  'table.service':        { pt: 'Serviço',             en: 'Service' },
  'table.resource':       { pt: 'Recurso',             en: 'Resource' },
  'table.verb':           { pt: 'Verbo',               en: 'Verb' },
  'table.severity':       { pt: 'Severidade',          en: 'Severity' },
  'table.identity':       { pt: 'Identidade',          en: 'Identity' },
  'table.source':         { pt: 'Fonte',               en: 'Source' },
  'table.badge':          { pt: 'Badge',               en: 'Badge' },
  'table.example':        { pt: 'Exemplo',             en: 'Example' },
  'table.meaning':        { pt: 'Significado',         en: 'Meaning' },
  'table.part':           { pt: 'Parte',               en: 'Part' },

  // ── Filtros ───────────────────────────────────────────────────────────────
  'filter.all':           { pt: 'Todos',               en: 'All' },
  'filter.allFem':        { pt: 'Todas',               en: 'All' },
  'filter.privilegedOnly':{ pt: 'Somente privilegiadas', en: 'Privileged only' },
  'filter.privileged':    { pt: 'Privilegiadas',       en: 'Privileged' },
  'filter.deprecated':    { pt: 'Descontinuada',       en: 'Deprecated' },

  // Níveis do Enterprise Access Model. São nomes próprios do modelo da
  // Microsoft — iguais nos dois idiomas, como os nomes de role (ADR-001).
  // Existem como chave para que a barra de filtro seja 100% dicionário, e não
  // metade chave / metade texto cru.
  'tier.controlPlane':    { pt: 'Control Plane',       en: 'Control Plane' },
  'tier.managementPlane': { pt: 'Management Plane',    en: 'Management Plane' },
  'tier.userAccess':      { pt: 'User Access',         en: 'User Access' },
  'tier.unclassified':    { pt: 'Unclassified',        en: 'Unclassified' },

  // ── Estados ───────────────────────────────────────────────────────────────
  'state.loading':        { pt: 'Carregando…',         en: 'Loading…' },
  'state.empty':          { pt: 'Nenhum resultado encontrado.', en: 'No results found.' },
  'state.error':          { pt: 'Não foi possível carregar os dados.',
                            en: 'Could not load the data.' },

  // ── Navegação ─────────────────────────────────────────────────────────────
  'nav.dashboard':        { pt: 'Dashboard',           en: 'Dashboard' },
  'nav.roles':            { pt: 'Roles',               en: 'Roles' },
  'nav.permissions':      { pt: 'Permissões',          en: 'Permissions' },
  'nav.actions':          { pt: 'Actions',             en: 'Actions' },
  'nav.reference':        { pt: 'Referência',          en: 'Reference' },
  'nav.info':             { pt: 'Informações',         en: 'Info' },
  'nav.roleAdvisor':      { pt: 'Role Advisor',        en: 'Role Advisor' },
  'nav.compare':          { pt: 'Multi-Cloud Compare', en: 'Multi-Cloud Compare' },
  'nav.evaluator':        { pt: 'Role Evaluator',      en: 'Role Evaluator' },
  'nav.sod':              { pt: 'SoD Analyzer',        en: 'SoD Analyzer' },
  'nav.permissionScope':  { pt: 'Permission Scope',    en: 'Permission Scope' },
  'nav.tierComparison':   { pt: 'Comparação de Tier 0', en: 'Tier 0 Comparison' },

  // ── Sidebar ───────────────────────────────────────────────────────────────
  'sidebar.about':         { pt: 'Sobre o IAM Scope',   en: 'About IAM Scope' },
  'sidebar.accessModels':  { pt: 'Modelos de Acesso',   en: 'Access models' },
  'sidebar.categories':    { pt: 'Categorias',          en: 'Categories' },
  'sidebar.tools':         { pt: 'Ferramentas',         en: 'Tools' },
  'sidebar.multiCloudRef': { pt: 'Referência multi-cloud de IAM',
                             en: 'Multi-cloud IAM reference' },
  'sidebar.sixPlatforms':  { pt: '6 plataformas em um só lugar',
                             en: '6 platforms in one place' },
  /**
   * Aviso de que o tier NÃO vem do provedor. O nome do tier muda por cloud
   * (Admin/Access/Role/Risk), então a chave guarda só o sufixo.
   */
  'sidebar.ownClassification': { pt: 'classificação própria', en: 'our own classification' },

  // ── Busca global (/search) ────────────────────────────────────────────────
  'search.title':         { pt: 'Busca global',          en: 'Global search' },
  'search.sub':           { pt: '{n} roles e policies nas 6 clouds',
                            en: '{n} roles and policies across 6 clouds' },
  'search.subWithQuery':  { pt: '{n} resultado(s) para "{q}"',
                            en: '{n} result(s) for "{q}"' },
  'search.emptyTitle':    { pt: 'Digite na barra de busca acima',
                            en: 'Type in the search bar above' },
  'search.emptyHint':     { pt: 'Procure por nome, slug, GUID ou ARN entre as {n} roles e policies das seis clouds. O índice só é baixado quando você busca.',
                            en: 'Search by name, slug, GUID or ARN across {n} roles and policies from all six clouds. The index is only downloaded when you search.' },
  'search.noResults':     { pt: 'Nada encontrado para "{q}"',
                            en: 'Nothing found for "{q}"' },
  'search.noResultsHint': { pt: 'A busca cobre roles e policies. Para procurar uma action ou permission específica, use o Permission Scope.',
                            en: 'This search covers roles and policies. To look for a specific action or permission, use Permission Scope.' },
  'search.looksLikeAction': { pt: 'Isso parece uma action ou permission — a busca certa para esse caso é o',
                              en: 'That looks like an action or permission — the right tool for it is' },

  // ── Proveniência do dado ──────────────────────────────────────────────────
  'origin.official':      { pt: 'Texto oficial do provedor, mantido em inglês',
                            en: 'Official text from the provider' },
  'origin.editorial':     { pt: 'Classificação editorial do IAM Scope',
                            en: 'IAM Scope editorial classification' },
  'origin.notTranslated': { pt: 'Descrições e identificadores permanecem em inglês porque são o texto literal publicado pelo provedor.',
                            en: 'Descriptions and identifiers are the provider’s literal published text.' },
  // Rótulo curto do badge que acompanha o tier. Fica ao lado do valor, não no
  // rodapé: quem chega por busca cai direto na página de detalhe e nunca veria
  // um aviso que só existe na sidebar.
  'origin.badgeEditorial':  { pt: 'IAM Scope',           en: 'IAM Scope' },
  'origin.badgeEntraOps':   { pt: 'EntraOps · EAM',      en: 'EntraOps · EAM' },
  'origin.tipEditorial':    { pt: 'Tier e categoria são classificação editorial do IAM Scope, derivada das permissões oficiais desta role. O provedor não publica essa classificação.',
                              en: 'Tier and category are IAM Scope editorial classification, derived from this role’s official permissions. The provider does not publish this classification.' },
  'origin.tipEntraOps':     { pt: 'Tier vem da classificação do EntraOps / AzurePrivilegedIAM, que segue o Enterprise Access Model da Microsoft. Não é um rótulo publicado pela Microsoft.',
                              en: 'Tier comes from the EntraOps / AzurePrivilegedIAM classification, which follows Microsoft’s Enterprise Access Model. It is not a label published by Microsoft.' },
  'origin.tierIsOurs':      { pt: 'Classificação nossa',  en: 'Our classification' },

  // ── Substantivos da paginação ("120 de 2.381 roles") ──────────────────────
  'noun.roles':           { pt: 'roles',               en: 'roles' },
  'noun.policies':        { pt: 'policies',            en: 'policies' },
  'noun.permissions':     { pt: 'permissões',          en: 'permissions' },
  'noun.actions':         { pt: 'actions',             en: 'actions' },
  'noun.privileges':      { pt: 'privilégios',         en: 'privileges' },
  'noun.scopes':          { pt: 'scopes',              en: 'scopes' },
  'noun.rules':           { pt: 'regras',              en: 'rules' },
  'noun.items':           { pt: 'itens',               en: 'items' },

  // ── Frescor / proveniência dos dados ──────────────────────────────────────
  'data.lastCheck':       { pt: 'Última verificação',   en: 'Last checked' },
  'data.dataset':         { pt: 'Conjunto de dados',    en: 'Dataset' },
  'data.sources':         { pt: 'Fontes de dados',      en: 'Data sources' },
  'data.exportFreshness': { pt: 'Exportar frescor dos dados', en: 'Export data freshness' },
  'data.officialDocs':    { pt: 'Documentação Oficial',  en: 'Official documentation' },
  'data.seeOnLearn':      { pt: 'Ver documentação oficial na Microsoft Learn',
                            en: 'View the official documentation on Microsoft Learn' },

  // ── Seções e agrupamentos ─────────────────────────────────────────────────
  'section.byCategory':      { pt: 'Por Categoria',      en: 'By category' },
  'section.tierDistribution':{ pt: 'Distribuição por Tier', en: 'Distribution by tier' },
  'section.riskTierDist':    { pt: 'Distribuição por Risk Tier', en: 'Distribution by risk tier' },
  'section.categoriesByService': { pt: 'Categorias por Serviço', en: 'Categories by service' },
  'section.assignmentScopes':{ pt: 'Escopos de Atribuição', en: 'Assignment scopes' },
  'section.mitigations':     { pt: 'Mitigações',         en: 'Mitigations' },

  // ── Campos e rótulos ──────────────────────────────────────────────────────
  'table.operation':      { pt: 'Operação',             en: 'Operation' },
  'table.content':        { pt: 'Conteúdo',             en: 'Content' },
  'table.services':       { pt: 'Serviços',             en: 'Services' },
  'label.serviceColon':   { pt: 'Serviço:',             en: 'Service:' },
  'label.specific':       { pt: 'Específica',           en: 'Specific' },
  'label.specificPlural': { pt: 'Específicas',          en: 'Specific' },
  'label.unclassified':   { pt: 'Não classificado (Unclassified)', en: 'Unclassified' },
  'label.unclassifiedFem':{ pt: 'Não classificadas',    en: 'Unclassified' },

  // ── Ações extras ──────────────────────────────────────────────────────────
  'action.copyJson':      { pt: 'Copiar JSON',          en: 'Copy JSON' },
  'action.showLess':      { pt: 'Mostrar menos',        en: 'Show less' },
  'action.clearSearch':   { pt: 'Limpar busca',         en: 'Clear search' },
  'action.clearInline':   { pt: '× limpar',             en: '× clear' },

  // ── Estados vazios ────────────────────────────────────────────────────────
  'empty.roles':          { pt: 'Nenhuma role encontrada.',      en: 'No roles found.' },
  'empty.permissions':    { pt: 'Nenhuma permissão encontrada.', en: 'No permissions found.' },
  'empty.actions':        { pt: 'Nenhuma action encontrada.',    en: 'No actions found.' },
  'empty.roleNotFound':   { pt: 'Role não encontrada',           en: 'Role not found' },
  'empty.nameNotInJson':  { pt: '(nome não encontrado no JSON)', en: '(name not found in the JSON)' },
  'empty.select':         { pt: '— selecione —',                 en: '— select —' },

  // ── Placeholders de busca ─────────────────────────────────────────────────
  'ph.filterActions':     { pt: 'Filtrar actions...',   en: 'Filter actions…' },
  'ph.searchPermission':  { pt: 'Buscar permissão (ex.: Microsoft.Storage/storageAccounts/listKeys/action)',
                            en: 'Search a permission (e.g. Microsoft.Storage/storageAccounts/listKeys/action)' },
  'ph.searchActionOrDesc':{ pt: 'Buscar action ou descrição — ex.: listKeys, storageAccounts, Microsoft.Compute',
                            en: 'Search an action or description — e.g. listKeys, storageAccounts, Microsoft.Compute' },
  'ph.advisorExample':    { pt: 'Ex: Preciso gerenciar registros DNS e configurar VPN na infraestrutura',
                            en: 'e.g. I need to manage DNS records and set up a VPN on the infrastructure' },

  // ── Ações (cauda: componentes de detalhe e menus) ─────────────────────────
  'action.copyId':        { pt: 'Copiar ID',           en: 'Copy ID' },
  'action.copyAction':    { pt: 'Copiar action',       en: 'Copy action' },
  'action.copyRoleId':    { pt: 'Copiar Role ID',      en: 'Copy role ID' },
  'action.exportVisible': { pt: 'Exportar dados visíveis', en: 'Export what is on screen' },
  'action.exportReport':  { pt: 'Exportar relatório',  en: 'Export report' },
  'action.seeAll':        { pt: 'ver todas',           en: 'see all' },
  'action.seeAllPerms':   { pt: 'Ver todas as permissões', en: 'See every permission' },
  'action.openNav':       { pt: 'Abrir menu de navegação', en: 'Open the navigation menu' },
  'action.themeLight':    { pt: 'Mudar para o tema claro', en: 'Switch to light theme' },
  'action.themeDark':     { pt: 'Mudar para o tema escuro', en: 'Switch to dark theme' },
  'action.skipToContent': { pt: 'Pular para o conteúdo',  en: 'Skip to content' },
  'action.clearService':  { pt: 'Limpar filtro de serviço', en: 'Clear the service filter' },
  'action.clearPermSearch': { pt: 'Limpar busca por permissão', en: 'Clear the permission search' },

  // ── Cabeçalhos e rótulos (cauda) ──────────────────────────────────────────
  'table.area':           { pt: 'Área',                en: 'Area' },
  'table.function':       { pt: 'Função',              en: 'Function' },
  'table.lastEdit':       { pt: 'Última edição',       en: 'Last edited' },
  'table.createdAt':      { pt: 'Criada em',           en: 'Created' },
  'label.policyDetails':  { pt: 'Detalhes da policy',  en: 'Policy details' },
  'label.awsData':        { pt: '— dados da AWS',      en: '— from AWS' },
  'label.deprecatedNote': { pt: 'A AWS indica que esta policy está em **caminho de depreciação**. Veja a descrição acima para a orientação oficial.',
                            en: 'AWS marks this policy as being on a **deprecation path**. The description above carries the official guidance.' },
  'table.version':        { pt: 'Versão',              en: 'Version' },
  'label.operationColon': { pt: 'Operação:',           en: 'Operation:' },
  'label.riskTier':       { pt: 'Tier de risco',       en: 'Risk tier' },
  'label.keyPermissions': { pt: 'Permissões-chave',    en: 'Key permissions' },
  'label.totalPerms':     { pt: 'Total de permissões', en: 'Total permissions' },
  'label.totalUnique':    { pt: 'Total único',         en: 'Distinct total' },
  'label.usedByPriv':     { pt: 'Usadas por roles priv.', en: 'Used by privileged roles' },
  'label.withOfficialDesc': { pt: 'Com descrição oficial', en: 'With an official description' },
  'label.descMicrosoft':  { pt: 'Descrição (Microsoft)', en: 'Description (Microsoft)' },
  'label.services':       { pt: 'Serviços',            en: 'Services' },
  'label.privileges':     { pt: 'Privilégios',         en: 'Privileges' },
  'label.rolesWithApi':   { pt: 'Roles com API',       en: 'Roles with an API' },
  'label.deprecationPath':{ pt: 'caminho de depreciação', en: 'deprecation path' },
  'label.responsibleAction':  { pt: 'Ação responsável:',  en: 'Responsible action:' },
  'label.responsibleActions': { pt: 'Ações responsáveis:', en: 'Responsible actions:' },
  'label.inOperation':    { pt: 'na operação',         en: 'in the operation' },

  // ── Estados de carregamento (cauda) ───────────────────────────────────────
  'state.loadingActions': { pt: 'Carregando actions…',  en: 'Loading actions…' },
  'state.loadingPerms':   { pt: 'Carregando permissões…', en: 'Loading permissions…' },
  'state.loadingCatalog': { pt: 'Carregando catálogo…',  en: 'Loading the catalogue…' },
  'state.loadingJson':    { pt: 'Carregando documento JSON…', en: 'Loading the JSON document…' },
  'state.loadingIndex':   { pt: 'Carregando índice de permissões…', en: 'Loading the permission index…' },
  'state.indexingPerms':  { pt: 'Indexando permissões…', en: 'Indexing permissions…' },
  'state.loadingAzureIndex': { pt: 'Carregando índice do Azure RBAC…', en: 'Loading the Azure RBAC index…' },
  'state.loadingAzureDetail':{ pt: 'Carregando permissões detalhadas do Azure RBAC…',
                               en: 'Loading detailed Azure RBAC permissions…' },
  'state.jsonLoadFailed': { pt: 'Não foi possível carregar o documento JSON desta policy.',
                            en: 'Could not load the JSON document for this policy.' },

  // ── Estados vazios (cauda) ────────────────────────────────────────────────
  'empty.policies':       { pt: 'Nenhuma policy encontrada',   en: 'No policies found' },
  'empty.services':       { pt: 'Nenhum serviço encontrado.',  en: 'No services found.' },
  'empty.scopes':         { pt: 'Nenhum escopo encontrado.',   en: 'No scopes found.' },
  'empty.privileges':     { pt: 'Nenhum privilégio encontrado.', en: 'No privileges found.' },
  'empty.permissionNotFound': { pt: 'Permissão não encontrada', en: 'Permission not found' },
  'empty.noPermsRecorded':{ pt: 'Nenhuma permissão registrada.', en: 'No permissions recorded.' },
  'empty.noGranularPerms':{ pt: 'Nenhuma permissão granular disponível para esta role.',
                            en: 'No granular permissions available for this role.' },
  'empty.withFilters':    { pt: 'Nenhum resultado com os filtros selecionados.',
                            en: 'Nothing matches the selected filters.' },
  'empty.tierNotFound':   { pt: 'Tier não encontrado',         en: 'Tier not found' },
  'empty.functionNotFound': { pt: 'Função não encontrada',     en: 'Function not found' },
  'empty.equivalenceNotFound': { pt: 'Equivalência não encontrada.', en: 'Equivalence not found.' },

  // ── Filtros e placeholders (cauda) ────────────────────────────────────────
  'filter.allCategories': { pt: 'Todas as categorias',  en: 'All categories' },
  'filter.allFrameworks': { pt: 'Todos os frameworks',  en: 'All frameworks' },
  'filter.allFunctions':  { pt: 'Todas as funções',     en: 'All functions' },
  'filter.allServices':   { pt: 'Todos os serviços',    en: 'All services' },
  'filter.byProvider':    { pt: 'Filtrar por resource provider', en: 'Filter by resource provider' },
  'filter.sortByFunction':{ pt: 'Ordenar: função',      en: 'Sort: function' },
  'ph.filterGeneric':     { pt: 'Filtrar…',            en: 'Filter…' },
  'ph.filterPermissions': { pt: 'Filtrar permissions…', en: 'Filter permissions…' },
  'ph.filterPrivileges':  { pt: 'Filtrar privileges…',  en: 'Filter privileges…' },
  'ph.filterRoles':       { pt: 'Filtrar roles…',       en: 'Filter roles…' },
  'ph.filterActionOrDesc':{ pt: 'Filtrar action ou descrição…', en: 'Filter by action or description…' },
  'ph.searchRole':        { pt: 'Buscar role…',         en: 'Search a role…' },
  'ph.searchPolicy':      { pt: 'Buscar policy, ARN, descrição…', en: 'Search a policy, ARN or description…' },
  'ph.searchRoleFields':  { pt: 'Buscar por nome, descrição ou roleId…', en: 'Search by name, description or roleId…' },
  'ph.searchRuleOrRole':  { pt: 'Buscar por nome ou role…', en: 'Search by name or role…' },
  'aria.searchAzurePerm': { pt: 'Buscar permissão do Azure RBAC', en: 'Search an Azure RBAC permission' },
  'aria.searchRolesByPerm': { pt: 'Buscar roles por permissão', en: 'Search roles by permission' },
  'aria.searchPermAllClouds': { pt: 'Buscar permissão em todas as clouds', en: 'Search a permission across every cloud' },

  // ── Cauda: páginas de permissão e de detalhe de role ──────────────────────
  'perm.azureHeader':     { pt: 'Azure RBAC — permissões',   en: 'Azure RBAC — permissions' },
  'perm.azureUsedByA':    { pt: 'actions usadas pelas',      en: 'actions used by the' },
  'perm.azureUsedByB':    { pt: 'built-in roles',            en: 'built-in roles' },
  'perm.providerColon':   { pt: 'Provider:',                 en: 'Provider:' },
  'perm.allProviders':    { pt: 'Todos',                     en: 'All' },
  'perm.rolesGranting':   { pt: 'Roles que concedem',        en: 'Roles that grant it' },
  'perm.rolesGrantingThis': { pt: 'Roles que concedem esta permissão', en: 'Roles that grant this permission' },
  'perm.wildcardNote':    { pt: 'Contém `*` — concede todas as operações que casam com o padrão, inclusive as que a Microsoft adicionar depois.',
                            en: 'It contains `*` — it grants every operation matching the pattern, including ones Microsoft adds later.' },
  'perm.msReference':     { pt: 'Referência de permissões',  en: 'Permissions reference' },
  'perm.gcpLoadFailed':   { pt: 'Não foi possível carregar o índice de permissões do GCP',
                            en: 'Could not load the GCP permission index' },
  'perm.loadingGcp':      { pt: 'Carregando permissões do GCP…', en: 'Loading GCP permissions…' },
  'perm.roleLoadFailed':  { pt: 'Não foi possível carregar as permissões desta role.',
                            en: 'Could not load this role’s permissions.' },
  'perm.gcpLowestRes':    { pt: 'Recursos de menor nível onde esta role pode ser concedida',
                            en: 'Lowest-level resources this role can be granted on' },
  'perm.gcpDetailSub':    { pt: 'GCP IAM — detalhes da role', en: 'GCP IAM — role detail' },
  'perm.ibmDetailSub':    { pt: 'IBM Cloud IAM — detalhes da role', en: 'IBM Cloud IAM — role detail' },
  'perm.azureDetailSub':  { pt: 'Azure RBAC — permissão',    en: 'Azure RBAC — permission' },
  'perm.indexedIn':       { pt: 'permissões indexadas em 6 clouds', en: 'permissions indexed across 6 clouds' },
  'perm.azureOnDemand':   { pt: 'Azure RBAC carrega sob demanda', en: 'Azure RBAC loads on demand' },
  'perm.scopeLead':       { pt: 'Descubra quais roles concedem uma permissão, em qualquer cloud',
                            en: 'Find out which roles grant a permission, in any cloud' },
  'perm.scopeTryShorter': { pt: 'Tente um trecho menor — a busca é por substring.',
                            en: 'Try a shorter fragment — the search matches substrings.' },
  'perm.matchedPerms':    { pt: 'permissão(ões) correspondente(s)', en: 'matching permission(s)' },
  'perm.roleGrants':      { pt: 'concessão(ões) de role',    en: 'role grant(s)' },
  'perm.docGoogle':       { pt: 'documentação do Google',    en: 'Google documentation' },
  'perm.segments':        { pt: 'Segmentos',                 en: 'Segments' },
  'perm.copyAction':      { pt: 'Copiar action',             en: 'Copy action' },
  'perm.notFoundTitle':   { pt: 'Permissão não encontrada',  en: 'Permission not found' },
  'perm.othersSuffix':    { pt: 'outras',                    en: 'others' },
  'perm.showing':         { pt: 'exibindo',                  en: 'showing' },
  'perm.azureIndexFailed':{ pt: 'Falha ao carregar o índice do Azure RBAC — os resultados das demais clouds seguem válidos.',
                            en: 'The Azure RBAC index failed to load — results from the other clouds are still valid.' },
  'label.yes':            { pt: 'Sim',                       en: 'Yes' },
  'label.no':             { pt: 'Não',                       en: 'No' },
  'label.privilegedAdj':  { pt: 'Privilegiada',              en: 'Privileged' },
  'label.roleNotFound':   { pt: 'Role não encontrada',       en: 'Role not found' },
  'label.roleNotFoundDot':{ pt: 'Role não encontrada.',      en: 'Role not found.' },
  'action.showAllLines':  { pt: 'Mostrar tudo',              en: 'Show everything' },
  'noun.lines':           { pt: 'linhas',                    en: 'lines' },
  'state.loadingAwsActions': { pt: 'Carregando actions da AWS…', en: 'Loading AWS actions…' },
  'perm.msLearnDocs':     { pt: 'Ver a documentação oficial na Microsoft Learn',
                            en: 'Open the official documentation on Microsoft Learn' },
  'label.deprecatedShort':{ pt: 'O provedor marca este item como descontinuado',
                            en: 'The provider marks this item as deprecated' },
  'section.eamDistribution': { pt: 'Distribuição pelo Enterprise Access Model',
                               en: 'Distribution across the Enterprise Access Model' },
  'section.adminTierDist':{ pt: 'Distribuição por Admin Tier', en: 'Distribution by admin tier' },
  'eval.cloudNotDetected':{ pt: 'Cloud ainda não detectada — cole um JSON válido, ou escolha na mão',
                            en: 'No cloud detected yet — paste valid JSON, or pick one by hand' },

  // ── Seletor de idioma ─────────────────────────────────────────────────────
  'lang.label':           { pt: 'Idioma',              en: 'Language' },
  'lang.pt':              { pt: 'Português',           en: 'Portuguese' },
  'lang.en':              { pt: 'Inglês',              en: 'English' },
} as const

export const DICTIONARY = { ...SHARED, ...PAGES_DICTIONARY }

export type TranslationKey = keyof typeof DICTIONARY
