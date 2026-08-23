'use client'

import { Fragment } from 'react'

/**
 * Renderiza **negrito**, *itálico* e `código` dentro de uma string traduzida.
 *
 * POR QUE EXISTE
 *   Um parágrafo com <strong> no meio viraria três chaves — abre, o trecho em
 *   negrito, fecha. Além de triplicar a contagem, a frase deixa de ser legível
 *   COMO FRASE, que é exatamente o que se precisa ter na frente para traduzir
 *   bem; e a ordem das palavras muda entre português e inglês, então o trecho
 *   em negrito nem sempre cai no mesmo lugar. Aqui a ênfase viaja dentro do
 *   texto e cada idioma a coloca onde quiser.
 *
 *   Não serve para link: link precisa de href, que não é conteúdo de tradução.
 *   Nesses casos a frase é reestruturada para o link sair de dentro dela, ou —
 *   quando o rótulo é nome próprio, estável nos dois idiomas — a frase é
 *   partida em duas chaves com o link no meio.
 */
export function Rich({
  text, className, codeClassName,
}: { text: string; className?: string; codeClassName?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i} className={className}>{p.slice(2, -2)}</strong>
        }
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
          return <code key={i} className={codeClassName ?? 'font-mono'}>{p.slice(1, -1)}</code>
        }
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
          return <em key={i}>{p.slice(1, -1)}</em>
        }
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}
