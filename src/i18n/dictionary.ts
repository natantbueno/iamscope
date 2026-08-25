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
  // A home mostra este número ao lado de "Policies" e "Services", e "Actions"
  // sozinho se lê como "a AWS tem 16.423 actions" — que é falso: são as
  // actions CITADAS pelas managed policies. O universo da AWS é maior.
  'count.policyActions':    { pt: 'Actions em policies', en: 'Actions in policies' },
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
  'action.copied':        { pt: 'Copiado!',            en: 'Copied!' },
  'action.downloadJson':  { pt: 'Baixar o JSON completo',
                            en: 'Download the full JSON' },
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
  'nav.exploreByCloud':   { pt: 'Explorar por cloud',   en: 'Explore by cloud' },
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

  // ── Concessão por wildcard (Permission Scope) ─────────────────────────────
  // "wildcard" fica igual nos dois idiomas: é o termo que AWS, Azure e GCP
  // usam na própria documentação, e traduzir por "curinga" obrigaria quem lê a
  // fazer o caminho de volta antes de procurar na doc do provedor.
  'perm.wildcardToggle':  { pt: 'Concessões por wildcard',
                            en: 'Wildcard grants' },
  'perm.wildcardHint':    { pt: 'Uma policy que concede `s3:*` concede `s3:GetObject` — inclusive as actions que a AWS criar depois.',
                            en: 'A policy granting `s3:*` grants `s3:GetObject` — including actions the provider adds later.' },
  'perm.viaWildcard':     { pt: 'via wildcard',              en: 'via wildcard' },
  'perm.cloudOnlyThis':   { pt: 'Ver só esta cloud',          en: 'Show only this cloud' },
  'perm.cloudShowAll':    { pt: 'Ver todas as clouds',        en: 'Show all clouds' },

  // Negação explícita. Cor é legítima aqui: é estado semântico, como o
  // SOD_SEVERITY_META — e é a informação mais acionável da linha.
  'perm.deniedBy':        { pt: 'Negam explicitamente:',     en: 'Explicitly denied by:' },
  'perm.noneGrant':       { pt: 'Nenhuma role ou policy do catálogo concede este padrão.',
                            en: 'No catalogued role or policy grants this pattern.' },
  'perm.notGrantedByManaged': { pt: 'Esta action existe no catálogo oficial da AWS, e nenhuma managed policy a concede — só uma policy inline ou custom pode ter dado esse acesso.',
                            en: 'This action exists in the official AWS catalogue, and no managed policy grants it — only an inline or custom policy could have.' },
  'perm.excludedTitle':   { pt: 'Roles que excluem esta action',
                            en: 'Roles that exclude this action' },
  'perm.excludedBody':    { pt: 'Estas roles declaram a action em `NotActions`. A exclusão vence o `Actions` da própria role — por isso a Contributor, que concede `*`, mesmo assim não escreve em Microsoft.Authorization.',
                            en: 'These roles declare the action under `NotActions`. The exclusion overrides the role\'s own `Actions` — which is why Contributor, despite granting `*`, still cannot write to Microsoft.Authorization.' },

  // ── Ferramentas em Beta ───────────────────────────────────────────────────
  'beta.label':           { pt: 'Beta',                      en: 'Beta' },
  'beta.knownLimits':     { pt: 'Beta — limitações conhecidas',
                            en: 'Beta — known limitations' },

  'beta.evalOne':         { pt: 'Role custom recebe tier ESTIMADO a partir das permissões, e a estimativa depende de o catálogo conhecer cada ação: permissão que nenhuma role catalogada concede fica de fora da conta, e a interface mostra quantas foram.',
                            en: 'A custom role gets an ESTIMATED tier from its permissions, and the estimate depends on the catalogue knowing each action: a permission no catalogued role grants stays out of the count, and the interface shows how many did.' },
  'beta.evalTwo':         { pt: 'Google Workspace: a role casa, mas os privilégios vêm do catálogo em texto ("Manage other admins") — o Google publica a lista com identificador de API para só duas das 14 roles.',
                            en: 'Google Workspace: the role matches, but its privileges come from the catalogue as prose ("Manage other admins") — Google publishes API-identifier lists for only two of the 14 roles.' },
  'beta.evalThree':       { pt: 'IBM Cloud e Google Workspace ficam de fora da avaliação por permissões: a IBM não publica ação por role, e o Google publica a lista com identificador de API para 2 das 14 roles.',
                            en: 'IBM Cloud and Google Workspace are out of the permission-based assessment: IBM does not publish actions per role, and Google publishes API-identifier lists for 2 of the 14 roles.' },
  'beta.evalFour':        { pt: 'Riscos e mitigações existem só para o conjunto curado de funções críticas cross-cloud; nas demais roles a seção fica vazia.',
                            en: 'Risks and mitigations exist only for the curated set of critical cross-cloud functions; the section is empty for every other role.' },

  'beta.scopeOne':        { pt: 'Uma action que NENHUMA policy gerenciada concede não aparece na busca, mesmo existindo na AWS — só dá para dizer isso depois de o catálogo oficial de actions ser coletado.',
                            en: 'An action that NO managed policy grants does not show up in search, even when it exists in AWS — saying so requires the official action catalogue to be collected first.' },
  'beta.scopeTwo':        { pt: 'Os privilégios do Google Workspace estão no catálogo em texto ("Manage other admins"), não com o identificador da API (`USERS_UPDATE`) — buscar pelo identificador não encontra.',
                            en: 'Google Workspace privileges are catalogued as prose ("Manage other admins"), not by their API identifier (`USERS_UPDATE`) — searching by identifier finds nothing.' },
  'beta.scopeThree':      { pt: 'A contagem da AWS são as actions REFERENCIADAS pelas policies gerenciadas, não o universo de actions do provedor — que é maior.',
                            en: 'The AWS count covers actions REFERENCED by managed policies, not the provider\'s full action universe, which is larger.' },
  'beta.scopeFour':       { pt: 'IBM Cloud fica fora do índice: o provedor não publica identificador de ação por role.',
                            en: 'IBM Cloud is out of the index: the provider does not publish an action identifier per role.' },

  'beta.advOne':          { pt: 'A busca é por termo, não semântica: não há modelo de linguagem por trás. Termo que não existe no catálogo não encontra nada, mesmo que o conceito exista.',
                            en: 'This is term search, not semantic search: there is no language model behind it. A term absent from the catalogue finds nothing, even when the concept exists.' },
  'beta.advTwo':          { pt: 'O léxico que traduz intenção ("terraform" → contributor/editor) é curadoria editorial do IAM Scope, e cobre o que já foi medido.',
                            en: 'The lexicon that maps intent ("terraform" → contributor/editor) is IAM Scope editorial curation, and covers what has been measured so far.' },
  'beta.advThree':        { pt: 'A busca é por ROLE. Permissão e action individuais não estão neste índice — para isso existe o Permission Scope.',
                            en: 'This searches ROLES. Individual permissions and actions are not in this index — Permission Scope covers those.' },

  'beta.sodOne':          { pt: 'Nenhuma regra cruza provedores: um conflito entre uma role da AWS e uma do Entra ID não é detectado.',
                            en: 'No rule crosses providers: a conflict between an AWS role and an Entra ID role is not detected.' },
  'beta.sodTwo':          { pt: 'As regras são de segregação por FUNÇÃO. Escopo, condição de atribuição e acesso just-in-time não entram no cálculo.',
                            en: 'The rules cover segregation by FUNCTION. Scope, assignment conditions and just-in-time access are not part of the calculation.' },
  'beta.sodThree':        { pt: 'O script PowerShell avalia só as plataformas Microsoft — é o alcance do Graph e do Azure Resource Manager, não do catálogo inteiro.',
                            en: 'The PowerShell script only evaluates the Microsoft platforms — that is the reach of Graph and Azure Resource Manager, not of the whole catalogue.' },

  // ── Permissões EFETIVAS do Azure ──────────────────────────────────────────
  //
  // `permissionCount` conta ENTRADAS DA DEFINIÇÃO: a Owner é uma linha só
  // (`{"action":"*"}`) e por isso aparecia com 1, empatada com a AcrPull. O
  // efetivo expande o wildcard. Os dois convivem na tela — o nativo é o que a
  // Microsoft publica, o efetivo é o que ele significa.
  //
  // NENHUM NÚMERO AQUI DENTRO. `{n}` e `{p}` são preenchidos em runtime a
  // partir de AZURE_EFFECTIVE_UNIVERSE — é a regra que check-stale-numbers.js
  // protege, e a razão de a frase ter placeholder em vez de "17.591".
  'azeff.label':          { pt: 'Efetivas',            en: 'Effective' },
  'azeff.atLeast':        { pt: 'pelo menos',          en: 'at least' },
  'azeff.panelTitle':     { pt: 'Alcance efetivo',     en: 'Effective reach' },
  'azeff.floorBadge':     { pt: 'piso, não total',     en: 'a floor, not a total' },
  'azeff.controlPlane':   { pt: 'Control plane',       en: 'Control plane' },
  'azeff.dataPlane':      { pt: 'Data plane',          en: 'Data plane' },
  'azeff.nativeLabel':    { pt: 'Entradas na definição', en: 'Entries in the definition' },
  'azeff.noDenominator':  { pt: 'Sem denominador',     en: 'No denominator' },
  'azeff.definitionLabel': { pt: 'Na definição (nativo)', en: 'In the definition (native)' },
  // Subtítulo da página de detalhe: os dois números na mesma linha, porque é
  // a contradição entre eles que explica o campo. {d} = entradas da definição,
  // {e} = efetivas. Frase própria para não concordar plural com "1 entries".
  'azeff.headerExtra':    { pt: '{d} na definição · ≥ {e} efetivas',
                            en: '{d} in the definition · ≥ {e} effective' },
  'azeff.tip':            { pt: 'Ações concedidas com os wildcards expandidos contra {n} ações de {p} providers, e as NotActions subtraídas. É um PISO: esse universo vem da documentação da Microsoft, e a Azure Management API expõe mais ações do que a documentação publica.',
                            en: 'Actions granted, with wildcards expanded against {n} actions across {p} providers and NotActions subtracted. This is a FLOOR: that universe comes from Microsoft\u2019s documentation, and the Azure Management API exposes more actions than the docs publish.' },
  'azeff.floor':          { pt: 'Piso, não total: expandido contra {n} ações de {p} providers colhidas da documentação da Microsoft. A Azure Management API expõe mais — o número real é maior, nunca menor.',
                            en: 'A floor, not a total: expanded against {n} actions across {p} providers collected from Microsoft\u2019s documentation. The Azure Management API exposes more — the real number is higher, never lower.' },
  'azeff.dataTip':        { pt: 'O universo de ações mistura control plane e data plane sem marcar qual é qual, então não há denominador contra o qual expandir um wildcard de DataActions. Preferimos deixar em branco a publicar um número inventado.',
                            en: 'The action universe mixes control plane and data plane without marking which is which, so there is no denominator to expand a DataActions wildcard against. We leave it blank rather than publish a made-up number.' },
  'azeff.nativeTip':      { pt: 'Quantas linhas a definição da role tem — o número nativo da Microsoft. `{"action":"*"}` conta 1, por mais que conceda o catálogo inteiro.',
                            en: 'How many lines the role definition has — Microsoft\u2019s native number. `{"action":"*"}` counts as 1, however much it grants.' },

  // ── Índice de providers do Azure (/azure-rbac/providers) ──────────────────
  //
  // Nome de provider (`Microsoft.Storage`) NÃO entra aqui: é nome próprio e
  // fica em inglês nos dois idiomas, como manda o ADR-001. Só rótulo e
  // contador passam pelo dicionário.
  //
  // Nenhum número dentro das frases: `{keys}`, `{actions}`, `{raw}` e
  // `{providers}` são preenchidos em runtime a partir do `_meta` do índice —
  // mesma regra que check-stale-numbers.js protege no bloco azeff.*.
  'sub.azureProviders':   { pt: 'As ações do Azure agrupadas por resource provider',
                            en: 'Azure actions grouped by resource provider' },
  'sub.azureProvider':    { pt: 'Ações do provider, com a descrição oficial e as roles que concedem cada uma',
                            en: 'The provider\u2019s actions, with the official description and the roles that grant each one' },
  'noun.providers':       { pt: 'providers',           en: 'providers' },
  'nav.providers':        { pt: 'Providers',           en: 'Providers' },
  'label.planeDeclared':  { pt: 'Plano declarado',     en: 'Plane declared' },
  'label.sortBy':         { pt: 'Ordenar por',         en: 'Sort by' },
  'sort.bySize':          { pt: 'Tamanho',             en: 'Size' },
  'sort.byRoles':         { pt: 'Roles',               en: 'Roles' },
  'sort.byName':          { pt: 'Nome',                en: 'Name' },
  'table.plane':          { pt: 'Plano',               en: 'Plane' },
  'plane.control':        { pt: 'Control plane',       en: 'Control plane' },
  'plane.data':           { pt: 'Data plane',          en: 'Data plane' },
  'plane.both':           { pt: 'Os dois',             en: 'Both' },
  'plane.undeclared':     { pt: 'não declarado',       en: 'undeclared' },
  'azp.loading':          { pt: 'Carregando o índice de providers…',
                            en: 'Loading the provider index\u2026' },
  'azp.loadFailed':       { pt: 'Não foi possível carregar o índice de providers do Azure',
                            en: 'Could not load the Azure provider index' },
  'azp.searchPlaceholder':{ pt: 'Buscar provider…',    en: 'Search for a provider\u2026' },
  'azp.searchAria':       { pt: 'Buscar resource provider do Azure',
                            en: 'Search Azure resource providers' },
  'azp.searchAction':     { pt: 'Buscar action ou descrição…',
                            en: 'Search an action or description\u2026' },
  'azp.emptyProviders':   { pt: 'Nenhum provider encontrado',  en: 'No provider found' },
  'azp.emptyActions':     { pt: 'Nenhuma action encontrada',   en: 'No action found' },
  'azp.openProvider':     { pt: 'Abrir',               en: 'Open' },
  'azp.notFound':         { pt: 'Provider não encontrado',     en: 'Provider not found' },
  'azp.backToProviders':  { pt: 'Voltar para providers',       en: 'Back to providers' },
  'azp.grantedControl':   { pt: 'Concedida por (control plane)',
                            en: 'Granted by (control plane)' },
  'azp.grantedData':      { pt: 'Concedida por (data plane)',
                            en: 'Granted by (data plane)' },
  'azp.deniedBy':         { pt: 'Negada explicitamente por',
                            en: 'Explicitly denied by' },
  'azp.grantedByLabel':   { pt: 'Concedida por',       en: 'Granted by' },
  'azp.anyRole':          { pt: 'Qualquer role',       en: 'Any role' },
  'azp.noRole':           { pt: 'Nenhuma role built-in concede esta ação.',
                            en: 'No built-in role grants this action.' },
  'azp.priv':             { pt: 'priv',                en: 'priv' },
  'azp.floorNote':        { pt: 'Os números são PISO: o universo de ações vem da documentação da Microsoft, e a Azure Management API expõe mais operações do que a documentação publica.',
                            en: 'These numbers are a FLOOR: the action universe comes from Microsoft\u2019s documentation, and the Azure Management API exposes more operations than the docs publish.' },
  'azp.caseNote':         { pt: 'O arquivo de descrições tem {keys} chaves; {actions} são ações distintas, porque algumas aparecem em dois cases. Pelo mesmo motivo, o prefixo cru dá {raw} providers e os distintos são {providers} — são estes que viram rota.',
                            en: 'The description file holds {keys} keys; {actions} are distinct actions, because some appear in two casings. For the same reason the raw prefix yields {raw} providers while the distinct count is {providers} — and it is the distinct ones that become routes.' },
  'azp.planeNote':        { pt: 'O arquivo de descrições da Microsoft mistura control plane e data plane e não marca qual é qual. Por isso o plano só é afirmado quando alguma definição de role cita a ação por extenso, em Actions ou em DataActions; nas demais fica "não declarado", que não é o mesmo que control plane.',
                            en: 'Microsoft\u2019s description file mixes control plane and data plane without marking which is which. The plane is therefore stated only when some role definition names the action in full, under Actions or DataActions; the rest read \u201cundeclared\u201d, which is not the same as control plane.' },

  // ── Changelog ─────────────────────────────────────────────────────────────
  // A prosa longa da ressalva NÃO está aqui: ela vem do próprio changelog.json,
  // já nos dois idiomas. Se morasse no dicionário, a página diria uma coisa e o
  // feed e a API diriam outra na primeira vez que alguém editasse só um lado.
  'chg.title':            { pt: 'Changelog',            en: 'Changelog' },
  'chg.sub':              { pt: 'O que mudou nos catálogos de IAM das seis nuvens',
                            en: 'What changed in the IAM catalogues of all six clouds' },
  'chg.subCloud':         { pt: 'O que mudou neste catálogo, desde que passamos a observar',
                            en: 'What changed in this catalogue since we started observing it' },
  'chg.disclosureTitle':  { pt: 'Onde este histórico começa',
                            en: 'Where this history begins' },

  'chg.statEvents':       { pt: 'Eventos',              en: 'Events' },
  'chg.statSince':        { pt: 'Observando desde',     en: 'Observing since' },
  'chg.statSinceNote':    { pt: 'primeiro snapshot gravado',
                            en: 'first snapshot recorded' },
  'chg.statAttested':     { pt: 'Atestados',            en: 'Attested' },
  'chg.statAttestedNote': { pt: 'de registro datado, não de comparação',
                            en: 'from dated records, not from comparison' },
  'chg.statQuarantine':   { pt: 'Em quarentena',        en: 'In quarantine' },
  'chg.statQuarantineNote': { pt: 'remoções retidas para revisão',
                              en: 'removals held for review' },

  'chg.feedTitle':        { pt: 'Ser avisado',          en: 'Get notified' },
  'chg.feedHint':         { pt: 'Feeds Atom, um por nuvem, mais um recorte só de roles privilegiadas. Assinar é o que traz você de volta sem precisar ter um problema primeiro. Os feeds saem em inglês: leitor de feed não tem seletor de idioma.',
                            en: 'Atom feeds, one per cloud, plus a privileged-only cut. Subscribing is what brings you back without needing a problem first. Feeds are in English: a feed reader has no language switch.' },
  'chg.feedAll':          { pt: 'Todas as nuvens',      en: 'All clouds' },
  'chg.feedPriv':         { pt: 'Só privilegiadas',     en: 'Privileged only' },
  'chg.feedPrivShort':    { pt: 'privilegiadas',        en: 'privileged' },
  'chg.feedLink':         { pt: 'Feed',                 en: 'Feed' },
  'chg.apiLink':          { pt: 'Histórico completo em JSON',
                            en: 'Full history as JSON' },

  'chg.filters':          { pt: 'Filtros',              en: 'Filters' },
  'chg.filterCloud':      { pt: 'Nuvem',                en: 'Cloud' },
  'chg.filterType':       { pt: 'Tipo de evento',       en: 'Event type' },
  'chg.filterPeriod':     { pt: 'Período',              en: 'Period' },
  'chg.filterOrigin':     { pt: 'Procedência',          en: 'Provenance' },
  'chg.periodAll':        { pt: 'Tudo',                 en: 'All time' },
  'chg.periodThirty':     { pt: '30 dias',              en: '30 days' },
  'chg.periodNinety':     { pt: '90 dias',              en: '90 days' },
  'chg.periodYear':       { pt: '1 ano',                en: '1 year' },
  'chg.originAll':        { pt: 'Tudo',                 en: 'All' },
  'chg.originDerived':    { pt: 'Derivado',             en: 'Derived' },
  'chg.originAttested':   { pt: 'Atestado',             en: 'Attested' },

  'chg.showing':          { pt: 'Mostrando {n} de {total}',
                            en: 'Showing {n} of {total}' },
  // O corte de período é ancorado no evento mais novo, não no relógio de quem
  // lê: com HTML estático, um corte por Date.now() esvaziaria a lista sozinho
  // com o passar dos meses e o filtro pareceria quebrado.
  'chg.periodAnchor':     { pt: 'contado a partir de {d}, o evento mais recente',
                            en: 'counted from {d}, the most recent event' },

  'chg.emptyBuild':       { pt: 'O changelog ainda não foi gerado neste build. Rode scripts/build-snapshot.js e scripts/build-changelog.js antes de npm run build.',
                            en: 'The changelog has not been generated in this build. Run scripts/build-snapshot.js and scripts/build-changelog.js before npm run build.' },
  'chg.noResults':        { pt: 'Nenhum evento com esses filtros.',
                            en: 'No events match these filters.' },
  'chg.truncated':        { pt: 'Mais {n} eventos não cabem nesta página. O histórico completo está em',
                            en: '{n} more events do not fit on this page. The full history is at' },
  'chg.backToCloud':      { pt: 'Ver o catálogo de {c}',
                            en: 'See the {c} catalogue' },
  'chg.allClouds':        { pt: 'Changelog das seis nuvens',
                            en: 'Changelog across all six clouds' },

  // ── Procedência de cada linha ─────────────────────────────────────────────
  // Três marcas porque são três coisas diferentes, e misturá-las seria o mesmo
  // defeito que o ClassificationBadge existe para corrigir nas páginas de
  // detalhe: exibir classificação nossa ao lado de nome oficial, sem qualificar.
  'chg.editorialTag':     { pt: 'curadoria',            en: 'curation' },
  'chg.editorialTip':     { pt: 'Mudança na classificação do IAM Scope — tier, categoria, privilégio ou regra de SoD. Derivada das permissões oficiais; nenhum provedor publica essa classificação. É o tipo de evento que só nós temos como emitir.',
                            en: 'A change in IAM Scope classification — tier, category, privilege or SoD rule. Derived from the official permissions; no provider publishes this classification. It is the kind of event only we can emit.' },
  'chg.processTag':       { pt: 'processo',             en: 'process' },
  'chg.processTip':       { pt: 'Fato sobre a coleta em si, não sobre o catálogo: quando começamos a observar, quando a coleta enxergou menos do que a fonte tem, ou quando não dá para saber se um item foi removido.',
                            en: 'A fact about the collection itself, not about the catalogue: when we started observing, when the collection saw less than the source holds, or when there is no way to tell whether an item was removed.' },
  'chg.attestedTag':      { pt: 'atestado',             en: 'attested' },
  'chg.attestedTip':      { pt: 'Este evento não veio de comparar dois snapshots: veio de um registro datado que já existia no repositório antes de a captura ser ligada. É informação de qualidade diferente, e por isso vem marcada.',
                            en: 'This event did not come from comparing two snapshots: it comes from a dated record that already existed in the repository before capture was switched on. It is information of a different quality, which is why it is marked.' },
  'chg.sourceLabel':      { pt: 'Fonte',                en: 'Source' },

  // ── Seletor de idioma ─────────────────────────────────────────────────────
  'lang.label':           { pt: 'Idioma',              en: 'Language' },
  'theme.label':          { pt: 'Tema',                en: 'Theme' },
  'lang.pt':              { pt: 'Português',           en: 'Portuguese' },
  'lang.en':              { pt: 'Inglês',              en: 'English' },
} as const

export const DICTIONARY = { ...SHARED, ...PAGES_DICTIONARY }

export type TranslationKey = keyof typeof DICTIONARY
