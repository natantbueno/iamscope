<#
.SYNOPSIS
    Assessment de identidade e acesso para um tenant Microsoft Entra ID +
    Azure RBAC, usando a classificação de risco do IAM Scope.

.DESCRIPTION
    O script NÃO altera nada. Só lê atribuições de role e as cruza com o
    catálogo do IAM Scope para produzir um retrato do risco do ambiente.

    O que ele levanta:
      - inventário de identidades: usuários, service principals, managed
        identities e grupos com role atribuída;
      - toda atribuição de role no Entra ID (ativa, elegível via PIM, herdada
        de grupo) e no Azure RBAC, em todas as assinaturas visíveis;
      - classificação por Tier 0/1/2 do Enterprise Access Model;
      - conflitos de segregação de funções (96 regras);
      - achados objetivos: excesso de Global Admins, Tier 0 permanente sem PIM,
        credencial de service principal vencida ou antiga, managed identity com
        acesso privilegiado, conta sem uso recente com role privilegiada.

    Saídas na pasta de output:
      - IAMScope-Assessment-<tenant>-<data>.xlsx   planilha com 7 abas
      - IAMScope-Dashboard-<tenant>-<data>.html    dashboard executivo
      - IAMScope-Findings-<tenant>-<data>.csv      fallback, sempre gerado

.PARAMETER TenantId
    Tenant a avaliar. Se omitido, o script pergunta na execução.

.PARAMETER CatalogPath
    Caminho do iamscope-catalog.json. Se omitido, procura ao lado do script.

.PARAMETER OutputFolder
    Onde gravar. Padrão: .\IAMScope-Assessment

.PARAMETER Scope
    EntraId | AzureRbac | Both (padrão)

.PARAMETER ExcludePim
    Ignora atribuições elegíveis. Subestima o risco — use só se não houver PIM.

.PARAMETER ExcludeGroups
    Não resolve membros de grupos. Bem mais rápido, porém perde a forma como a
    maioria dos tenants grandes concede acesso.

.PARAMETER StaleCredentialDays
    Idade, em dias, a partir da qual uma credencial de service principal é
    considerada antiga. Padrão: 365.

.EXAMPLE
    .\Invoke-IAMScopeAssessment.ps1

.EXAMPLE
    .\Invoke-IAMScopeAssessment.ps1 -TenantId contoso.onmicrosoft.com -Scope EntraId

.NOTES
    Permissões (somente leitura, consentimento delegado):
      Directory.Read.All, RoleManagement.Read.Directory,
      Application.Read.All, AuditLog.Read.All
    Para Azure RBAC: qualquer papel de leitura nas assinaturas.

    Requer PowerShell 7+ e os módulos Microsoft.Graph.Authentication e
    Microsoft.Graph.Identity.Governance. Az.Accounts/Az.Resources para Azure
    RBAC. ImportExcel é opcional — sem ele o Excel vira CSV.

    IAM Scope — página "Assessment do Tenant".
#>

[CmdletBinding()]
param(
    [string]$TenantId,
    [string]$CatalogPath,
    [string]$OutputFolder = (Join-Path (Get-Location) 'IAMScope-Assessment'),
    [ValidateSet('EntraId', 'AzureRbac', 'Both')]
    [string]$Scope = 'Both',
    [switch]$ExcludePim,
    [switch]$ExcludeGroups,
    [int]$StaleCredentialDays = 365
)

$ErrorActionPreference = 'Stop'

# Set-StrictMode NÃO é usado de propósito: num tenant de terceiro, várias
# propriedades do Graph e do Az são legitimamente ausentes (SignInName de SP,
# elegibilidades sem licença P2, PrincipalDisplayName em versões antigas do Az).
# Abortar por campo ausente é pior que seguir com o campo vazio; onde a ausência
# importa, há verificação explícita.

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────────────

