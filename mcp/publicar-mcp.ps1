# publicar-mcp.ps1 - publica o iamscope-mcp no npm, da sua maquina.
#
# POR QUE E SCRIPT E NAO EXECUCAO
#   O publish precisa da sua credencial do npm, que esta no seu Windows. O
#   ambiente da sessao nao tem ela e nem deve ter. Entao o que se entrega e o
#   roteiro executavel, com o pre-voo que impede o erro caro.
#
# ESCRITO PARA WINDOWS POWERSHELL 5.1 (powershell.exe).
#   Sem Format-Table, resultado de pipeline sempre em @(), e um trap no topo que
#   diz a LINHA do erro - sem ele o 5.1 reporta so a posicao da invocacao.
#
# A ARMADILHA QUE ESTE ARQUIVO JA PISOU, PARA NAO PISAR DE NOVO
#   A primeira versao tinha `$ErrorActionPreference = 'Stop'` no escopo do
#   script. Com isso, QUALQUER coisa que um comando nativo escreva em stderr
#   vira erro terminante - e o npm escreve em stderr o tempo todo, inclusive um
#   `npm error code ENEEDAUTH` perfeitamente esperado de quem ainda nao fez
#   login. O trap abortava o pre-voo na primeira checagem, que e o oposto do que
#   um pre-voo serve: ele existe para COLETAR todos os problemas de uma vez.
#
#   Pior: o npm moderno instala um `npm.ps1`, e o PowerShell prefere o .ps1 ao
#   .cmd. O erro entao aparecia como "ERRO na linha 1" - linha 1 do npm.ps1, nao
#   deste arquivo. Uma mensagem que aponta para o lugar errado e faz procurar o
#   defeito onde ele nao esta.
#
#   A regra que ficou: comando externo NUNCA e invocado com 'Stop' em vigor.
#   Toda chamada passa por Invoke-Externo, que baixa a preferencia, captura
#   stdout e stderr juntos, e devolve o codigo de saida para o script decidir.
#
# USO
#   cd C:\Users\User\Documents\IAMSCOPE\REPO\mcp
#   powershell -ExecutionPolicy Bypass -File .\publicar-mcp.ps1          # pre-voo
#   powershell -ExecutionPolicy Bypass -File .\publicar-mcp.ps1 -Publicar # publica

param(
  [switch]$Publicar,
  [string]$Tag = 'latest',
  # Codigo do seu autenticador. A conta do Natan exige 2FA no publish: sem isto
  # o registry devolve E403 depois de ja ter rodado build e smoke.
  [string]$Otp
)

trap {
  Write-Host ''
  Write-Host "ERRO na linha $($_.InvocationInfo.ScriptLineNumber):" -ForegroundColor Red
  Write-Host "  $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkGray
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ''
  exit 1
}

# 'Continue', nao 'Stop'. Ver o bloco de armadilha no topo.
$ErrorActionPreference = 'Continue'

# O console do Windows abre em code page 850/1252 e o node escreve UTF-8, entao
# as palavras com acento do build e os vistos do smoke saem estropiados - cada
# byte do par UTF-8 vira um caractere separado. Nao quebra nada, mas a saida que
# se le para decidir se publica precisa ser legivel.
#
# (O exemplo do estrago NAO vai escrito aqui de proposito: colar mojibake num
# comentario poe bytes nao-ASCII no arquivo, que e justamente o que o BOM existe
# para proteger. Este script e ASCII puro - conferido antes da entrega.)
#
# UTF8Encoding com $false: a instancia estatica [Text.Encoding]::UTF8 carrega
# preambulo de BOM, e em $OutputEncoding isso pode prefixar um BOM no que o
# PowerShell manda para um comando nativo por pipe. Aqui nada e enviado por
# pipe, mas a forma sem BOM e a correta e nao custa nada.
try {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
} catch {
  # Console redirecionado ou host sem suporte. A saida sai com acento estropiado,
  # e so isso - nao e motivo para o script parar.
}
$PKG = 'iamscope-mcp'

