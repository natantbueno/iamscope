import type { StatsCloudId } from '@/data/stats'

/**
 * Cor de marca por cloud, só para o tier de TOPO (Risk Tier / EAM) — mesma
 * fonte que o ponto de 8px de wayfinding (`CLOUD_MARK` em
 * src/lib/cloudColors.ts), mas com luminosidade recalculada por tema: o hex de
 * marca puro não cobre os dois fundos em que este dado aparece (`bg-surface`
 * na Sidebar, `bg-surface-alt` nas barras do Statistics).
 *
 * Verificado contra os dois fundos, nos dois temas — o pior caso de cada
 * cloud (a barra de contraste mais apertada, entre `bg-surface` e
 * `bg-surface-alt`) ainda fica ≥3.3:1 (WCAG 1.4.11, componente gráfico):
 *
 *   cloud            light-theme          dark-theme
 *   entraId          #0078d4  4.27:1      #007bd9  3.37:1
 *   azureRbac        #5d2d92  8.75:1      #935fcd  3.34:1  (precisa lilás mais claro no escuro — #5c2d91 puro dá 1.57:1)
 *   aws              #c47600  3.32:1      #ff9900  6.86:1  (precisa laranja mais escuro no claro — #ff9900 puro dá 2.01:1)
 *   gcp              #4386f4  3.32:1      #4386f4  4.15:1
 *   googleWorkspace  #309c4d  3.30:1      #34a753  4.77:1
 *   ibmCloud         #069895  3.34:1      #08bcb9  6.25:1
 *
 * Origem e escopo: reversão pontual e aprovada (26/08/2026) da regra
 * monocromática de 06/08/2026 — ver o comentário completo no topo de
 * src/app/stats/StatsClient.tsx sobre por que isto NÃO repete o erro medido
 * naquela data (a mesma cor nunca é compartilhada entre clouds, e nunca
 * aparece sem o nome da cloud e do tier ao lado — regra `color-not-only`).
 */
export const CLOUD_TIER_ACCENT: Record<StatsCloudId, { light: string; dark: string }> = {
  entraId:         { light: '#0078d4', dark: '#007bd9' },
  azureRbac:       { light: '#5d2d92', dark: '#935fcd' },
  aws:             { light: '#c47600', dark: '#ff9900' },
  gcp:             { light: '#4386f4', dark: '#4386f4' },
  googleWorkspace: { light: '#309c4d', dark: '#34a753' },
  ibmCloud:        { light: '#069895', dark: '#08bcb9' },
}

/**
 * A mesma cor de marca, recomputada para servir como TEXTO (≥4.5:1, WCAG AA
 * texto normal) contra `bg-surface` — mais rígido que o ≥3.3:1 de
 * CLOUD_TIER_ACCENT, que só precisa valer para um ponto/barra gráfica.
 * Necessário porque o painel EAM do Dashboard usa a mesma cor no número da
 * contagem (texto real), não só no ponto e na barra.
 *
 *   cloud            light-theme          dark-theme
 *   entraId          #0076d1  4.64:1      #0085eb  4.68:1
 *   azureRbac        #5d2d92  9.31:1      #9c6dd2  4.68:1
 *   aws              #a86500  4.63:1      #ff9900  8.29:1
 *   gcp              #1c6df2  4.66:1      #4386f4  5.02:1
 *   googleWorkspace  #298441  4.67:1      #34a753  5.77:1
 *   ibmCloud         #058280  4.68:1      #08bcb9  7.55:1
 */
export const CLOUD_TIER_ACCENT_TEXT: Record<StatsCloudId, { light: string; dark: string }> = {
  entraId:         { light: '#0076d1', dark: '#0085eb' },
  azureRbac:       { light: '#5d2d92', dark: '#9c6dd2' },
  aws:             { light: '#a86500', dark: '#ff9900' },
  gcp:             { light: '#1c6df2', dark: '#4386f4' },
  googleWorkspace: { light: '#298441', dark: '#34a753' },
  ibmCloud:        { light: '#058280', dark: '#08bcb9' },
}

/**
 * Os cinzas que TIER_META usa para "não é o tier de topo" — ver tierMeta.ts.
 * Sempre o hex CANÔNICO (o campo `color`/`textColor`, nunca `darkText`/
 * `darkBg`): é a identidade do tier, igual nos dois temas, e é ela que decide
 * se o tier é de topo — não a variante de saída que o tema escolhe depois.
 */
const NEUTRAL_TIER_COLORS = new Set(['#6b7280', '#5a6370'])

export function isTopTierColor(canonicalColor: string): boolean {
  return !NEUTRAL_TIER_COLORS.has(canonicalColor)
}

/**
 * Resolve a cor de um tier: tier de topo (identidade fora do cinza padrão)
 * ganha a marca da cloud; todo o resto usa `neutralColor` sem mudança — a
 * variante do próprio tema, para quem tem par claro/escuro (Azure, GWS, EAM).
 * Quem só tem UM valor (GCP/AWS/IBM) passa o mesmo hex nos dois parâmetros.
 *
 * `mode: 'graphic'` (padrão) usa o par verificado a ≥3.3:1 — ponto, barra,
 * qualquer preenchimento sem texto por cima. `mode: 'text'` usa o par
 * recomputado a ≥4.5:1 — obrigatório sempre que a cor pinta caractere real
 * (o número de uma contagem, um rótulo).
 */
export function resolveTierAccent(
  cloudId: StatsCloudId,
  canonicalColor: string,
  neutralColor: string,
  isDark: boolean,
  mode: 'graphic' | 'text' = 'graphic',
): string {
  if (!isTopTierColor(canonicalColor)) return neutralColor
  const table = mode === 'text' ? CLOUD_TIER_ACCENT_TEXT : CLOUD_TIER_ACCENT
  return table[cloudId][isDark ? 'dark' : 'light']
}

/**
 * Estilo da caixa de informação no rodapé de cada dashboard de cloud —
 * borda, fundo e chip de código na cor da marca; texto/ícone no par
 * verificado a texto (CLOUD_TIER_ACCENT_TEXT). A cor de base é
 * CLOUD_TIER_ACCENT (o par gráfico), não o texto: aqui ela só pinta um wash
 * de fundo a 5–10% e uma borda a 30%, nunca caractere — por isso não precisa
 * do par mais rígido.
 *
 * Origem: até 26/08/2026 só o Azure RBAC tinha essa caixa de fato colorida
 * (via o token `brand`, à parte do sistema de cloud); GCP/GWS/IBM usavam
 * `csp-*`, que a Nível 3 (06/08) já tinha neutralizado, e Entra/AWS nunca
 * tiveram cor aqui. Pedido explícito: replicar o padrão do Azure nas seis.
 */
export function cloudInfoBarStyle(cloudId: StatsCloudId, isDark: boolean) {
  const graphic = CLOUD_TIER_ACCENT[cloudId][isDark ? 'dark' : 'light']
  const text = CLOUD_TIER_ACCENT_TEXT[cloudId][isDark ? 'dark' : 'light']
  return {
    border: `${graphic}4D`,                          // ~30% alpha
    background: `${graphic}${isDark ? '1A' : '0D'}`,  // ~10% escuro / 5% claro
    codeBackground: `${graphic}${isDark ? '33' : '1A'}`, // ~20% escuro / 10% claro
    text,
  }
}
