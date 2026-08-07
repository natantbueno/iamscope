'use client'

import { SoDPlatform, SOD_PLATFORM_META } from '@/data/sod/rules'

/**
 * Rótulo da plataforma de uma referência de role.
 *
 * Neutro de propósito: numa linha de conflito a cor já carrega a severidade, e
 * a plataforma é contexto, não alerta. Ver o nível 3 monocromático em
 * ROTEIRO-UI-ANTI-IA.md — o nome da plataforma fica em inglês nos dois idiomas
 * por ser nome próprio.
 */
export default function SoDCloudBadge({ cloud }: { cloud: SoDPlatform }) {
  return (
    <span className="text-micro font-bold px-1.5 py-0.5 rounded shrink-0 bg-surface-alt text-fg-muted border border-line whitespace-nowrap">
      {SOD_PLATFORM_META[cloud].label}
    </span>
  )
}