function Titulo($t) {
  Write-Host ''
  Write-Host "  $t" -ForegroundColor Cyan
  Write-Host ('  ' + ('-' * 56)) -ForegroundColor DarkGray
}
function Ok($m)    { Write-Host "  [ok]    $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "  [aviso] $m" -ForegroundColor Yellow }
function Erro($m)  { Write-Host "  [erro]  $m" -ForegroundColor Red }

<#
  Invoca comando externo sem deixar stderr virar excecao.

  Devolve um objeto com Code (codigo de saida) e Texto (stdout + stderr juntos,
  ja como string). O 2>&1 mistura os dois de proposito: o npm poe informacao
  util nos dois canais, e separar aqui so daria trabalho para juntar depois.

  -Streaming imprime a saida ao vivo em vez de capturar. Para build e smoke,
  que sao longos e cuja saida e o valor.
#>
function Invoke-Externo {
  param(
    [Parameter(Mandatory = $true)][string]$Comando,
    [string[]]$Argumentos = @(),
    [switch]$Streaming
  )
  $anterior = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($Streaming) {
      # DUAS COISAS AQUI, e as duas custaram uma rodada.
      #
      # 1. Sem `2>&1`. Com o redirecionamento, cada linha de stderr vira um
      #    ErrorRecord e sai impressa como
      #    "System.Management.Automation.RemoteException" no meio da saida do
      #    build. Sem redirecionar, stderr vai direto ao console como texto.
      #
      # 2. Com `| Out-Host`. Sem ele, o stdout do comando cai no fluxo de saida
      #    da FUNCAO e vai embora dentro do valor de retorno em vez de aparecer
      #    na tela: o build parecia mudo, so o stderr do esbuild passava. Pior,
      #    o retorno virava Object[] em vez do objeto de status.
      #
      #    Out-Host manda o stdout para o console e deixa o `return` limpo.
      #    $LASTEXITCODE sobrevive ao pipe - conferido com um comando que sai 3.
      & $Comando @Argumentos | Out-Host
      return [pscustomobject]@{ Code = $LASTEXITCODE; Texto = '' }
    }
    $linhas = @(& $Comando @Argumentos 2>&1 | ForEach-Object { $_.ToString() })
    return [pscustomobject]@{ Code = $LASTEXITCODE; Texto = ($linhas -join "`n") }
  } catch {
    # Comando inexistente cai aqui. 127 e a convencao para "not found".
    return [pscustomobject]@{ Code = 127; Texto = $_.Exception.Message }
  } finally {
    $ErrorActionPreference = $anterior
  }
}

$falhas = 0

Titulo 'Pre-voo'

# 1. Estamos na pasta certa?
if (-not (Test-Path '.\package.json')) {
  Erro 'Nao achei package.json. Rode este script de dentro da pasta mcp/.'
  exit 1
}
$pj = Get-Content '.\package.json' -Raw | ConvertFrom-Json
if ($pj.name -ne $PKG) {
  Erro "package.json diz name='$($pj.name)', esperava '$PKG'."
  Erro 'Voce provavelmente esta na pasta do site, nao na do pacote.'
  exit 1
}
Ok "pasta correta - $($pj.name)@$($pj.version)"

# 2. Node. O pacote declara >=18.17; o bundle e ESM com import dinamico.
$r = Invoke-Externo -Comando 'node' -Argumentos @('--version')
if ($r.Code -ne 0) {
  Erro 'node nao esta no PATH.'
  exit 1
}
$nodeV = $r.Texto.Trim()
$maior = [int](($nodeV -replace '^v', '') -split '\.')[0]
if ($maior -lt 18) { Erro "node $nodeV e antigo demais (precisa >=18.17)."; $falhas++ }
else { Ok "node $nodeV" }

# 3. Dependencias instaladas? Sem elas o build morre no esbuild, nao aqui.
if (-not (Test-Path '.\node_modules\esbuild')) {
  Erro 'node_modules ausente ou sem esbuild. Rode `npm install` antes.'
  Aviso 'Se o npm avisar "install-scripts blocked", rode tambem: npm install-scripts approve'
  $falhas++
} else {
  Ok 'dependencias instaladas'
}

# 4. Autenticado no npm?
#
#    Tres desfechos que dariam o mesmo "nao deu certo" e pedem acoes diferentes:
#    sem login, sem rede, e npm ausente. Distinguir os tres e o trabalho aqui.
$r = Invoke-Externo -Comando 'npm' -Argumentos @('whoami')
if ($r.Code -eq 0 -and $r.Texto.Trim()) {
  Ok "npm whoami - $($r.Texto.Trim())"
} elseif ($r.Texto -match 'ENEEDAUTH|need auth|not logged in') {
  Erro 'Nao autenticado no npm. Rode `npm login` e repita o pre-voo.'
  $falhas++
} elseif ($r.Texto -match 'ENOTFOUND|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|network|proxy') {
  Erro 'Nao consegui falar com o registry do npm. Isso e rede, nao credencial.'
  $falhas++
} else {
  Erro "npm whoami falhou (codigo $($r.Code)):"
  Write-Host "          $($r.Texto -replace "`n", "`n          ")" -ForegroundColor DarkGray
  $falhas++
}

# 4b. Aviso de 2FA, ANTES de gastar um minuto em build e smoke para descobrir no fim.
if ($Publicar -and -not $Otp) {
  Aviso 'Publicando sem -Otp. Se a sua conta exigir 2FA, o registry recusa com E403'
  Aviso 'depois de build e smoke ja terem rodado. Se souber que exige, passe -Otp agora.'
}

# 5. O nome esta livre? Se ja existe, o publish so passa se a versao for nova.
#    404 aqui e a boa noticia; e o que se espera no primeiro publish.
$r = Invoke-Externo -Comando 'npm' -Argumentos @('view', $PKG, 'version')
$publicada = $r.Texto.Trim()

