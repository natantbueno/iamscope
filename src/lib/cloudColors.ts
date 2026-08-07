// -----------------------------------------------------------------------------
// Cores de cloud — ponte entre os tokens do Tailwind e o TypeScript.
//
// Existiam três listas de cor por cloud, e elas divergiam:
//   - tailwind.config.js (csp.*)   → usada nos cards da home e nos badges
//   - CloudNav.tsx (const CLOUDS)  → usada no menu superior
//   - Sidebar.tsx (PLATFORMS)      → usada na navegação lateral
//
// Resultado: o GCP era azul no card e verde no menu; o IBM Cloud, azul no card
// e teal no menu; o Azure RBAC não tinha cor própria e herdava o azul do Entra.
// A mesma cloud tinha identidade diferente dependendo de onde a pessoa olhava.
//
// Este arquivo é a fonte única. Quem precisa da cor como classe usa os tokens
// `csp-*` do Tailwind; quem precisa dela como valor (CSS custom property,
// style inline, SVG) importa daqui. Os valores TÊM de espelhar tailwind.config.
//
// Três cores por cloud, e a distinção é acessibilidade, não estética:
//   mark    → ponto, barra, fundo de badge. Requisito: 3:1 contra o fundo.
//   onDark  → texto sobre superfície escura. Requisito: 4.5:1 (WCAG AA, 13px).
//   onLight → texto sobre superfície clara. Mesmo requisito, sentido oposto.
// Nenhuma cor de marca serve como texto nos dois temas: o roxo do Azure RBAC
// (#5c2d91) dá 1.89:1 no escuro, e o azul do Entra (#85b7eb) dá 2.1:1 no claro.
// Daí as duas variantes. Usar `mark` como texto é o erro que isso previne.
// -----------------------------------------------------------------------------

export type CloudId =
  | 'home'
  | 'entraId'
  | 'azureRbac'
  | 'aws'
  | 'gcp'
  | 'googleWorkspace'
  | 'ibmCloud'

export interface CloudColor {
  /** Cor de marca — pontos, barras, fundos de badge. */
  mark: string
  /** Variante legível como texto sobre superfície escura (>= 4.5:1). */
  onDark: string
  /** Variante legível como texto sobre superfície clara (>= 5:1 no branco). */
  onLight: string
}

export const CLOUD_COLORS: Record<CloudId, CloudColor> = (() => {
  // Nível 3 (06/08/2026): a cor de marca saiu. Os três papéis continuam, para
  // que nenhum consumidor quebre, mas resolvem da escala neutra.
  //
  // Os valores são `rgb(var(--token))` e não hex porque TODO consumidor aplica
  // isto como valor de CSS num `style` inline (ponto da Sidebar, barra do
  // ReferenceIndex, texto do CompareTable). Com custom property o tema resolve
  // sozinho — um hex fixo daria 3.6:1 como texto no escuro, abaixo do mínimo.
  // Nenhum consumidor faz parse de hex nestes valores (o `themedText` recebe
  // cor de TIER_META, não daqui) — conferido antes de trocar.
  const neutro: CloudColor = {
    mark:    'rgb(var(--c-fg-subtle))',
    onDark:  'rgb(var(--c-fg-muted))',
    onLight: 'rgb(var(--c-fg-muted))',
  }
  return {
    home: neutro, entraId: neutro, azureRbac: neutro,
    aws: neutro, gcp: neutro, googleWorkspace: neutro, ibmCloud: neutro,
  }
})()
