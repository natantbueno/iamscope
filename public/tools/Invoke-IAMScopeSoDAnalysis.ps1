<#
.SYNOPSIS
    Analisa segregação de funções (SoD) num tenant Microsoft Entra ID + Azure RBAC,
    usando o catálogo de 96 regras do IAM Scope.

.DESCRIPTION
    O script NÃO altera nada. Só lê atribuições de roles e cruza com as regras.

    O que ele considera como "a pessoa tem a role":
      - atribuição ATIVA direta no Entra ID;
      - atribuição ELEGÍVEL via PIM (quem é elegível a Global Administrator e tem
        Security Reader ativo já é um conflito de SoD — a ativação é self-service);
      - atribuição herdada de GRUPO (incluindo grupos aninhados);
      - atribuição ATIVA e ELEGÍVEL de Azure RBAC, em todas as assinaturas visíveis.

    Saídas geradas na pasta de output:
      - SoD-Analysis-<tenant>-<data>.xlsx   planilha com achados + catálogo de regras
      - SoD-Dashboard-<tenant>-<data>.html  dashboard executivo, autocontido
      - SoD-Findings-<tenant>-<data>.csv    fallback, sempre gerado

.PARAMETER RulesPath
    Caminho para o sod-rules.json. Se omitido, baixa de RulesUrl.

.PARAMETER RulesUrl
    URL do catálogo de regras publicado pelo IAM Scope.

.PARAMETER OutputFolder
    Onde gravar os relatórios. Padrão: .\IAMScope-SoD

.PARAMETER Scope
    EntraId | AzureRbac | Both (padrão)

.PARAMETER ExcludePim
    Ignora atribuições elegíveis (PIM). Subestima o risco — use só se o tenant não usa PIM.

.PARAMETER ExcludeGroups
    Não resolve membros de grupos. Bem mais rápido, mas perde a forma como a maioria
    dos tenants grandes concede acesso.

.PARAMETER TenantId
    Força um tenant específico no login.

.EXAMPLE
    .\Invoke-IAMScopeSoDAnalysis.ps1

.EXAMPLE
    .\Invoke-IAMScopeSoDAnalysis.ps1 -Scope EntraId -RulesPath .\sod-rules.json

.NOTES
    Permissões (somente leitura, consentimento delegado):
      Directory.Read.All, RoleManagement.Read.Directory
    Para Azure RBAC: qualquer papel de leitura nas assinaturas (ex.: Reader).

    Requer: PowerShell 7+, módulos Microsoft.Graph.Authentication,
    Microsoft.Graph.Identity.Governance. Az.Accounts/Az.Resources para Azure RBAC.
    ImportExcel é opcional — sem ele, o Excel é substituído por CSV.

    IAM Scope — https://github.com/  (ver página do SoD Analyzer)
#>

[CmdletBinding()]
param(
    [string]$RulesPath,
    # Vazio de propósito: o caminho normal é o sod-rules.json baixado junto com
    # este arquivo. Só preencha se você hospeda o catálogo em algum lugar.
    [string]$RulesUrl = '',
    [string]$OutputFolder = (Join-Path (Get-Location) 'IAMScope-SoD'),
    [ValidateSet('EntraId', 'AzureRbac', 'Both')]
    [string]$Scope = 'Both',
    [switch]$ExcludePim,
    [switch]$ExcludeGroups,
    [string]$TenantId
)

$ErrorActionPreference = 'Stop'

# Set-StrictMode NÃO é usado de propósito. Com -Version Latest, tocar numa
# propriedade que o Graph ou o Az não devolveram naquele tenant derruba a
# execução inteira — e vários campos aqui são legitimamente opcionais
# (SignInName de service principal, PrincipalDisplayName em versões antigas do
# Az, elegibilidades PIM sem licença P2). Num script que roda em ambiente de
# terceiro e não pode ser depurado por nós, abortar por campo ausente é pior
# que seguir com o campo vazio. Onde a ausência importa, há verificação
# explícita.

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────────────

function Write-Step { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "    $Message" -ForegroundColor DarkGray }
function Write-Warn { param([string]$Message) Write-Host "    ! $Message" -ForegroundColor Yellow }