$naoExiste = 'E404|404 Not Found|is not in this registry|npm ERR! 404'

if ($r.Code -eq 0 -and $publicada -and $publicada -notmatch $naoExiste) {
  Aviso "$PKG ja existe no npm, versao publicada: $publicada"
  if ($publicada -eq $pj.version) {
    Erro "A versao $($pj.version) ja esta publicada. Suba antes: npm version patch"
    $falhas++
  } else {
    Ok "versao local $($pj.version) difere da publicada $publicada"
  }
} elseif ($r.Texto -match $naoExiste) {
  Ok "$PKG esta livre no npm - este sera o primeiro publish"
} else {
  Aviso "nao consegui consultar o registry (codigo $($r.Code)). O publish dira se o nome esta tomado."
}

# 6. Build. As contagens sao geradas do dado e o README e conferido contra elas.
Titulo 'Build'
$r = Invoke-Externo -Comando 'npm' -Argumentos @('run', 'build') -Streaming
if ($r.Code -ne 0) { Erro 'build falhou.'; exit 1 }
Ok 'build passou (contagens geradas, README conferido)'

# 7. Smoke. Sobe o servidor por stdio e conversa MCP de verdade.
Titulo 'Smoke'
$r = Invoke-Externo -Comando 'npm' -Argumentos @('run', 'smoke') -Streaming
if ($r.Code -ne 0) { Erro 'smoke falhou - NAO publique.'; exit 1 }
Ok 'smoke passou'

# 8. O que vai no tarball.
Titulo 'Conteudo do pacote'
$r = Invoke-Externo -Comando 'npm' -Argumentos @('pack', '--dry-run') -Streaming
Ok 'confira acima: devem entrar dist/, data/, README.md e DATA-LICENSE.md - e mais nada'

Titulo 'Resultado do pre-voo'
if ($falhas -gt 0) {
  Erro "$falhas problema(s). Resolva antes de publicar."
  exit 1
}
Ok 'tudo verde'

if (-not $Publicar) {
  Write-Host ''
  Write-Host '  Pre-voo apenas. Para publicar de verdade:' -ForegroundColor Yellow
  Write-Host '    powershell -ExecutionPolicy Bypass -File .\publicar-mcp.ps1 -Publicar' -ForegroundColor White
  Write-Host ''
  exit 0
}

Titulo 'Publicando'

# O `prepublishOnly` do package.json roda build e smoke DE NOVO aqui. E de
# proposito: e a ultima barreira antes de algo virar publico e imutavel. O custo
# e cerca de um minuto a cada tentativa.
$argsPublish = @('publish', '--tag', $Tag)
if ($Otp) { $argsPublish += @('--otp', $Otp) }

$r = Invoke-Externo -Comando 'npm' -Argumentos $argsPublish -Streaming

if ($r.Code -ne 0) {
  Erro 'npm publish falhou.'
  if (-not $Otp) {
    Write-Host ''
    Aviso 'Se o erro acima for E403 pedindo two-factor authentication, o publish'
    Aviso 'precisa do codigo do seu autenticador. Duas saidas:'
    Write-Host ''
    Write-Host '  1. Rode de novo com o codigo (ele vale ~30 segundos):' -ForegroundColor Gray
    Write-Host "       powershell -ExecutionPolicy Bypass -File .\publicar-mcp.ps1 -Publicar -Otp 123456" -ForegroundColor White
    Write-Host ''
    Write-Host '  2. Ou crie um granular access token em npmjs.com com permissao de' -ForegroundColor Gray
    Write-Host '     publish e "bypass 2FA" ligado, e configure-o uma vez:' -ForegroundColor Gray
    Write-Host '       npm config set //registry.npmjs.org/:_authToken SEU_TOKEN' -ForegroundColor White
    Write-Host '     Esta e a opcao para automatizar depois; a 1 e a mais rapida agora.' -ForegroundColor DarkGray
    Write-Host ''
    Aviso 'Nada foi publicado. Build e smoke ja passaram - so falta o codigo.'
  }
  exit 1
}
Ok "publicado como $PKG@$($pj.version) (tag: $Tag)"

Titulo 'Depois'
Write-Host '  1. Confira que o npx resolve, numa pasta qualquer:' -ForegroundColor Gray
Write-Host "       npx -y $PKG" -ForegroundColor White
Write-Host '     (deve imprimir "pronto - 7 ferramentas" no stderr e ficar esperando; Ctrl+C sai)' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  2. Marque a linha de base da medicao daqui a uma semana:' -ForegroundColor Gray
Write-Host '       node scripts\metrics.mjs --json >> metrics.jsonl' -ForegroundColor White
Write-Host '     A contagem do npm leva algumas horas para aparecer. Ver MEDICAO.md.' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  3. O canal de GitHub Release continua desligado enquanto o repo for privado.' -ForegroundColor Gray
Write-Host ''
