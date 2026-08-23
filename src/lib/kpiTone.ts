/**
 * Tom dos números na linha de KPI das landings.
 *
 * Três estados, e só três. Antes cada landing escrevia o hex de cada número à
 * mão — 24 valores em 6 arquivos, sem regra que os ligasse. O resultado era que
 * a MESMA métrica mudava de cor conforme a página: "Privilegiadas" saía cinza
 * (#6b7280) em Entra ID, Azure RBAC e Workspace, e vermelha (#dc2626) em AWS,
 * GCP e IBM. Cor que muda de significado entre páginas não é significado — é
 * decoração, e é o que fazia a linha de KPI gritar sem informar.
 *
 * A regra agora cabe numa frase: numa linha de quatro, no máximo um número é
 * vermelho e um é azul; os outros dois são texto normal.
 *
 *   accent  → o total daquela página (a métrica que define a landing)
 *   danger  → risco: a contagem de privilegiadas
 *   neutral → todo o resto (tiers, categorias, scopes, contagens de apoio)
 *
 * Os dois tokens resolvem de custom property (`--c-accent`, `--c-danger`) e
 * portanto servem os dois temas sem par `x dark:x`. Contraste sobre a
 * superfície do card: accent 5.4:1 no claro e 8.4:1 no escuro; danger 6.6:1 e
 * 6.4:1 — todos acima do mínimo AA para texto normal, com folga.
 *
 * Cor sozinha nunca carrega o significado (regra `color-not-only`): o rótulo
 * acima do número diz o que ele é, em texto.
 */
export type KpiTone = 'accent' | 'danger' | 'neutral'

export const KPI_TONE: Record<KpiTone, string> = {
  accent: 'text-accent',
  danger: 'text-danger',
  neutral: 'text-fg',
}

/**
 * Os mesmos três estados, como VALOR de CSS.
 *
 * Os clientes de detalhe aplicam a cor do número por `style={{ color }}` (o
 * `StatCard` de cada um recebe uma prop `accent: string`), então classe não
 * serve ali. São custom properties e não hex pelo mesmo motivo de
 * `cloudColors.ts`: um hex fixo não atende os dois temas.
 */
export const KPI_TONE_VALUE: Record<KpiTone, string> = {
  accent: 'rgb(var(--c-accent))',
  danger: 'rgb(var(--c-danger))',
  neutral: 'rgb(var(--c-fg))',
}
