/**
 * Marcador de item descontinuado, compartilhado por AWS e GCP.
 *
 * Existe porque publicar uma role/policy removida como se estivesse ativa é
 * erro de integridade: o usuário pode montar um desenho de acesso em cima de
 * algo que o provedor já abandonou.
 *
 * A origem do sinal difere por cloud e está documentada em
 * scripts/lib/deprecation.js — nos dois casos vem do texto oficial da
 * descrição, não de um campo dedicado (nenhum dos dois provedores publica um
 * nas fontes que usamos).
 */
export default function DeprecatedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        title="O provedor indica que este item está descontinuado"
        className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded
                   bg-amber-100 text-amber-700 border border-amber-300
                   dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
      >
        Descontinuada
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider
                 px-2 py-0.5 rounded-full
                 bg-amber-100 text-amber-700 border border-amber-300
                 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
    >
      Descontinuada
    </span>
  )
}