function Write-Step { param([string]$m) Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok   { param([string]$m) Write-Host "    $m" -ForegroundColor DarkGray }
function Write-Warn2{ param([string]$m) Write-Host "    ! $m" -ForegroundColor Yellow }

function Test-ModuleAvailable {
    param([string]$Name)
    return $null -ne (Get-Module -ListAvailable -Name $Name | Select-Object -First 1)
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Catálogo do IAM Scope
# ─────────────────────────────────────────────────────────────────────────────

function Get-Catalog {
    $candidatos = @()
    if ($CatalogPath) { $candidatos += $CatalogPath }
    $candidatos += (Join-Path $PSScriptRoot 'iamscope-catalog.json')
    $candidatos += (Join-Path (Get-Location) 'iamscope-catalog.json')

    foreach ($c in $candidatos) {
        if ($c -and (Test-Path $c)) {
            Write-Ok "Catálogo: $c"
            return Get-Content $c -Raw -Encoding UTF8 | ConvertFrom-Json
        }
    }
    throw ("Catálogo do IAM Scope não encontrado.`n" +
           "  Baixe o iamscope-catalog.json na página de Assessment e deixe-o na`n" +
           "  mesma pasta deste script, ou informe -CatalogPath C:\caminho\arquivo.json")
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Coleta — identidades e atribuições
# ─────────────────────────────────────────────────────────────────────────────

$script:GroupCache = @{}
$script:PrincipalCache = @{}

function Resolve-Principal {
    param([string]$Id)
    if ($script:PrincipalCache.ContainsKey($Id)) { return $script:PrincipalCache[$Id] }

    $obj = [pscustomobject]@{
        Id = $Id; DisplayName = '(objeto não encontrado)'; UPN = ''
        Type = 'Unknown'; AppId = ''; Enabled = $null; CreatedAt = $null
    }
    try {
        $r = Invoke-MgGraphRequest -Method GET -Uri "/v1.0/directoryObjects/$Id" -ErrorAction Stop
        $t = ($r['@odata.type'] -replace '#microsoft\.graph\.', '')
        $tipo = switch ($t) {
            'user'             { 'User' }
            'group'            { 'Group' }
            'servicePrincipal' { 'ServicePrincipal' }
            default            { $t }
        }
        # Managed Identity é um servicePrincipal com servicePrincipalType próprio —
        # separá-lo importa porque é o acesso menos revisado do tenant.
        if ($tipo -eq 'ServicePrincipal' -and $r['servicePrincipalType'] -eq 'ManagedIdentity') {
            $tipo = 'ManagedIdentity'
        }
        $obj = [pscustomobject]@{
            Id          = $Id
            DisplayName = [string]$r['displayName']
            UPN         = [string]$r['userPrincipalName']
            Type        = $tipo
            AppId       = [string]$r['appId']
            Enabled     = $r['accountEnabled']
            CreatedAt   = [string]$r['createdDateTime']
        }
    } catch { }

    $script:PrincipalCache[$Id] = $obj
    return $obj
}

function Expand-GroupMember {
    param([string]$GroupId)
    if ($script:GroupCache.ContainsKey($GroupId)) { return $script:GroupCache[$GroupId] }

    $membros = @()
    try {
        # transitiveMembers já resolve grupos aninhados
        foreach ($m in (Get-MgGroupTransitiveMember -GroupId $GroupId -All -ErrorAction Stop)) {
            $t = $m.AdditionalProperties['@odata.type']
            if ($t -eq '#microsoft.graph.user' -or $t -eq '#microsoft.graph.servicePrincipal') {
                $tipo = if ($t -eq '#microsoft.graph.user') { 'User' } else { 'ServicePrincipal' }
                if ($tipo -eq 'ServicePrincipal' -and
                    $m.AdditionalProperties['servicePrincipalType'] -eq 'ManagedIdentity') {
                    $tipo = 'ManagedIdentity'
                }
                $membros += [pscustomobject]@{
                    Id = $m.Id
                    DisplayName = [string]$m.AdditionalProperties['displayName']
                    UPN = [string]$m.AdditionalProperties['userPrincipalName']
                    Type = $tipo; AppId = ''; Enabled = $null; CreatedAt = $null
                }
            }
        }
    } catch {
        Write-Warn2 "Não consegui expandir o grupo $GroupId : $($_.Exception.Message)"
    }
    $script:GroupCache[$GroupId] = $membros
    return $membros
}

function Get-EntraAssignment {
    param($Catalog)
    Write-Step 'Coletando atribuições do Entra ID'

    $out = [System.Collections.Generic.List[object]]::new()

    $defs = @{}
    foreach ($rd in Get-MgRoleManagementDirectoryRoleDefinition -All) { $defs[$rd.Id] = $rd.DisplayName }
    Write-Ok "$($defs.Count) role definitions no tenant"

    # templateId -> metadados do catálogo
    $cat = @{}
    foreach ($r in $Catalog.entraRoles) { $cat[$r.templateId.ToLower()] = $r }

    function Add-Row {
        param($P, [string]$RoleId, [string]$RoleName, [string]$Via, [string]$ScopeTxt, [string]$ViaGroup)
        $meta = $cat[$RoleId.ToLower()]
        $out.Add([pscustomobject]@{
            Cloud         = 'Entra ID'
            PrincipalId   = $P.Id
            PrincipalName = $P.DisplayName
            PrincipalUPN  = $P.UPN
            PrincipalType = $P.Type
            PrincipalAppId= $P.AppId
            RoleId        = $RoleId
            RoleName      = if ($meta) { $meta.name } else { $RoleName }
            RoleSlug      = if ($meta) { $meta.slug } else { '' }
            TierLevel     = if ($meta) { $meta.tierLevel } else { $null }
            IsPrivileged  = if ($meta) { $meta.isPrivileged } else { $false }
            Category      = if ($meta) { $meta.category } else { '' }
            Via           = $Via
            ViaGroup      = $ViaGroup
            AssignmentScope = $ScopeTxt
            InCatalog     = [bool]$meta
        })
    }

    $ativas = Get-MgRoleManagementDirectoryRoleAssignment -All
    Write-Ok "$($ativas.Count) atribuições ativas"
    foreach ($a in $ativas) {
        $p = Resolve-Principal $a.PrincipalId
        $nome = if ($defs.ContainsKey($a.RoleDefinitionId)) { $defs[$a.RoleDefinitionId] } else { $a.RoleDefinitionId }
        if ($p.Type -eq 'Group' -and -not $ExcludeGroups) {
            foreach ($m in (Expand-GroupMember -GroupId $p.Id)) {
                Add-Row $m $a.RoleDefinitionId $nome 'Ativa (via grupo)' $a.DirectoryScopeId $p.DisplayName
            }
        } else {
            Add-Row $p $a.RoleDefinitionId $nome 'Ativa' $a.DirectoryScopeId ''
        }
    }

    if (-not $ExcludePim) {
        try {
            $eleg = Get-MgRoleManagementDirectoryRoleEligibilitySchedule -All -ErrorAction Stop
            Write-Ok "$($eleg.Count) atribuições elegíveis (PIM)"
            foreach ($e in $eleg) {
                $p = Resolve-Principal $e.PrincipalId
                $nome = if ($defs.ContainsKey($e.RoleDefinitionId)) { $defs[$e.RoleDefinitionId] } else { $e.RoleDefinitionId }
                if ($p.Type -eq 'Group' -and -not $ExcludeGroups) {
                    foreach ($m in (Expand-GroupMember -GroupId $p.Id)) {
                        Add-Row $m $e.RoleDefinitionId $nome 'Elegível PIM (via grupo)' $e.DirectoryScopeId $p.DisplayName
                    }
                } else {
                    Add-Row $p $e.RoleDefinitionId $nome 'Elegível PIM' $e.DirectoryScopeId ''
                }
            }
        } catch {
            Write-Warn2 "Não consegui ler elegibilidades PIM ($($_.Exception.Message)). O tenant pode não ter Entra ID P2."
        }
    }

    Write-Ok "$($out.Count) vínculos no Entra ID"
    return $out
}

function Get-AzureAssignment {
    param($Catalog, [string]$TenantId, [ref]$Status)

    Write-Step 'Coletando atribuições de Azure RBAC'

    $out = [System.Collections.Generic.List[object]]::new()
    $cat = @{}
    foreach ($r in $Catalog.azureRoles) { $cat[$r.roleDefinitionId.ToLower()] = $r }

    # Filtrar por tenant evita que uma conta com acesso a vários tenants traga
    # assinaturas de outro ambiente para o relatório.
    #
    # ATENÇÃO: -TenantId do Get-AzSubscription só aceita GUID. Passar o domínio
    # (contoso.onmicrosoft.com) não dá erro — devolve zero assinaturas em
    # silêncio. Por isso $TenantId aqui já chega resolvido para GUID, e ainda
    # assim confirmamos sem filtro antes de concluir que não há nada.
    $todas = @()
    try {
        $todas = @(Get-AzSubscription -ErrorAction Stop | Where-Object { $_.State -eq 'Enabled' })
    } catch {
        Write-Warn2 "Falha ao listar assinaturas: $($_.Exception.Message)"
        $Status.Value = 'falha ao listar assinaturas'
        return $out
    }

    $ehGuid = $TenantId -match '^[0-9a-fA-F-]{36}$'
    $subs = if ($ehGuid) { @($todas | Where-Object { $_.TenantId -eq $TenantId }) } else { @($todas) }

    if ($subs.Count -eq 0 -and $todas.Count -gt 0) {
        # O filtro zerou mas existem assinaturas visíveis: melhor usar todas e
        # avisar do que devolver um relatório vazio que parece "sem acesso".
        Write-Warn2 ("$($todas.Count) assinatura(s) visível(is), nenhuma casou com o tenant $TenantId — " +
                     'usando todas. Confira o tenant no resumo.')
        $subs = $todas
    }
    Write-Ok "$($subs.Count) assinatura(s) habilitada(s)"

    # Sem assinatura, Get-AzRoleAssignment não tem escopo onde ancorar. Ainda
    # assim pode haver atribuição em management group — inclusive Tier 0, que é
    # justamente onde costuma estar. Só varremos MG neste caso porque, havendo
    # assinatura, o Get-AzRoleAssignment já devolve o que é herdado de MG e
    # varrer os dois lados duplicaria as linhas.
    $escopos = @()
    if ($subs.Count -eq 0) {
        Write-Warn2 'Nenhuma assinatura — procurando atribuições em management groups.'
        try {
            foreach ($mg in @(Get-AzManagementGroup -ErrorAction Stop)) {
                $escopos += [pscustomobject]@{ Nome = "MG: $($mg.DisplayName)"; Id = $null; Scope = $mg.Id }
            }
            Write-Ok "$($escopos.Count) management group(s)"
        } catch {
            Write-Warn2 "Não consegui listar management groups: $($_.Exception.Message)"
        }
        if ($escopos.Count -eq 0) {
            Write-Warn2 'Se você usa "Acesso a todas as assinaturas" (elevação em Propriedades do Entra ID),'
            Write-Warn2 'a elevação precisa estar ATIVA nesta sessão. Rode:  Connect-AzAccount -Tenant <tenant>'
            Write-Warn2 'e confirme com:  Get-AzSubscription'
            $Status.Value = 'nenhuma assinatura nem management group acessível'
            return $out
        }
    } else {
        foreach ($x in $subs) { $escopos += [pscustomobject]@{ Nome = $x.Name; Id = $x.Id; Scope = $null } }
    }

    $semAcesso = 0
    foreach ($sub in $escopos) {
        if ($sub.Id) {
            try { $null = Set-AzContext -SubscriptionId $sub.Id -TenantId $TenantId -ErrorAction Stop }
            catch { Write-Warn2 "Sem acesso a $($sub.Name)"; $semAcesso++; continue }
        }

        try {
            $ras = if ($sub.Scope) { @(Get-AzRoleAssignment -Scope $sub.Scope -ErrorAction Stop) }
                   else            { @(Get-AzRoleAssignment -ErrorAction Stop) }
        }
        catch {
            Write-Warn2 "Não listei role assignments em $($sub.Name): $($_.Exception.Message)"
            $semAcesso++; continue
        }
        Write-Ok "$($sub.Name): $($ras.Count) atribuição(ões)"

        foreach ($ra in $ras) {
            $defId = ($ra.RoleDefinitionId -split '/')[-1]
            $meta = $cat[$defId.ToLower()]
            $tipo = if ($ra.ObjectType) { $ra.ObjectType } else { 'Unknown' }

            $alvos = @()
            if ($tipo -eq 'Group' -and -not $ExcludeGroups) {
                $alvos = Expand-GroupMember -GroupId $ra.ObjectId
                $viaGrupo = $ra.DisplayName
                $via = 'Ativa (via grupo)'
            } else {
                $alvos = @([pscustomobject]@{
                    Id = $ra.ObjectId; DisplayName = $ra.DisplayName
                    UPN = $ra.SignInName; Type = $tipo; AppId = '' })
                $viaGrupo = ''
                $via = 'Ativa'
            }

            foreach ($p in $alvos) {
                $out.Add([pscustomobject]@{
                    Cloud = 'Azure RBAC'
                    PrincipalId = $p.Id; PrincipalName = $p.DisplayName
                    PrincipalUPN = $p.UPN; PrincipalType = $p.Type; PrincipalAppId = $p.AppId
                    RoleId = $defId
                    RoleName = if ($meta) { $meta.name } else { $ra.RoleDefinitionName }
                    RoleSlug = if ($meta) { $meta.slug } else { '' }
                    TierLevel = if ($meta) { $meta.tierLevel } else { $null }
                    IsPrivileged = if ($meta) { $meta.isPrivileged } else { $false }
                    Category = if ($meta) { $meta.category } else { '' }
                    Via = $via; ViaGroup = $viaGrupo
                    AssignmentScope = "$($sub.Name) :: $($ra.Scope)"
                    InCatalog = [bool]$meta
                })
            }
        }

        if (-not $ExcludePim) {
            try {
                $escopoPim = if ($sub.Scope) { $sub.Scope } else { "/subscriptions/$($sub.Id)" }
                $eleg = @(Get-AzRoleEligibilityScheduleInstance -Scope $escopoPim -ErrorAction Stop)
                foreach ($e in $eleg) {
                    $defId = ($e.RoleDefinitionId -split '/')[-1]
                    $meta = $cat[$defId.ToLower()]
                    $out.Add([pscustomobject]@{
                        Cloud = 'Azure RBAC'
                        PrincipalId = $e.PrincipalId; PrincipalName = $e.PrincipalDisplayName
                        PrincipalUPN = ''; PrincipalType = $e.PrincipalType; PrincipalAppId = ''
                        RoleId = $defId
                        RoleName = if ($meta) { $meta.name } else { $e.RoleDefinitionDisplayName }
                        RoleSlug = if ($meta) { $meta.slug } else { '' }
                        TierLevel = if ($meta) { $meta.tierLevel } else { $null }
                        IsPrivileged = if ($meta) { $meta.isPrivileged } else { $false }
                        Category = if ($meta) { $meta.category } else { '' }
                        Via = 'Elegível PIM'; ViaGroup = ''
                        AssignmentScope = "$($sub.Name) :: $($e.ScopeDisplayName)"
                        InCatalog = [bool]$meta
                    })
                }
            } catch { }
        }
    }

    if ($out.Count -eq 0) {
        $Status.Value = if ($semAcesso -eq $escopos.Count) { 'sem permissão de leitura em nenhum escopo' }
                        else { 'nenhuma atribuição encontrada' }
        Write-Warn2 "Azure RBAC não produziu vínculos — $($Status.Value)."
    } else {
        $Status.Value = "$($out.Count) vínculo(s) em $($escopos.Count) escopo(s)"
    }
    Write-Ok "$($out.Count) vínculos no Azure RBAC"
    return $out
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Credenciais de service principal
# ─────────────────────────────────────────────────────────────────────────────

function Get-ServicePrincipalCredential {
    param([string[]]$AppIds)
    Write-Step 'Verificando credenciais de service principals com acesso'

    $res = @{}
    $hoje = Get-Date
    foreach ($appId in ($AppIds | Where-Object { $_ } | Select-Object -Unique)) {
        try {
            $r = Invoke-MgGraphRequest -Method GET `
                -Uri "/v1.0/applications?`$filter=appId eq '$appId'&`$select=id,displayName,passwordCredentials,keyCredentials" `
                -ErrorAction Stop
            $app = @($r.value)[0]
            if (-not $app) { continue }

            $creds = @()
            foreach ($c in @($app.passwordCredentials) + @($app.keyCredentials)) {
                if (-not $c) { continue }
                $fim = if ($c.endDateTime) { [datetime]$c.endDateTime } else { $null }
                $ini = if ($c.startDateTime) { [datetime]$c.startDateTime } else { $null }
                $creds += [pscustomobject]@{
                    Tipo = if ($c.hint -or $c.secretText) { 'Secret' } else { 'Certificado' }
                    Inicio = $ini; Fim = $fim
                    Vencida = ($fim -and $fim -lt $hoje)
                    IdadeDias = if ($ini) { [int]($hoje - $ini).TotalDays } else { $null }
                }
            }
            if ($creds.Count) { $res[$appId] = $creds }
        } catch { }
    }
    Write-Ok "$($res.Count) aplicação(ões) com credencial inspecionada"
    return $res
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Achados
# ─────────────────────────────────────────────────────────────────────────────

# Deduz a que cloud um achado pertence a partir das atribuições que o
# originaram. Achado que aparece nas duas continua marcado como 'Ambas' e é
# exibido nas duas abas — dividir à força daria a impressão de dois problemas
# distintos onde há um só.
function Get-CloudTag {
    param($Origem)
    $clouds = @($Origem | Where-Object { $_.Cloud } | Select-Object -ExpandProperty Cloud -Unique)
    if ($clouds.Count -eq 1) { return $clouds[0] }
    return 'Ambas'
}

function New-Finding {
    param([string]$Id, [string]$Severidade, [string]$Titulo, [string]$Detalhe,
          [string]$Recomendacao, [int]$Qtd, $Itens, [string]$Cloud = 'Ambas')
    [pscustomobject]@{
        Id = $Id; Severidade = $Severidade; Titulo = $Titulo
        Detalhe = $Detalhe; Recomendacao = $Recomendacao
        Quantidade = $Qtd
        Cloud = $Cloud
        Itens = ($Itens | Select-Object -First 50)
    }
}

function Get-Findings {
    param($Assignments, $Catalog, $Credenciais)
    Write-Step 'Avaliando o ambiente'

    $f = [System.Collections.Generic.List[object]]::new()
    $humanos = $Assignments | Where-Object { $_.PrincipalType -eq 'User' }

    # ── Global Administrator ──
    # A Microsoft recomenda entre 2 e 4; menos de 2 é risco de lockout.
    $gaId = '62e90394-69f5-4237-9190-012177145e10'
    $ga = @($Assignments | Where-Object { $_.RoleId -eq $gaId } |
            Select-Object -ExpandProperty PrincipalId -Unique)
    if ($ga.Count -gt 4) {
        $nomes = @($Assignments | Where-Object { $_.RoleId -eq $gaId } |
                   Select-Object PrincipalName, PrincipalUPN, Via -Unique)
        $f.Add((New-Finding 'GA-EXCESSO' 'critical' 'Excesso de Global Administrators' `
            "$($ga.Count) identidades com Global Administrator." `
            'A Microsoft recomenda de 2 a 4. Reduza para o mínimo e mova o restante para roles específicas, ativadas via PIM.' `
            $ga.Count $nomes 'Entra ID'))
    } elseif ($ga.Count -lt 2) {
        $f.Add((New-Finding 'GA-POUCOS' 'high' 'Menos de dois Global Administrators' `
            "$($ga.Count) identidade(s) com Global Administrator." `
            'Com apenas um, a perda dessa conta bloqueia o tenant. Mantenha ao menos duas, uma delas conta de emergência.' `
            $ga.Count @() 'Entra ID'))
    }

    # ── Tier 0 permanente ──
    $t0Perm = @($Assignments | Where-Object { $_.TierLevel -eq 0 -and $_.Via -like 'Ativa*' })
    if ($t0Perm.Count) {
        $ids = @($t0Perm | Select-Object -ExpandProperty PrincipalId -Unique)
        $f.Add((New-Finding 'T0-PERMANENTE' 'critical' 'Acesso Tier 0 permanente' `
            "$($ids.Count) identidade(s) com role Tier 0 atribuída de forma permanente, sem passar por PIM." `
            'Converta para elegível no PIM, com aprovação e janela de ativação. Acesso Tier 0 permanente é o alvo preferido de comprometimento.' `
            $ids.Count (@($t0Perm | Select-Object PrincipalName, PrincipalUPN, RoleName, Cloud -Unique)) (Get-CloudTag $t0Perm)))
    }

    # ── Managed Identity privilegiada ──
    $mi = @($Assignments | Where-Object { $_.PrincipalType -eq 'ManagedIdentity' -and ($_.IsPrivileged -or $_.TierLevel -eq 0) })
    if ($mi.Count) {
        $f.Add((New-Finding 'MI-PRIVILEGIADA' 'high' 'Managed Identity com acesso privilegiado' `
            "$(@($mi | Select-Object -ExpandProperty PrincipalId -Unique).Count) managed identity(ies) com role privilegiada ou Tier 0." `
            'Managed Identity raramente entra em revisão de acesso. Confirme que cada uma ainda é usada e reduza ao menor privilégio.' `
            $mi.Count (@($mi | Select-Object PrincipalName, RoleName, Cloud, AssignmentScope -Unique)) (Get-CloudTag $mi)))
    }

    # ── Service principal privilegiado ──
    $sp = @($Assignments | Where-Object { $_.PrincipalType -eq 'ServicePrincipal' -and ($_.IsPrivileged -or $_.TierLevel -eq 0) })
    if ($sp.Count) {
        $f.Add((New-Finding 'SP-PRIVILEGIADO' 'high' 'Service principal com acesso privilegiado' `
            "$(@($sp | Select-Object -ExpandProperty PrincipalId -Unique).Count) service principal(is) com role privilegiada ou Tier 0." `
            'Aplicação com acesso privilegiado não passa por MFA nem por Conditional Access de usuário. Revise a necessidade e prefira Managed Identity com escopo restrito.' `
            $sp.Count (@($sp | Select-Object PrincipalName, PrincipalAppId, RoleName, Cloud -Unique)) (Get-CloudTag $sp)))
    }

    # ── Credenciais vencidas ou antigas ──
    $credProblema = @()
    foreach ($appId in $Credenciais.Keys) {
        foreach ($c in $Credenciais[$appId]) {
            if ($c.Vencida -or ($c.IdadeDias -ne $null -and $c.IdadeDias -gt $StaleCredentialDays)) {
                $dono = @($Assignments | Where-Object { $_.PrincipalAppId -eq $appId } | Select-Object -First 1)
                $credProblema += [pscustomobject]@{
                    Aplicacao = if ($dono) { $dono.PrincipalName } else { $appId }
                    AppId = $appId; Tipo = $c.Tipo
                    Situacao = if ($c.Vencida) { 'Vencida' } else { "Ativa há $($c.IdadeDias) dias" }
                    Expira = $c.Fim
                }
            }
        }
    }
    if ($credProblema.Count) {
        $f.Add((New-Finding 'SP-CREDENCIAL' 'medium' 'Credencial de aplicação vencida ou antiga' `
            "$($credProblema.Count) credencial(is) vencida(s) ou com mais de $StaleCredentialDays dias, em aplicações que têm acesso ao tenant." `
            'Rotacione. Segredo de longa duração é o vetor mais comum de comprometimento de aplicação — prefira certificado ou federação de identidade de carga de trabalho.' `
            $credProblema.Count $credProblema))
    }

    # ── Conta desabilitada com role ──
    $desab = @($Assignments | Where-Object { $_.PrincipalType -eq 'User' } | ForEach-Object {
        $p = $script:PrincipalCache[$_.PrincipalId]
        if ($p -and $p.Enabled -eq $false) { $_ }
    })
    if ($desab.Count) {
        $f.Add((New-Finding 'CONTA-DESABILITADA' 'medium' 'Conta desabilitada mantendo role' `
            "$(@($desab | Select-Object -ExpandProperty PrincipalId -Unique).Count) conta(s) desabilitada(s) ainda com role atribuída." `
            'Remova as atribuições ao desabilitar a conta. Se ela for reabilitada, o acesso volta silenciosamente.' `
            $desab.Count (@($desab | Select-Object PrincipalName, PrincipalUPN, RoleName -Unique)) (Get-CloudTag $desab)))
    }

    # ── Acesso só por grupo aninhado ──
    $viaGrupo = @($Assignments | Where-Object { $_.ViaGroup -and ($_.TierLevel -eq 0) })
    if ($viaGrupo.Count) {
        $f.Add((New-Finding 'T0-VIA-GRUPO' 'medium' 'Tier 0 concedido por grupo' `
            "$(@($viaGrupo | Select-Object -ExpandProperty PrincipalId -Unique).Count) identidade(s) recebem Tier 0 por pertencer a um grupo." `
            'Acesso por grupo é mais difícil de auditar: quem entra no grupo ganha o acesso sem passar por aprovação de role. Restrinja a associação e monitore alterações.' `
            $viaGrupo.Count (@($viaGrupo | Select-Object PrincipalName, ViaGroup, RoleName -Unique)) (Get-CloudTag $viaGrupo)))
    }

    # ── Roles fora do catálogo (custom) ──
    $fora = @($Assignments | Where-Object { -not $_.InCatalog })
    if ($fora.Count) {
        $f.Add((New-Finding 'ROLE-CUSTOM' 'low' 'Roles fora do catálogo do IAM Scope' `
            "$(@($fora | Select-Object -ExpandProperty RoleName -Unique).Count) role(s) sem correspondente no catálogo — provavelmente custom roles." `
            'Custom roles não têm classificação de tier aqui. Revise manualmente as permissões de cada uma.' `
            $fora.Count (@($fora | Select-Object RoleName, Cloud -Unique)) (Get-CloudTag $fora)))
    }

    $ordem = @{ critical = 0; high = 1; medium = 2; low = 3 }
    return , @($f | Sort-Object { $ordem[$_.Severidade] })
}

function Get-SoDConflicts {
    param($Assignments, $Catalog)
    Write-Step 'Avaliando segregação de funções'

    $porPrincipal = @{}
    foreach ($a in $Assignments) {
        if (-not $porPrincipal.ContainsKey($a.PrincipalId)) { $porPrincipal[$a.PrincipalId] = @{} }
        $porPrincipal[$a.PrincipalId][$a.RoleId.ToLower()] = $a
    }

    $conf = [System.Collections.Generic.List[object]]::new()
    foreach ($rule in $Catalog.sodRules) {
        $kA = if ($rule.roleA.cloud -eq 'entra-id') { $rule.roleA.templateId } else { $rule.roleA.roleDefinitionId }
        $kB = if ($rule.roleB.cloud -eq 'entra-id') { $rule.roleB.templateId } else { $rule.roleB.roleDefinitionId }
        if (-not $kA -or -not $kB) { continue }
        $kA = $kA.ToLower(); $kB = $kB.ToLower()

        # NÃO renomear para $pid: é variável automática read-only do PowerShell
        # (o PID do processo). O erro só aparece em tempo de execução, e só
        # quando existe pelo menos uma regra de SoD com as duas roles válidas —
        # por isso passou despercebido até rodar num tenant real.
        foreach ($principalId in $porPrincipal.Keys) {
            $h = $porPrincipal[$principalId]
            if (-not ($h.ContainsKey($kA) -and $h.ContainsKey($kB))) { continue }
            $s = $h[$kA]
            $conf.Add([pscustomobject]@{
                RegraId = $rule.id; Regra = $rule.name; Severidade = $rule.severity
                Categoria = $rule.category
                Identidade = $s.PrincipalName; UPN = $s.PrincipalUPN; Tipo = $s.PrincipalType
                RoleA = $rule.roleA.name; ViaA = $h[$kA].Via; CloudA = $h[$kA].Cloud
                RoleB = $rule.roleB.name; ViaB = $h[$kB].Via; CloudB = $h[$kB].Cloud
                Risco = $rule.risk
                Mitigacao = ($rule.mitigation -join ' | ')
            })
        }
    }
    $ordem = @{ critical = 0; high = 1; medium = 2; low = 3 }
    Write-Ok "$($conf.Count) conflito(s) de SoD"
    return , @($conf | Sort-Object { $ordem[$_.Severidade] }, Regra)
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Score
# ─────────────────────────────────────────────────────────────────────────────

function Get-RiskScore {
    param($Findings, $Assignments, $SoD)

    # Score começa em 100 e desconta por achado. Os pesos são editoriais e
    # estão expostos no relatório para que a nota seja auditável — nota de
    # risco sem critério visível não ajuda ninguém a priorizar.
    $pesos = @{ critical = 15; high = 8; medium = 4; low = 1 }
    $desconto = 0
    $detalhe = @()

    foreach ($f in $Findings) {
        $d = $pesos[$f.Severidade]
        $desconto += $d
        $detalhe += [pscustomobject]@{ Origem = $f.Titulo; Severidade = $f.Severidade; Desconto = $d }
    }
    foreach ($grupo in ($SoD | Group-Object Severidade)) {
        # Conflitos de SoD contam uma vez por severidade, não por ocorrência:
        # 40 conflitos do mesmo tipo são um problema, não 40.
        $d = $pesos[$grupo.Name]
        $desconto += $d
        $detalhe += [pscustomobject]@{ Origem = "Conflitos de SoD ($($grupo.Count))"; Severidade = $grupo.Name; Desconto = $d }
    }

    $score = [Math]::Max(0, 100 - $desconto)
    $nivel = if ($score -ge 80) { 'Baixo' } elseif ($score -ge 60) { 'Moderado' } elseif ($score -ge 40) { 'Alto' } else { 'Crítico' }
    return [pscustomobject]@{ Score = $score; Nivel = $nivel; Detalhe = $detalhe }
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. Relatórios
# ─────────────────────────────────────────────────────────────────────────────

function Export-ExcelReport {
    param($Path, $Resumo, $Findings, $SoD, $Assignments, $Identidades, $Catalog, $Score)

    if (-not (Test-ModuleAvailable 'ImportExcel')) {
        Write-Warn2 'Módulo ImportExcel não encontrado — o .xlsx não será gerado.'
        Write-Warn2 'Para habilitar:  Install-Module ImportExcel -Scope CurrentUser'
        return $false
    }
    Import-Module ImportExcel -ErrorAction Stop
    if (Test-Path $Path) { Remove-Item $Path -Force }

    $x = @{ Path = $Path; AutoSize = $true; BoldTopRow = $true; FreezeTopRow = $true }

    $Resumo | Export-Excel @x -WorksheetName 'Resumo'
    $Score.Detalhe | Export-Excel @x -WorksheetName 'Score'

    if ($Findings.Count) {
        $Findings | Select-Object Id, Severidade, Titulo, Quantidade, Detalhe, Recomendacao |
            Export-Excel @x -WorksheetName 'Achados' -AutoFilter -ConditionalText @(
                New-ConditionalText -Text 'critical' -BackgroundColor '#FFC7CE' -ConditionalTextColor '#9C0006'
                New-ConditionalText -Text 'high'     -BackgroundColor '#FFEB9C' -ConditionalTextColor '#9C6500')
    }

    if ($SoD.Count) { $SoD | Export-Excel @x -WorksheetName 'Conflitos SoD' -AutoFilter }

    $Identidades | Export-Excel @x -WorksheetName 'Identidades' -AutoFilter

    $Assignments | Select-Object Cloud, PrincipalName, PrincipalUPN, PrincipalType, RoleName,
        @{n='Tier';e={ if ($_.TierLevel -ne $null) { "Tier $($_.TierLevel)" } else { 'n/d' } }},
        IsPrivileged, Via, ViaGroup, AssignmentScope |
        Export-Excel @x -WorksheetName 'Atribuicoes' -AutoFilter

    $Catalog.entraRoles | Select-Object name, slug, category, eamTier, tierLevel, isPrivileged, permissionCount |
        Export-Excel @x -WorksheetName 'Catalogo Entra' -AutoFilter
    $Catalog.azureRoles | Select-Object name, slug, category, tier, tierLevel, isPrivileged, permissionCount |
        Export-Excel @x -WorksheetName 'Catalogo Azure' -AutoFilter

    return $true
}

<#
    Monta os dados de UMA aba do dashboard.

    $Tag = $null  -> consolidado (as duas clouds)
    $Tag = 'Entra ID' / 'Azure RBAC' -> só aquela cloud

    As identidades são reagregadas por aba de propósito: quem tem 3 roles no
    Entra e 2 no Azure aparece com 3 na aba do Entra, não com 5. Reaproveitar a
    contagem consolidada faria a aba mentir sobre o próprio escopo.
#>
function Get-DashboardView {
    param($Assignments, $Findings, $SoD, [string]$Tag)

    $a  = if ($Tag) { @($Assignments | Where-Object { $_.Cloud -eq $Tag }) } else { @($Assignments) }
    $fi = if ($Tag) { @($Findings   | Where-Object { $_.Cloud -eq $Tag -or $_.Cloud -eq 'Ambas' }) } else { @($Findings) }
    $sd = if ($Tag) { @($SoD        | Where-Object { $_.CloudA -eq $Tag -or $_.CloudB -eq $Tag }) } else { @($SoD) }

    $porTier = @{ '0' = 0; '1' = 0; '2' = 0; 'nd' = 0 }
    foreach ($x in $a) {
        $k = if ($null -ne $x.TierLevel) { [string]$x.TierLevel } else { 'nd' }
        $porTier[$k]++
    }

    $ident = @($a | Group-Object PrincipalId | ForEach-Object {
        $g = $_.Group; $p = $g[0]
        [pscustomobject]@{
            Nome = $p.PrincipalName; UPN = $p.PrincipalUPN; Tipo = $p.PrincipalType
            TotalRoles         = @($g | Select-Object -ExpandProperty RoleName -Unique).Count
            RolesPrivilegiadas = @($g | Where-Object { $_.IsPrivileged } | Select-Object -ExpandProperty RoleName -Unique).Count
            RolesTier0         = @($g | Where-Object { $_.TierLevel -eq 0 } | Select-Object -ExpandProperty RoleName -Unique).Count
        }
    })

    $porTipo = @{}
    foreach ($i in $ident) { $porTipo[$i.Tipo] = ($porTipo[$i.Tipo] ?? 0) + 1 }

    @{
        totais = @{ identidades = $ident.Count; atribuicoes = $a.Count
                    achados = $fi.Count; sod = $sd.Count }
        porTier = $porTier
        porTipo = $porTipo
        findings = @($fi | ForEach-Object {
            @{ id = $_.Id; sev = $_.Severidade; titulo = $_.Titulo; detalhe = $_.Detalhe
               rec = $_.Recomendacao; qtd = $_.Quantidade; cloud = $_.Cloud
               itens = @($_.Itens | ForEach-Object { ($_ | ConvertTo-Json -Compress -Depth 3) }) } })
        sod = @($sd | Select-Object -First 300 | ForEach-Object {
            @{ regra = $_.Regra; sev = $_.Severidade; ident = $_.Identidade; upn = $_.UPN
               roleA = $_.RoleA; roleB = $_.RoleB; risco = $_.Risco
               cloudA = $_.CloudA; cloudB = $_.CloudB } })
        identidades = @($ident | Sort-Object RolesPrivilegiadas -Descending | Select-Object -First 15 |
            ForEach-Object {
                @{ nome = $_.Nome; upn = $_.UPN; tipo = $_.Tipo; roles = $_.TotalRoles
                   priv = $_.RolesPrivilegiadas; t0 = $_.RolesTier0 } })
    }
}

function Export-HtmlDashboard {
    param($Path, $Tenant, $Resumo, $Findings, $SoD, $Assignments, $Identidades, $Score, $Catalog)

    $payload = [pscustomobject]@{
        tenant      = $Tenant
        generatedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        disclaimer  = $Catalog.disclaimer
        score       = @{ valor = $Score.Score; nivel = $Score.Nivel
                         detalhe = @($Score.Detalhe | ForEach-Object { @{ origem = $_.Origem; sev = $_.Severidade; desc = $_.Desconto } }) }
        resumo      = @($Resumo | ForEach-Object { @{ item = $_.Item; valor = [string]$_.Valor } })
        views       = @{
            geral = Get-DashboardView -Assignments $Assignments -Findings $Findings -SoD $SoD -Tag $null
            entra = Get-DashboardView -Assignments $Assignments -Findings $Findings -SoD $SoD -Tag 'Entra ID'
            azure = Get-DashboardView -Assignments $Assignments -Findings $Findings -SoD $SoD -Tag 'Azure RBAC'
        }
    }

    $json = ($payload | ConvertTo-Json -Depth 10 -Compress).Replace('</', '<\/')

    $html = @'
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IAM Scope — Assessment</title>
<style>
:root{--bg:#0b1220;--card:#131c2e;--line:#243049;--txt:#e6edf7;--dim:#93a3bd;
--crit:#f87171;--high:#fb923c;--med:#facc15;--low:#4ade80;--ok:#34d399;--accent:#60a5fa}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif}
header{padding:22px 32px;border-bottom:1px solid var(--line)}
h1{font-size:19px;margin:0 0 4px;font-weight:600}
.sub{color:var(--dim);font-size:12px}
main{padding:24px 32px;max-width:1500px}
.score{display:flex;align-items:center;gap:24px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px 24px;margin-bottom:20px;flex-wrap:wrap}
.score .n{font-size:52px;font-weight:700;line-height:1}
.score .lbl{font-size:13px;color:var(--dim)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.card .n{font-size:24px;font-weight:700;line-height:1.1}
.card .l{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}
@media(max-width:980px){.grid{grid-template-columns:1fr}}
.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
.panel h2{font-size:12px;margin:0 0 14px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.bar{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:12px}
.bar .lbl{width:180px;color:var(--dim);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .track{flex:1;background:#0a1020;border-radius:4px;height:16px;overflow:hidden}
.bar .fill{height:100%;border-radius:4px}
.bar .val{width:44px;font-variant-numeric:tabular-nums;font-weight:600;text-align:right}
.f{border:1px solid var(--line);border-radius:10px;margin-bottom:10px;overflow:hidden}
.f .h{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;background:var(--card)}
.f .h:hover{background:#18233a}
.f .b{padding:0 16px 14px;font-size:12px;color:var(--dim);display:none}
.f .b b{color:var(--txt);display:block;margin:10px 0 3px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.sev{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;flex-shrink:0}
.qtd{margin-left:auto;color:var(--dim);font-size:12px;flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:8px 10px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--card)}
td{padding:8px 10px;border-bottom:1px solid #1b2540}
.tblwrap{max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:10px}
.empty{padding:32px;text-align:center;color:var(--dim)}
input{background:#0a1020;border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:7px 10px;font-size:12px;min-width:280px;margin-bottom:10px}
footer{padding:20px 32px;color:var(--dim);font-size:11px;border-top:1px solid var(--line);margin-top:24px}
code{background:#0a1020;padding:1px 5px;border-radius:4px;font-size:11px}
nav.tabs{display:flex;gap:2px;padding:0 32px;border-bottom:1px solid var(--line);background:var(--bg);
  position:sticky;top:0;z-index:20;overflow-x:auto}
nav.tabs button{background:none;border:none;border-bottom:3px solid transparent;color:var(--dim);
  font:600 12px/1 inherit;letter-spacing:.06em;text-transform:uppercase;padding:14px 18px;cursor:pointer;
  white-space:nowrap;transition:color .15s,border-color .15s}
nav.tabs button:hover{color:var(--txt)}
nav.tabs button[aria-selected="true"]{color:var(--txt)}
nav.tabs button .cnt{display:inline-block;margin-left:7px;padding:1px 7px;border-radius:999px;
  background:#0a1020;font-size:10px;color:var(--dim)}
.vazio{background:var(--card);border:1px dashed var(--line);border-radius:10px;padding:28px;
  text-align:center;color:var(--dim);font-size:13px}
</style></head><body>
<header><h1>Assessment de Identidade e Acesso</h1><span class="sub" id="hdr"></span></header>
<nav class="tabs" id="tabs" role="tablist"></nav>
<main>
  <div class="score" id="score"></div>
  <div id="aviso"></div>
  <div class="cards" id="cards"></div>
  <div class="grid">
    <div class="panel"><h2>Atribuições por tier</h2><div id="cTier"></div></div>
    <div class="panel"><h2>Identidades por tipo</h2><div id="cTipo"></div></div>
  </div>
  <div class="panel" style="margin-bottom:22px"><h2>Achados</h2><div id="findings"></div></div>
  <div class="panel" style="margin-bottom:22px">
    <h2>Identidades com mais acesso privilegiado</h2>
    <div class="tblwrap"><table><thead><tr>
      <th>Identidade</th><th>Tipo</th><th>Roles</th><th>Privilegiadas</th><th>Tier 0</th>
    </tr></thead><tbody id="tIdent"></tbody></table></div>
  </div>
  <div class="panel">
    <h2>Conflitos de segregação de funções</h2>
    <input id="q" placeholder="Filtrar por identidade, regra ou role...">
    <div class="tblwrap"><table><thead><tr>
      <th>Sev.</th><th>Regra</th><th>Identidade</th><th>Role A</th><th>Role B</th>
    </tr></thead><tbody id="tSod"></tbody></table></div>
  </div>
</main>
<footer id="ft"></footer>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const SEV={critical:'#f87171',high:'#fb923c',medium:'#facc15',low:'#4ade80'};
const SEVL={critical:'Crítico',high:'Alto',medium:'Médio',low:'Baixo'};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

document.getElementById('hdr').textContent = D.tenant + ' · ' + D.generatedAt;
document.getElementById('ft').innerHTML =
  esc(D.disclaimer) + ' Gerado pelo <strong>IAM Scope</strong>. O script é somente leitura e não altera nada no tenant.';

// ── Abas ──────────────────────────────────────────────────────────────────
// O score fica FORA da aba: ele é do tenant inteiro e não se recalcula por
// cloud. Repeti-lo em cada aba daria a entender que existe um score do Entra
// e outro do Azure, o que seria falso.
const ABAS=[['geral','Visão geral'],['entra','Entra ID'],['azure','Azure RBAC']];
let atual='geral';

const cor = D.score.valor>=80?'#34d399':D.score.valor>=60?'#facc15':D.score.valor>=40?'#fb923c':'#f87171';
document.getElementById('score').innerHTML =
  `<div><div class="n" style="color:${cor}">${D.score.valor}</div><div class="lbl">de 100</div></div>
   <div><div style="font-size:17px;font-weight:600;color:${cor}">Risco ${esc(D.score.nivel)}</div>
   <div class="lbl" style="margin-top:4px">Score do tenant, consolidado — não muda por aba.</div>
   <div class="lbl" style="margin-top:4px">Descontos: ${D.score.detalhe.map(d=>esc(d.origem)+' (−'+d.desc+')').join(' · ')||'nenhum'}</div></div>`;

function barras(el,entries,cores){
  if(!entries.length){el.innerHTML='<p class="sub">Sem dados.</p>';return}
  const max=Math.max(...entries.map(e=>e[1]))||1;
  el.innerHTML=entries.map(([k,v],i)=>
   `<div class="bar"><span class="lbl" title="${esc(k)}">${esc(k)}</span>
    <span class="track"><span class="fill" style="width:${(v/max*100).toFixed(1)}%;background:${cores[i%cores.length]}"></span></span>
    <span class="val">${v}</span></div>`).join('');
}
function tg(i){const e=document.getElementById('fb'+i);e.style.display=e.style.display==='block'?'none':'block'}

function render(){
  const V=D.views[atual];

  document.querySelectorAll('#tabs button').forEach(b=>
    b.setAttribute('aria-selected', b.dataset.k===atual?'true':'false'));
  document.querySelectorAll('#tabs button').forEach(b=>
    b.style.borderBottomColor = b.dataset.k===atual ? '#60a5fa' : 'transparent');

  // Aba sem nenhum vínculo não é "zero risco": ou a cloud não foi coletada ou
  // não há atribuição. Dizer isso evita que a aba vazia seja lida como aprovação.
  const av=document.getElementById('aviso');
  if(V.totais.atribuicoes===0 && atual!=='geral'){
    const cob=(D.resumo.find(r=>r.item.trim()==='Cobertura Azure RBAC')||{}).valor||'';
    av.innerHTML='<div class="vazio">Nenhuma atribuição coletada nesta cloud.'+
      (atual==='azure'&&cob?'<br><span style="font-size:12px">Cobertura Azure RBAC: <code>'+esc(cob)+'</code></span>':'')+
      '</div>';
  } else av.innerHTML='';

  const cards=[['Identidades',V.totais.identidades,'#e6edf7'],['Atribuições',V.totais.atribuicoes,'#60a5fa'],
   ['Achados',V.totais.achados,'#fb923c'],['Conflitos SoD',V.totais.sod,'#f87171'],
   ['Tier 0',V.porTier['0']||0,'#f87171'],['Tier 1',V.porTier['1']||0,'#fb923c']];
  document.getElementById('cards').innerHTML = cards.map(([l,n,c])=>
    `<div class="card"><div class="n" style="color:${c}">${n}</div><div class="l">${l}</div></div>`).join('');

  barras(document.getElementById('cTier'),
    [['Tier 0 — Control Plane',V.porTier['0']||0],['Tier 1 — Management',V.porTier['1']||0],
     ['Tier 2 — Workload',V.porTier['2']||0],['Sem classificação',V.porTier['nd']||0]],
    ['#f87171','#fb923c','#4ade80','#64748b']);
  barras(document.getElementById('cTipo'),
    Object.entries(V.porTipo).sort((a,b)=>b[1]-a[1]), ['#60a5fa','#a78bfa','#f472b6','#34d399','#facc15']);

  document.getElementById('findings').innerHTML = V.findings.length ? V.findings.map((f,i)=>`
    <div class="f"><div class="h" onclick="tg(${i})">
      <span class="sev" style="background:${SEV[f.sev]}22;color:${SEV[f.sev]}">${SEVL[f.sev]}</span>
      <span>${esc(f.titulo)}</span>
      ${f.cloud==='Ambas'&&atual!=='geral'?'<span class="sev" style="background:#60a5fa22;color:#60a5fa">as duas clouds</span>':''}
      <span class="qtd">${f.qtd}</span></div>
     <div class="b" id="fb${i}">
       <b>O que foi encontrado</b>${esc(f.detalhe)}
       <b>Recomendação</b>${esc(f.rec)}
       ${f.itens.length?'<b>Amostra</b><pre style="white-space:pre-wrap;font-size:11px">'+esc(f.itens.slice(0,10).join('\n'))+'</pre>':''}
     </div></div>`).join('') : '<p class="empty">Nenhum achado.</p>';

  document.getElementById('tIdent').innerHTML = V.identidades.length ? V.identidades.map(i=>
    `<tr><td>${esc(i.nome)}<br><span class="sub">${esc(i.upn||'')}</span></td><td>${esc(i.tipo)}</td>
     <td>${i.roles}</td><td style="color:#fb923c">${i.priv}</td><td style="color:#f87171">${i.t0}</td></tr>`).join('')
    : '<tr><td colspan="5" class="empty">Sem dados.</td></tr>';

  sod();
}

function sod(){
  const V=D.views[atual];
  const q=document.getElementById('q').value.toLowerCase();
  const rows=V.sod.filter(s=>!q||[s.ident,s.upn,s.regra,s.roleA,s.roleB].join(' ').toLowerCase().includes(q));
  document.getElementById('tSod').innerHTML = rows.length ? rows.map(s=>
   `<tr><td><span class="sev" style="background:${SEV[s.sev]}22;color:${SEV[s.sev]}">${SEVL[s.sev]}</span></td>
    <td>${esc(s.regra)}</td><td>${esc(s.ident)}<br><span class="sub">${esc(s.upn||'')}</span></td>
    <td>${esc(s.roleA)}<br><span class="sub">${esc(s.cloudA||'')}</span></td>
    <td>${esc(s.roleB)}<br><span class="sub">${esc(s.cloudB||'')}</span></td></tr>`).join('')
   : '<tr><td colspan="5" class="empty">Nenhum conflito com esse filtro.</td></tr>';
}

document.getElementById('tabs').innerHTML = ABAS.map(([k,l])=>
  `<button role="tab" data-k="${k}" aria-selected="${k===atual}">${l}` +
  `<span class="cnt">${D.views[k].totais.atribuicoes}</span></button>`).join('');
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{
  atual=b.dataset.k;
  location.hash=atual;          // aba fica no endereço: dá para mandar o link já na aba certa
  render();
  window.scrollTo({top:0});
});

const inicial=(location.hash||'').replace('#','');
if(D.views[inicial]) atual=inicial;
document.getElementById('q').oninput=sod;
render();
</script></body></html>
'@

    Set-Content -Path $Path -Value $html.Replace('__DATA__', $json) -Encoding UTF8
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '  IAM Scope — Assessment de Identidade e Acesso' -ForegroundColor White
Write-Host '  Somente leitura. Nada é alterado no tenant.' -ForegroundColor DarkGray
Write-Host ''

if (-not $TenantId) {
    $TenantId = Read-Host '  Tenant ID (GUID ou domínio, ex.: contoso.onmicrosoft.com)'
    if (-not $TenantId) { throw 'Tenant ID é obrigatório.' }
}

$catalog = Get-Catalog
Write-Ok "$($catalog.entraRoles.Count) roles Entra, $($catalog.azureRoles.Count) roles Azure, $($catalog.sodRules.Count) regras de SoD"

foreach ($m in @('Microsoft.Graph.Authentication', 'Microsoft.Graph.Identity.Governance')) {
    if (-not (Test-ModuleAvailable $m)) { throw "Módulo $m não encontrado.`n  Install-Module $m -Scope CurrentUser" }
}

Write-Step 'Autenticando no Microsoft Graph (somente leitura)'
Connect-MgGraph -TenantId $TenantId -NoWelcome -Scopes @(
    'Directory.Read.All', 'RoleManagement.Read.Directory', 'Application.Read.All')

$ctx = Get-MgContext

# O usuário pode informar domínio; o Graph devolve o GUID correspondente.
# Guardamos os dois: o original serve para Connect-*, o GUID para filtrar.
$tenantGuid = if ($ctx -and $ctx.TenantId) { $ctx.TenantId } else { $TenantId }

$tenantLabel = $TenantId
try {
    $org = Get-MgOrganization -ErrorAction Stop | Select-Object -First 1
    if ($org -and $org.DisplayName) { $tenantLabel = "$($org.DisplayName) ($TenantId)" }
} catch { }
Write-Ok "Conectado como $($ctx.Account)"

$assign = [System.Collections.Generic.List[object]]::new()

if ($Scope -in @('EntraId', 'Both')) {
    foreach ($a in (Get-EntraAssignment -Catalog $catalog)) { $assign.Add($a) }
}

# Estado da coleta do Azure RBAC. Vai para o relatório: um assessment que
# silenciosamente cobre metade do ambiente é pior que um que diz o que faltou.
$azureStatus = if ($Scope -eq 'EntraId') { 'não solicitado (-Scope EntraId)' } else { 'não executado' }

if ($Scope -in @('AzureRbac', 'Both')) {
    $faltando = @('Az.Accounts', 'Az.Resources') | Where-Object { -not (Test-ModuleAvailable $_) }

    if ($faltando) {
        # Aviso barulhento de propósito: antes era uma linha amarela que sumia
        # no scroll, e o relatório saía parecendo completo.
        Write-Host ''
        Write-Host '  ┌────────────────────────────────────────────────────────────┐' -ForegroundColor Yellow
        Write-Host '  │  AZURE RBAC NÃO SERÁ AVALIADO                              │' -ForegroundColor Yellow
        Write-Host '  └────────────────────────────────────────────────────────────┘' -ForegroundColor Yellow
        Write-Warn2 "Módulo(s) ausente(s): $($faltando -join ', ')"
        Write-Warn2 "Install-Module $($faltando -join ',') -Scope CurrentUser"
        Write-Warn2 'Depois rode o script de novo; o Entra ID segue normalmente agora.'
        Write-Host ''
        $azureStatus = "pulado — falta $($faltando -join ', ')"
    } else {
        Import-Module Az.Accounts -ErrorAction SilentlyContinue
        Import-Module Az.Resources -ErrorAction SilentlyContinue

        # Um contexto do Az já aberto pode ser de OUTRO tenant — caso comum em
        # quem atende vários clientes. Sem conferir, o assessment do tenant A
        # sairia com as assinaturas do tenant B.
        # Compara pelo GUID: o domínio nunca casa com $azCtx.Tenant.Id, e a
        # comparação falha sempre, forçando reautenticação a cada execução.
        $azCtx = Get-AzContext
        $tenantOk = $azCtx -and $azCtx.Tenant -and $azCtx.Tenant.Id -eq $tenantGuid

        if (-not $tenantOk) {
            if ($azCtx) { Write-Warn2 "Contexto do Az aberto em outro tenant ($($azCtx.Tenant.Id)) — reautenticando." }
            Write-Step 'Autenticando no Azure'
            try { Connect-AzAccount -Tenant $TenantId -ErrorAction Stop | Out-Null }
            catch {
                Write-Warn2 "Falha ao autenticar no Azure: $($_.Exception.Message)"
                $azureStatus = 'falha na autenticação'
            }
        }

        if ($azureStatus -ne 'falha na autenticação') {
            $st = ''
            foreach ($a in (Get-AzureAssignment -Catalog $catalog -TenantId $tenantGuid -Status ([ref]$st))) {
                $assign.Add($a)
            }
            $azureStatus = $st
        }
    }
}

$totalAzure = @($assign | Where-Object { $_.Cloud -eq 'Azure RBAC' }).Count
$totalEntra = @($assign | Where-Object { $_.Cloud -ne 'Azure RBAC' }).Count

if (-not $assign.Count) { throw 'Nenhuma atribuição coletada — nada a avaliar.' }

$creds = Get-ServicePrincipalCredential -AppIds @($assign | Where-Object { $_.PrincipalAppId } |
    Select-Object -ExpandProperty PrincipalAppId -Unique)

$findings = Get-Findings -Assignments $assign -Catalog $catalog -Credenciais $creds
$sod      = Get-SoDConflicts -Assignments $assign -Catalog $catalog
$score    = Get-RiskScore -Findings $findings -Assignments $assign -SoD $sod

# Inventário por identidade
$identidades = @($assign | Group-Object PrincipalId | ForEach-Object {
    $r = $_.Group
    $p = $r[0]
    [pscustomobject]@{
        Nome = $p.PrincipalName
        UPN  = $p.PrincipalUPN
        Tipo = $p.PrincipalType
        AppId = $p.PrincipalAppId
        TotalRoles = @($r | Select-Object -ExpandProperty RoleName -Unique).Count
        RolesPrivilegiadas = @($r | Where-Object { $_.IsPrivileged } | Select-Object -ExpandProperty RoleName -Unique).Count
        RolesTier0 = @($r | Where-Object { $_.TierLevel -eq 0 } | Select-Object -ExpandProperty RoleName -Unique).Count
        ViaPim = [bool](@($r | Where-Object { $_.Via -like '*PIM*' }).Count)
        ViaGrupo = [bool](@($r | Where-Object { $_.ViaGroup }).Count)
        Roles = (@($r | Select-Object -ExpandProperty RoleName -Unique) -join ' | ')
    }
} | Sort-Object RolesTier0, RolesPrivilegiadas -Descending)

$sev = @{ critical = 0; high = 0; medium = 0; low = 0 }
foreach ($f in $findings) { $sev[$f.Severidade]++ }

$resumo = @(
    [pscustomobject]@{ Item = 'Tenant';                      Valor = $tenantLabel }
    [pscustomobject]@{ Item = 'Data';                        Valor = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
    [pscustomobject]@{ Item = 'Executado por';               Valor = $ctx.Account }
    [pscustomobject]@{ Item = 'Escopo';                      Valor = $Scope }
    [pscustomobject]@{ Item = 'Elegíveis PIM considerados';  Valor = (-not $ExcludePim) }
    [pscustomobject]@{ Item = 'Grupos expandidos';           Valor = (-not $ExcludeGroups) }
    [pscustomobject]@{ Item = 'Score de risco';              Valor = "$($score.Score)/100 ($($score.Nivel))" }
    [pscustomobject]@{ Item = 'Identidades com acesso';      Valor = $identidades.Count }
    [pscustomobject]@{ Item = '  Usuários';                  Valor = @($identidades | Where-Object Tipo -eq 'User').Count }
    [pscustomobject]@{ Item = '  Service principals';        Valor = @($identidades | Where-Object Tipo -eq 'ServicePrincipal').Count }
    [pscustomobject]@{ Item = '  Managed identities';        Valor = @($identidades | Where-Object Tipo -eq 'ManagedIdentity').Count }
    [pscustomobject]@{ Item = 'Vínculos identidade->role';   Valor = $assign.Count }
    [pscustomobject]@{ Item = '  Entra ID';                  Valor = $totalEntra }
    [pscustomobject]@{ Item = '  Azure RBAC';                Valor = $totalAzure }
    [pscustomobject]@{ Item = 'Cobertura Azure RBAC';        Valor = $azureStatus }
    [pscustomobject]@{ Item = 'Tenant GUID';                 Valor = $tenantGuid }
    [pscustomobject]@{ Item = 'Atribuições Tier 0';          Valor = @($assign | Where-Object TierLevel -eq 0).Count }
    [pscustomobject]@{ Item = 'Achados';                     Valor = $findings.Count }
    [pscustomobject]@{ Item = '  Críticos';                  Valor = $sev.critical }
    [pscustomobject]@{ Item = '  Altos';                     Valor = $sev.high }
    [pscustomobject]@{ Item = 'Conflitos de SoD';            Valor = $sod.Count }
)

if (-not (Test-Path $OutputFolder)) { New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$safe = ($TenantId -replace '[^\w\-]', '_')
$xlsx = Join-Path $OutputFolder "IAMScope-Assessment-$safe-$stamp.xlsx"
$html = Join-Path $OutputFolder "IAMScope-Dashboard-$safe-$stamp.html"
$csv  = Join-Path $OutputFolder "IAMScope-Findings-$safe-$stamp.csv"

Write-Step 'Gerando relatórios'

# CSV sempre — é o fallback que não depende de módulo extra
if ($findings.Count) {
    $findings | Select-Object Id, Severidade, Titulo, Quantidade, Detalhe, Recomendacao |
        Export-Csv -Path $csv -NoTypeInformation -Encoding UTF8
} else {
    [pscustomobject]@{ Resultado = 'Nenhum achado.' } | Export-Csv -Path $csv -NoTypeInformation -Encoding UTF8
}
Write-Ok "CSV  : $csv"

if (Export-ExcelReport -Path $xlsx -Resumo $resumo -Findings $findings -SoD $sod `
        -Assignments $assign -Identidades $identidades -Catalog $catalog -Score $score) {
    Write-Ok "Excel: $xlsx"
}

Export-HtmlDashboard -Path $html -Tenant $tenantLabel -Resumo $resumo -Findings $findings `
    -SoD $sod -Assignments $assign -Identidades $identidades -Score $score -Catalog $catalog
Write-Ok "HTML : $html"

Write-Host ''
Write-Host "  Score: $($score.Score)/100 — risco $($score.Nivel)" -ForegroundColor White
Write-Host "  $($findings.Count) achado(s), $($sod.Count) conflito(s) de SoD, $($identidades.Count) identidades" -ForegroundColor White
Write-Host "  Cobertura: Entra ID $totalEntra vínculo(s) · Azure RBAC $totalAzure vínculo(s)" -ForegroundColor White

# Se o Azure ficou de fora, o último aviso da tela precisa ser esse — o score
# de um assessment que só olhou metade do ambiente não deve ser lido como final.
if ($totalAzure -eq 0 -and $Scope -ne 'EntraId') {
    Write-Host ''
    Write-Warn2 "Azure RBAC sem dados: $azureStatus"
    Write-Warn2 'O score reflete apenas o Entra ID.'
}
Write-Host ''

if ($IsWindows) {
    $abrir = Read-Host '  Abrir o dashboard agora? (s/N)'
    if ($abrir -match '^[sSyY]') { Start-Process $html }
}