function Test-ModuleAvailable {
    param([string]$Name)
    return $null -ne (Get-Module -ListAvailable -Name $Name | Select-Object -First 1)
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Catálogo de regras
# ─────────────────────────────────────────────────────────────────────────────

function Get-SoDRules {
    # 1. caminho explícito
    if ($RulesPath) {
        if (-not (Test-Path $RulesPath)) { throw "Arquivo de regras não encontrado: $RulesPath" }
        Write-Ok "Lendo regras de $RulesPath"
        return Get-Content $RulesPath -Raw -Encoding UTF8 | ConvertFrom-Json
    }

    # 2. ao lado do script — é assim que a maioria vai rodar, já que a página do
    #    IAM Scope oferece os dois arquivos para download juntos
    $sibling = Join-Path $PSScriptRoot 'sod-rules.json'
    if (Test-Path $sibling) {
        Write-Ok "Lendo regras de $sibling"
        return Get-Content $sibling -Raw -Encoding UTF8 | ConvertFrom-Json
    }

    # 3. na pasta atual
    $cwd = Join-Path (Get-Location) 'sod-rules.json'
    if (Test-Path $cwd) {
        Write-Ok "Lendo regras de $cwd"
        return Get-Content $cwd -Raw -Encoding UTF8 | ConvertFrom-Json
    }

    # 4. URL, se informada
    if ($RulesUrl) {
        Write-Ok "Baixando regras de $RulesUrl"
        try { return Invoke-RestMethod -Uri $RulesUrl -Method Get -ErrorAction Stop }
        catch { throw "Não consegui baixar o catálogo ($($_.Exception.Message))." }
    }

    throw ("Catálogo de regras não encontrado.`n" +
           "  Baixe o sod-rules.json na página do SoD Analyzer e deixe-o na mesma pasta`n" +
           "  deste script, ou informe -RulesPath C:\caminho\sod-rules.json")
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Coleta — Entra ID
# ─────────────────────────────────────────────────────────────────────────────

# Cache de expansão de grupos: um mesmo grupo costuma carregar várias roles.
$script:GroupMemberCache = @{}

function Expand-GroupMember {
    param([string]$GroupId)

    if ($script:GroupMemberCache.ContainsKey($GroupId)) { return $script:GroupMemberCache[$GroupId] }

    $members = @()
    try {
        # transitiveMembers já resolve grupos aninhados — não precisamos recursar
        $raw = Get-MgGroupTransitiveMember -GroupId $GroupId -All -ErrorAction Stop
        foreach ($m in $raw) {
            $t = $m.AdditionalProperties['@odata.type']
            if ($t -eq '#microsoft.graph.user' -or $t -eq '#microsoft.graph.servicePrincipal') {
                $members += [pscustomobject]@{
                    Id          = $m.Id
                    DisplayName = [string]$m.AdditionalProperties['displayName']
                    UPN         = [string]$m.AdditionalProperties['userPrincipalName']
                    Type        = if ($t -eq '#microsoft.graph.user') { 'User' } else { 'ServicePrincipal' }
                }
            }
        }
    } catch {
        Write-Warn "Não consegui expandir o grupo $GroupId : $($_.Exception.Message)"
    }

    $script:GroupMemberCache[$GroupId] = $members
    return $members
}

function Get-EntraAssignment {
    Write-Step 'Coletando atribuições do Entra ID'

    $assignments = [System.Collections.Generic.List[object]]::new()

    # Mapa de roleDefinitionId -> nome, para exibir nomes mesmo em roles fora do catálogo
    $roleDefs = @{}
    foreach ($rd in Get-MgRoleManagementDirectoryRoleDefinition -All) {
        $roleDefs[$rd.Id] = $rd.DisplayName
    }
    Write-Ok "$($roleDefs.Count) role definitions no tenant"

    # Principais (usuário, grupo ou SP) que aparecem nas atribuições
    $principalCache = @{}
    function Resolve-Principal {
        param([string]$Id)
        if ($principalCache.ContainsKey($Id)) { return $principalCache[$Id] }
        $obj = $null
        try {
            $r = Invoke-MgGraphRequest -Method GET -Uri "/v1.0/directoryObjects/$Id" -ErrorAction Stop
            $type = ($r['@odata.type'] -replace '#microsoft.graph.', '')
            $obj = [pscustomobject]@{
                Id          = $Id
                DisplayName = [string]$r['displayName']
                UPN         = [string]$r['userPrincipalName']
                Type        = switch ($type) {
                    'user' { 'User' } 'group' { 'Group' }
                    'servicePrincipal' { 'ServicePrincipal' } default { $type }
                }
            }
        } catch {
            $obj = [pscustomobject]@{ Id = $Id; DisplayName = '(objeto não encontrado)'; UPN = ''; Type = 'Unknown' }
        }
        $principalCache[$Id] = $obj
        return $obj
    }

    function Add-Assignment {
        param($Principal, [string]$RoleId, [string]$RoleName, [string]$Via, [string]$AssignmentScope, [string]$ViaGroup)
        $assignments.Add([pscustomobject]@{
            Cloud          = 'entra-id'
            PrincipalId    = $Principal.Id
            PrincipalName  = $Principal.DisplayName
            PrincipalUPN   = $Principal.UPN
            PrincipalType  = $Principal.Type
            RoleId         = $RoleId
            RoleName       = $RoleName
            Via            = $Via
            ViaGroup       = $ViaGroup
            AssignmentScope= $AssignmentScope
        })
    }

    # ── Atribuições ativas ──
    $active = Get-MgRoleManagementDirectoryRoleAssignment -All
    Write-Ok "$($active.Count) atribuições ativas"
    foreach ($a in $active) {
        $p = Resolve-Principal $a.PrincipalId
        $roleName = if ($roleDefs.ContainsKey($a.RoleDefinitionId)) { $roleDefs[$a.RoleDefinitionId] } else { $a.RoleDefinitionId }

        if ($p.Type -eq 'Group' -and -not $ExcludeGroups) {
            foreach ($m in (Expand-GroupMember -GroupId $p.Id)) {
                Add-Assignment -Principal $m -RoleId $a.RoleDefinitionId -RoleName $roleName `
                    -Via 'Ativa (via grupo)' -AssignmentScope $a.DirectoryScopeId -ViaGroup $p.DisplayName
            }
        } else {
            Add-Assignment -Principal $p -RoleId $a.RoleDefinitionId -RoleName $roleName `
                -Via 'Ativa' -AssignmentScope $a.DirectoryScopeId -ViaGroup ''
        }
    }

    # ── Elegíveis (PIM) ──
    if (-not $ExcludePim) {
        try {
            $eligible = Get-MgRoleManagementDirectoryRoleEligibilitySchedule -All -ErrorAction Stop
            Write-Ok "$($eligible.Count) atribuições elegíveis (PIM)"
            foreach ($e in $eligible) {
                $p = Resolve-Principal $e.PrincipalId
                $roleName = if ($roleDefs.ContainsKey($e.RoleDefinitionId)) { $roleDefs[$e.RoleDefinitionId] } else { $e.RoleDefinitionId }

                if ($p.Type -eq 'Group' -and -not $ExcludeGroups) {
                    foreach ($m in (Expand-GroupMember -GroupId $p.Id)) {
                        Add-Assignment -Principal $m -RoleId $e.RoleDefinitionId -RoleName $roleName `
                            -Via 'Elegível PIM (via grupo)' -AssignmentScope $e.DirectoryScopeId -ViaGroup $p.DisplayName
                    }
                } else {
                    Add-Assignment -Principal $p -RoleId $e.RoleDefinitionId -RoleName $roleName `
                        -Via 'Elegível PIM' -AssignmentScope $e.DirectoryScopeId -ViaGroup ''
                }
            }
        } catch {
            Write-Warn "Não consegui ler elegibilidades PIM ($($_.Exception.Message)). O tenant pode não ter Entra ID P2."
        }
    }

    Write-Ok "$($assignments.Count) vínculos principal->role no Entra ID"
    return $assignments
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Coleta — Azure RBAC
# ─────────────────────────────────────────────────────────────────────────────

function Get-AzureRbacAssignment {
    Write-Step 'Coletando atribuições de Azure RBAC'

    $assignments = [System.Collections.Generic.List[object]]::new()
    $subs = @(Get-AzSubscription -ErrorAction Stop | Where-Object { $_.State -eq 'Enabled' })
    Write-Ok "$($subs.Count) assinatura(s) habilitada(s)"

    foreach ($sub in $subs) {
        try {
            $null = Set-AzContext -SubscriptionId $sub.Id -ErrorAction Stop
        } catch {
            Write-Warn "Sem acesso à assinatura $($sub.Name): $($_.Exception.Message)"
            continue
        }

        try {
            $ras = @(Get-AzRoleAssignment -ErrorAction Stop)
        } catch {
            Write-Warn "Não consegui listar role assignments em $($sub.Name): $($_.Exception.Message)"
            continue
        }

        foreach ($ra in $ras) {
            # RoleDefinitionId vem como GUID puro no Az; normalizamos para minúsculas
            $defId = ($ra.RoleDefinitionId -split '/')[-1]
            $type = if ($ra.ObjectType) { $ra.ObjectType } else { 'Unknown' }

            if ($type -eq 'Group' -and -not $ExcludeGroups) {
                foreach ($m in (Expand-GroupMember -GroupId $ra.ObjectId)) {
                    $assignments.Add([pscustomobject]@{
                        Cloud = 'azure-rbac'; PrincipalId = $m.Id; PrincipalName = $m.DisplayName
                        PrincipalUPN = $m.UPN; PrincipalType = $m.Type
                        RoleId = $defId; RoleName = $ra.RoleDefinitionName
                        Via = 'Ativa (via grupo)'; ViaGroup = $ra.DisplayName
                        AssignmentScope = "$($sub.Name) :: $($ra.Scope)"
                    })
                }
            } else {
                $assignments.Add([pscustomobject]@{
                    Cloud = 'azure-rbac'; PrincipalId = $ra.ObjectId; PrincipalName = $ra.DisplayName
                    PrincipalUPN = $ra.SignInName; PrincipalType = $type
                    RoleId = $defId; RoleName = $ra.RoleDefinitionName
                    Via = 'Ativa'; ViaGroup = ''
                    AssignmentScope = "$($sub.Name) :: $($ra.Scope)"
                })
            }
        }

        # PIM para Azure RBAC
        if (-not $ExcludePim) {
            try {
                $elig = @(Get-AzRoleEligibilityScheduleInstance -Scope "/subscriptions/$($sub.Id)" -ErrorAction Stop)
                foreach ($e in $elig) {
                    $defId = ($e.RoleDefinitionId -split '/')[-1]
                    $assignments.Add([pscustomobject]@{
                        Cloud = 'azure-rbac'; PrincipalId = $e.PrincipalId; PrincipalName = $e.PrincipalDisplayName
                        PrincipalUPN = ''; PrincipalType = $e.PrincipalType
                        RoleId = $defId; RoleName = $e.RoleDefinitionDisplayName
                        Via = 'Elegível PIM'; ViaGroup = ''
                        AssignmentScope = "$($sub.Name) :: $($e.ScopeDisplayName)"
                    })
                }
                if ($elig.Count) { Write-Ok "$($elig.Count) elegibilidades PIM em $($sub.Name)" }
            } catch {
                # PIM para Azure RBAC exige P2; silencioso por assinatura
            }
        }
    }

    Write-Ok "$($assignments.Count) vínculos principal->role no Azure RBAC"
    return $assignments
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Avaliação das regras
# ─────────────────────────────────────────────────────────────────────────────

function Invoke-SoDEvaluation {
    param($Rules, $Assignments)

    Write-Step 'Avaliando as regras de SoD'

    # índice: principalId -> { "cloud|roleId" -> [atribuições] }
    $byPrincipal = @{}
    foreach ($a in $Assignments) {
        if (-not $byPrincipal.ContainsKey($a.PrincipalId)) { $byPrincipal[$a.PrincipalId] = @{} }
        $key = "$($a.Cloud)|$($a.RoleId.ToLower())"
        if (-not $byPrincipal[$a.PrincipalId].ContainsKey($key)) {
            $byPrincipal[$a.PrincipalId][$key] = [System.Collections.Generic.List[object]]::new()
        }
        $byPrincipal[$a.PrincipalId][$key].Add($a)
    }

    function Get-RoleKey {
        param($RoleRef)
        if ($RoleRef.cloud -eq 'entra-id') { return "entra-id|$($RoleRef.templateId.ToLower())" }
        return "azure-rbac|$($RoleRef.roleDefinitionId.ToLower())"
    }

    $findings = [System.Collections.Generic.List[object]]::new()

    foreach ($rule in $Rules.rules) {
        $keyA = Get-RoleKey $rule.roleA
        $keyB = Get-RoleKey $rule.roleB

        foreach ($principalId in $byPrincipal.Keys) {
            $held = $byPrincipal[$principalId]
            if (-not ($held.ContainsKey($keyA) -and $held.ContainsKey($keyB))) { continue }

            $hitsA = $held[$keyA]
            $hitsB = $held[$keyB]
            $sample = $hitsA[0]

            $findings.Add([pscustomobject]@{
                RuleId          = $rule.id
                RuleName        = $rule.name
                Severity        = $rule.severity
                Category        = $rule.categoryLabel
                Frameworks      = ($rule.frameworks -join ', ')
                PrincipalName   = $sample.PrincipalName
                PrincipalUPN    = $sample.PrincipalUPN
                PrincipalType   = $sample.PrincipalType
                PrincipalId     = $principalId
                RoleA           = $rule.roleA.name
                RoleACloud      = $rule.roleA.cloud
                RoleAVia        = (($hitsA | Select-Object -ExpandProperty Via -Unique) -join ' / ')
                RoleAScope      = (($hitsA | Select-Object -ExpandProperty AssignmentScope -Unique) -join ' | ')
                RoleAViaGroup   = (($hitsA | Where-Object { $_.ViaGroup } | Select-Object -ExpandProperty ViaGroup -Unique) -join ', ')
                RoleB           = $rule.roleB.name
                RoleBCloud      = $rule.roleB.cloud
                RoleBVia        = (($hitsB | Select-Object -ExpandProperty Via -Unique) -join ' / ')
                RoleBScope      = (($hitsB | Select-Object -ExpandProperty AssignmentScope -Unique) -join ' | ')
                RoleBViaGroup   = (($hitsB | Where-Object { $_.ViaGroup } | Select-Object -ExpandProperty ViaGroup -Unique) -join ', ')
                Risco           = $rule.risk
                Justificativa   = $rule.rationale
                Mitigacao       = ($rule.mitigation -join ' | ')
                Referencias     = ($rule.references -join ' | ')
            })
        }
    }

    $sevOrder = @{ critical = 0; high = 1; medium = 2; low = 3 }
    $sorted = $findings | Sort-Object @{ Expression = { $sevOrder[$_.Severity] } }, RuleName, PrincipalName

    Write-Ok "$($findings.Count) achado(s) de SoD"
    return , @($sorted)
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Relatórios
# ─────────────────────────────────────────────────────────────────────────────

function Export-ExcelReport {
    param($Findings, $Rules, $Assignments, [string]$Path, $Summary)

    if (-not (Test-ModuleAvailable 'ImportExcel')) {
        Write-Warn 'Módulo ImportExcel não encontrado — o .xlsx não será gerado.'
        Write-Warn 'Para habilitar:  Install-Module ImportExcel -Scope CurrentUser'
        return $false
    }

    Import-Module ImportExcel -ErrorAction Stop
    if (Test-Path $Path) { Remove-Item $Path -Force }

    # Resumo
    $Summary | Export-Excel -Path $Path -WorksheetName 'Resumo' -AutoSize -BoldTopRow -FreezeTopRow

    # Achados
    if ($Findings.Count) {
        $Findings | Export-Excel -Path $Path -WorksheetName 'Achados' -AutoSize -BoldTopRow `
            -FreezeTopRow -AutoFilter -ConditionalText @(
                New-ConditionalText -Text 'critical' -BackgroundColor '#FFC7CE' -ConditionalTextColor '#9C0006'
                New-ConditionalText -Text 'high'     -BackgroundColor '#FFEB9C' -ConditionalTextColor '#9C6500'
            )
    } else {
        [pscustomobject]@{ Resultado = 'Nenhum conflito de SoD encontrado com as regras aplicadas.' } |
            Export-Excel -Path $Path -WorksheetName 'Achados' -AutoSize -BoldTopRow
    }

    # Catálogo oficial de regras — o mesmo que o site publica
    $Rules.rules | ForEach-Object {
        [pscustomobject]@{
            Id            = $_.id
            Regra         = $_.name
            Severidade    = $_.severity
            Categoria     = $_.categoryLabel
            Cloud         = $_.cloud
            RoleA         = $_.roleA.name
            RoleACloud    = $_.roleA.cloud
            RoleB         = $_.roleB.name
            RoleBCloud    = $_.roleB.cloud
            Descricao     = $_.description
            Justificativa = $_.rationale
            Risco         = $_.risk
            Mitigacao     = ($_.mitigation -join ' | ')
            Frameworks    = ($_.frameworks -join ', ')
            Referencias   = ($_.references -join ' | ')
        }
    } | Export-Excel -Path $Path -WorksheetName 'Catalogo de Regras' -AutoSize -BoldTopRow -FreezeTopRow -AutoFilter

    # Inventário bruto, para auditoria do próprio relatório
    $Assignments | Select-Object Cloud, PrincipalName, PrincipalUPN, PrincipalType, RoleName, Via, ViaGroup, AssignmentScope |
        Export-Excel -Path $Path -WorksheetName 'Atribuicoes' -AutoSize -BoldTopRow -FreezeTopRow -AutoFilter

    return $true
}

function Export-HtmlDashboard {
    param($Findings, $Rules, [string]$Path, $Summary, [string]$TenantLabel)

    $sevCounts = @{ critical = 0; high = 0; medium = 0; low = 0 }
    foreach ($f in $Findings) { $sevCounts[$f.Severity]++ }

    $byCategory = @{}
    foreach ($f in $Findings) {
        if (-not $byCategory.ContainsKey($f.Category)) { $byCategory[$f.Category] = 0 }
        $byCategory[$f.Category]++
    }

    $byPrincipal = @{}
    foreach ($f in $Findings) {
        $k = if ($f.PrincipalUPN) { $f.PrincipalUPN } else { $f.PrincipalName }
        if (-not $byPrincipal.ContainsKey($k)) { $byPrincipal[$k] = 0 }
        $byPrincipal[$k]++
    }

    $payload = [pscustomobject]@{
        tenant       = $TenantLabel
        generatedAt  = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        ruleCount    = $Rules.ruleCount
        findingCount = $Findings.Count
        severity     = $sevCounts
        byCategory   = $byCategory
        topPrincipals= ($byPrincipal.GetEnumerator() | Sort-Object Value -Descending |
                        Select-Object -First 15 | ForEach-Object { @{ name = $_.Key; count = $_.Value } })
        findings     = @($Findings | ForEach-Object {
            @{
                ruleId = $_.RuleId; rule = $_.RuleName; severity = $_.Severity; category = $_.Category
                frameworks = $_.Frameworks
                principal = $_.PrincipalName; upn = $_.PrincipalUPN; ptype = $_.PrincipalType
                roleA = $_.RoleA; roleACloud = $_.RoleACloud; roleAVia = $_.RoleAVia; roleAScope = $_.RoleAScope
                roleB = $_.RoleB; roleBCloud = $_.RoleBCloud; roleBVia = $_.RoleBVia; roleBScope = $_.RoleBScope
                risk = $_.Risco; rationale = $_.Justificativa; mitigation = $_.Mitigacao
            }
        })
        summary      = @($Summary | ForEach-Object { @{ item = $_.Item; valor = [string]$_.Valor } })
    }

    $json = $payload | ConvertTo-Json -Depth 8 -Compress
    # </script> dentro de string quebraria o bloco
    $json = $json.Replace('</', '<\/')

    $html = @'
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SoD Analysis — IAM Scope</title>
<style>
:root{--bg:#0b1220;--card:#131c2e;--line:#243049;--txt:#e6edf7;--dim:#93a3bd;
--crit:#f87171;--high:#fb923c;--med:#facc15;--low:#4ade80;--accent:#60a5fa}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
header{padding:24px 32px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
h1{font-size:19px;margin:0;font-weight:600}
.sub{color:var(--dim);font-size:12px}
main{padding:24px 32px;max-width:1500px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.card .n{font-size:26px;font-weight:700;line-height:1.1}
.card .l{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
@media(max-width:980px){.grid{grid-template-columns:1fr}}
.panel{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
.panel h2{font-size:13px;margin:0 0 14px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:.06em}
.bar{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:12px}
.bar .lbl{width:190px;color:var(--dim);text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .track{flex:1;background:#0a1020;border-radius:4px;height:16px;overflow:hidden}
.bar .fill{height:100%;border-radius:4px}
.bar .val{width:36px;font-variant-numeric:tabular-nums;font-weight:600}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
input,select{background:#0a1020;border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:7px 10px;font-size:12px}
input{min-width:280px}
button.chip{background:transparent;border:1px solid var(--line);color:var(--dim);border-radius:999px;padding:4px 12px;font-size:11px;cursor:pointer}
button.chip.on{color:#fff;border-color:transparent}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:.06em;
padding:8px 10px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--card);cursor:pointer;user-select:none}
td{padding:9px 10px;border-bottom:1px solid #1b2540;vertical-align:top}
tr.row:hover{background:#18233a}
.sev{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase}
.det{background:#0d1526;font-size:12px;color:var(--dim)}
.det b{color:var(--txt);display:block;margin:8px 0 2px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.tag{display:inline-block;background:#1b2540;border-radius:4px;padding:1px 6px;margin-right:4px;font-size:10px;color:var(--dim)}
.empty{padding:40px;text-align:center;color:var(--dim)}
.tblwrap{max-height:640px;overflow:auto;border:1px solid var(--line);border-radius:10px}
footer{padding:20px 32px;color:var(--dim);font-size:11px;border-top:1px solid var(--line);margin-top:24px}
</style></head><body>
<header>
  <h1>Análise de Segregação de Funções</h1>
  <span class="sub" id="hdr"></span>
</header>
<main>
  <div class="cards" id="cards"></div>
  <div class="grid">
    <div class="panel"><h2>Achados por categoria</h2><div id="chartCat"></div></div>
    <div class="panel"><h2>Identidades com mais conflitos</h2><div id="chartPri"></div></div>
  </div>
  <div class="panel">
    <h2>Achados</h2>
    <div class="controls">
      <input id="q" placeholder="Filtrar por identidade, regra, role...">
      <span id="chips"></span>
      <span class="sub" id="count" style="margin-left:auto"></span>
    </div>
    <div class="tblwrap">
      <table id="tbl">
        <thead><tr>
          <th data-k="severity">Severidade</th><th data-k="rule">Regra</th>
          <th data-k="principal">Identidade</th><th data-k="roleA">Role A</th>
          <th data-k="roleB">Role B</th><th data-k="category">Categoria</th>
        </tr></thead>
        <tbody id="tb"></tbody>
      </table>
    </div>
  </div>
</main>
<footer>
  Gerado por <strong>IAM Scope — SoD Analyzer</strong>. As regras são o catálogo publicado pelo site;
  a classificação de severidade é editorial do IAM Scope, não do provedor.
  O script é somente leitura e não altera nada no tenant.
</footer>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const SEV = {critical:'#f87171',high:'#fb923c',medium:'#facc15',low:'#4ade80'};
const SEVLBL = {critical:'Crítico',high:'Alto',medium:'Médio',low:'Baixo'};

document.getElementById('hdr').textContent =
  D.tenant + ' · ' + D.generatedAt + ' · ' + D.ruleCount + ' regras avaliadas';

const cards = [
  ['Achados', D.findingCount, '#e6edf7'],
  ['Crítico', D.severity.critical, SEV.critical],
  ['Alto', D.severity.high, SEV.high],
  ['Médio', D.severity.medium, SEV.medium],
  ['Baixo', D.severity.low, SEV.low],
  ['Identidades afetadas', new Set(D.findings.map(f=>f.upn||f.principal)).size, '#60a5fa'],
];
document.getElementById('cards').innerHTML = cards.map(([l,n,c]) =>
  `<div class="card"><div class="n" style="color:${c}">${n}</div><div class="l">${l}</div></div>`).join('');

function barChart(el, entries, color){
  if(!entries.length){ el.innerHTML='<p class="sub">Sem dados.</p>'; return }
  const max = Math.max(...entries.map(e=>e[1]));
  el.innerHTML = entries.map(([k,v]) =>
    `<div class="bar"><span class="lbl" title="${esc(k)}">${esc(k)}</span>
     <span class="track"><span class="fill" style="width:${(v/max*100).toFixed(1)}%;background:${color}"></span></span>
     <span class="val">${v}</span></div>`).join('');
}
function esc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }

barChart(document.getElementById('chartCat'),
  Object.entries(D.byCategory).sort((a,b)=>b[1]-a[1]), '#60a5fa');
barChart(document.getElementById('chartPri'),
  D.topPrincipals.map(p=>[p.name,p.count]), '#a78bfa');

let sevFilter = null, sortKey='severity', sortDir=1;
const ORDER = {critical:0,high:1,medium:2,low:3};

document.getElementById('chips').innerHTML = Object.keys(SEV).map(s =>
  `<button class="chip" data-s="${s}">${SEVLBL[s]}</button>`).join('');
document.querySelectorAll('.chip').forEach(b => b.onclick = () => {
  const s = b.dataset.s;
  sevFilter = sevFilter === s ? null : s;
  document.querySelectorAll('.chip').forEach(x => {
    const on = x.dataset.s === sevFilter;
    x.classList.toggle('on', on);
    x.style.background = on ? SEV[x.dataset.s] : 'transparent';
  });
  render();
});
document.querySelectorAll('th').forEach(th => th.onclick = () => {
  const k = th.dataset.k;
  if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1 }
  render();
});
document.getElementById('q').oninput = render;

function render(){
  const q = document.getElementById('q').value.toLowerCase();
  let rows = D.findings.filter(f => {
    if (sevFilter && f.severity !== sevFilter) return false;
    if (!q) return true;
    return [f.principal,f.upn,f.rule,f.roleA,f.roleB,f.category].join(' ').toLowerCase().includes(q);
  });
  rows.sort((a,b) => {
    const va = sortKey==='severity' ? ORDER[a.severity] : String(a[sortKey]??'');
    const vb = sortKey==='severity' ? ORDER[b.severity] : String(b[sortKey]??'');
    return (va>vb?1:va<vb?-1:0) * sortDir;
  });
  document.getElementById('count').textContent = rows.length + ' de ' + D.findings.length;
  const tb = document.getElementById('tb');
  if(!rows.length){ tb.innerHTML = '<tr><td colspan="6" class="empty">Nenhum achado com esse filtro.</td></tr>'; return }
  tb.innerHTML = rows.map((f,i) => `
    <tr class="row" onclick="tog(${i})">
      <td><span class="sev" style="background:${SEV[f.severity]}22;color:${SEV[f.severity]}">${SEVLBL[f.severity]}</span></td>
      <td>${esc(f.rule)}</td>
      <td>${esc(f.principal)}<br><span class="sub">${esc(f.upn||f.ptype)}</span></td>
      <td>${esc(f.roleA)}<br><span class="tag">${esc(f.roleAVia)}</span></td>
      <td>${esc(f.roleB)}<br><span class="tag">${esc(f.roleBVia)}</span></td>
      <td><span class="sub">${esc(f.category)}</span></td>
    </tr>
    <tr id="d${i}" style="display:none"><td colspan="6" class="det">
      <b>Risco</b>${esc(f.risk)}
      <b>Por que é conflito</b>${esc(f.rationale)}
      <b>Mitigação</b>${esc(f.mitigation)}
      <b>Escopo — ${esc(f.roleA)}</b>${esc(f.roleAScope)}
      <b>Escopo — ${esc(f.roleB)}</b>${esc(f.roleBScope)}
      <b>Frameworks</b>${esc(f.frameworks)}
    </td></tr>`).join('');
}
function tog(i){ const r=document.getElementById('d'+i); r.style.display = r.style.display==='none'?'':'none' }
render();
</script></body></html>
'@

    $html = $html.Replace('__DATA__', $json)
    Set-Content -Path $Path -Value $html -Encoding UTF8
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '  IAM Scope — SoD Analyzer' -ForegroundColor White
Write-Host '  Somente leitura. Nada é alterado no tenant.' -ForegroundColor DarkGray
Write-Host ''

$rules = Get-SoDRules
Write-Ok "$($rules.ruleCount) regras carregadas"

$needEntra = $Scope -in @('EntraId', 'Both')
$needAzure = $Scope -in @('AzureRbac', 'Both')

foreach ($m in @('Microsoft.Graph.Authentication', 'Microsoft.Graph.Identity.Governance')) {
    if (-not (Test-ModuleAvailable $m)) {
        throw "Módulo $m não encontrado.`n  Install-Module $m -Scope CurrentUser"
    }
}

Write-Step 'Autenticando no Microsoft Graph (somente leitura)'
$graphScopes = @('Directory.Read.All', 'RoleManagement.Read.Directory')
$connectArgs = @{ Scopes = $graphScopes; NoWelcome = $true }
if ($TenantId) { $connectArgs['TenantId'] = $TenantId }
Connect-MgGraph @connectArgs

$ctx = Get-MgContext
$tenantLabel = if ($ctx.TenantId) { $ctx.TenantId } else { 'tenant' }
try {
    $org = Get-MgOrganization -ErrorAction Stop | Select-Object -First 1
    if ($org -and $org.DisplayName) { $tenantLabel = $org.DisplayName }
} catch { }
Write-Ok "Conectado como $($ctx.Account) em $tenantLabel"

$assignments = [System.Collections.Generic.List[object]]::new()

if ($needEntra) { foreach ($a in (Get-EntraAssignment)) { $assignments.Add($a) } }

if ($needAzure) {
    if (-not (Test-ModuleAvailable 'Az.Resources')) {
        Write-Warn 'Módulo Az.Resources não encontrado — Azure RBAC será pulado.'
        Write-Warn 'Para habilitar:  Install-Module Az.Resources -Scope CurrentUser'
    } else {
        Import-Module Az.Accounts -ErrorAction SilentlyContinue
        Import-Module Az.Resources -ErrorAction SilentlyContinue
        if (-not (Get-AzContext)) {
            Write-Step 'Autenticando no Azure'
            if ($TenantId) { Connect-AzAccount -Tenant $TenantId | Out-Null } else { Connect-AzAccount | Out-Null }
        }
        foreach ($a in (Get-AzureRbacAssignment)) { $assignments.Add($a) }
    }
}

if (-not $assignments.Count) { throw 'Nenhuma atribuição coletada — nada a analisar.' }

$findings = Invoke-SoDEvaluation -Rules $rules -Assignments $assignments

# Resumo
$sevCount = @{ critical = 0; high = 0; medium = 0; low = 0 }
foreach ($f in $findings) { $sevCount[$f.Severity]++ }
$summary = @(
    [pscustomobject]@{ Item = 'Tenant';                       Valor = $tenantLabel }
    [pscustomobject]@{ Item = 'Data da análise';              Valor = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
    [pscustomobject]@{ Item = 'Executado por';                Valor = $ctx.Account }
    [pscustomobject]@{ Item = 'Escopo';                       Valor = $Scope }
    [pscustomobject]@{ Item = 'Elegíveis PIM considerados';   Valor = (-not $ExcludePim) }
    [pscustomobject]@{ Item = 'Grupos expandidos';            Valor = (-not $ExcludeGroups) }
    [pscustomobject]@{ Item = 'Regras avaliadas';             Valor = $rules.ruleCount }
    [pscustomobject]@{ Item = 'Vínculos principal->role';     Valor = $assignments.Count }
    [pscustomobject]@{ Item = 'Identidades distintas';        Valor = ($assignments | Select-Object -ExpandProperty PrincipalId -Unique).Count }
    [pscustomobject]@{ Item = 'Total de achados';             Valor = $findings.Count }
    [pscustomobject]@{ Item = 'Achados críticos';             Valor = $sevCount.critical }
    [pscustomobject]@{ Item = 'Achados altos';                Valor = $sevCount.high }
    [pscustomobject]@{ Item = 'Achados médios';               Valor = $sevCount.medium }
    [pscustomobject]@{ Item = 'Achados baixos';               Valor = $sevCount.low }
)

if (-not (Test-Path $OutputFolder)) { New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$safeTenant = ($tenantLabel -replace '[^\w\-]', '_')
$xlsx = Join-Path $OutputFolder "SoD-Analysis-$safeTenant-$stamp.xlsx"
$htmlPath = Join-Path $OutputFolder "SoD-Dashboard-$safeTenant-$stamp.html"
$csv = Join-Path $OutputFolder "SoD-Findings-$safeTenant-$stamp.csv"

Write-Step 'Gerando relatórios'

# CSV sempre — é o fallback que nunca depende de módulo extra
if ($findings.Count) {
    $findings | Export-Csv -Path $csv -NoTypeInformation -Encoding UTF8
} else {
    [pscustomobject]@{ Resultado = 'Nenhum conflito de SoD encontrado.' } |
        Export-Csv -Path $csv -NoTypeInformation -Encoding UTF8
}
Write-Ok "CSV : $csv"

if (Export-ExcelReport -Findings $findings -Rules $rules -Assignments $assignments -Path $xlsx -Summary $summary) {
    Write-Ok "Excel: $xlsx"
}

Export-HtmlDashboard -Findings $findings -Rules $rules -Path $htmlPath -Summary $summary -TenantLabel $tenantLabel
Write-Ok "HTML : $htmlPath"

Write-Host ''
Write-Host "  $($findings.Count) achado(s) — $($sevCount.critical) crítico(s), $($sevCount.high) alto(s), $($sevCount.medium) médio(s), $($sevCount.low) baixo(s)" -ForegroundColor White
Write-Host ''

if ($findings.Count -and $IsWindows) {
    $open = Read-Host '  Abrir o dashboard agora? (s/N)'
    if ($open -match '^[sSyY]') { Start-Process $htmlPath }
}
