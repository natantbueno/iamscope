// -----------------------------------------------------------------------------
// Cor de texto legível nos dois temas, para cores que vêm do DADO.
//
// O problema: tier de role, severidade de SoD e categoria trazem a própria cor
// (`GCP_TIER_META`, `SOD_SEVERITY_META`, ...), aplicada por `style` inline. Cor
// única não resolve os dois temas — e não é questão de gosto, é aritmética: para
// dar 4.5:1 sobre branco a luminância precisa ficar abaixo de 0.183; para dar
// 4.5:1 sobre a superfície escura (#111827) precisa ficar acima de 0.245. Não
// existe valor que satisfaça os dois. Por isso o vermelho `#ef4444` do badge
// "Critical" ficava em 3.6:1 no claro e 4.2:1 no escuro: falhava nos dois.
//
// A solução aqui é derivar DUAS variantes da cor original — uma escurecida para
// o tema claro, outra clareada para o escuro — e publicá-las como custom
// properties. Quem escolhe entre elas é o CSS (`.themed-color` / `.dark
// .themed-color` em globals.css), não o JavaScript. Isso importa: com `useTheme()`
// haveria um quadro com a cor errada a cada carga, porque o HTML estático sempre
// sai com o tema escuro e o React só corrige depois da hidratação.
//
// O matiz e a saturação são preservados: só a luminosidade se move, e só o
// necessário para cruzar o limiar. O vermelho continua vermelho.
// -----------------------------------------------------------------------------

const SURFACE_LIGHT: RGB = [255, 255, 255]
const SURFACE_DARK: RGB = [17, 24, 39] // #111827 — igual a --c-bg-surface

type RGB = [number, number, number]

function parseHex(hex: string): { rgb: RGB; alpha: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return {
    rgb: [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ],
    alpha: full.length >= 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  }
}

const toHex = (rgb: RGB) =>
  '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

const channel = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Achata uma cor com alfa sobre a superfície, devolvendo o que o olho vê. */
function composite(fg: RGB, alpha: number, bg: RGB): RGB {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as RGB
}

/** Move a cor na direção pedida até cruzar o alvo de contraste. */
function adjust(rgb: RGB, bg: RGB, target: number, towards: 'black' | 'white'): RGB {
  const end: RGB = towards === 'black' ? [0, 0, 0] : [255, 255, 255]
  let best = rgb
  for (let step = 0; step <= 100; step++) {
    const t = step / 100
    const c = [0, 1, 2].map((i) => rgb[i] + (end[i] - rgb[i]) * t) as RGB
    best = c
    if (contrast(c, bg) >= target) break
  }
  return best
}

/**
 * Deriva o par de cores legíveis a partir de uma cor de dado.
 *
 * @param color cor original (`#rrggbb`)
 * @param background fundo do elemento, se houver — aceita alfa (`#rrggbbaa`),
 *        como os `bg` translúcidos dos badges de severidade
 * @param target contraste mínimo: 4.5 para texto normal, 3 para texto grande
 */
export function readablePair(color: string, background?: string, target = 4.5) {
  const { rgb } = parseHex(color)
  const bg = background ? parseHex(background) : null
  const onLight = bg ? composite(bg.rgb, bg.alpha, SURFACE_LIGHT) : SURFACE_LIGHT
  const onDark = bg ? composite(bg.rgb, bg.alpha, SURFACE_DARK) : SURFACE_DARK
  // A direção do ajuste vem do fundo EFETIVO, não do tema. Um badge com fundo
  // opaco claro continua claro no tema escuro — clarear o texto ali afundaria o
  // contraste em vez de resolver (foi o que aconteceu com o badge "Platform
  // Admin" do IBM: 1.06:1).
  const towards = (b: RGB) => (luminance(b) > 0.3 ? 'black' : 'white') as 'black' | 'white'
  return {
    light: toHex(adjust(rgb, onLight, target, towards(onLight))),
    dark: toHex(adjust(rgb, onDark, target, towards(onDark))),
  }
}

/**
 * Estilo pronto para usar junto da classe `themed-color`.
 *
 * ```tsx
 * <span className="themed-color" style={themedText(meta.color, meta.bg)}>
 * ```
 */
export function themedText(color: string, background?: string, target = 4.5): React.CSSProperties {
  const { light, dark } = readablePair(color, background, target)
  return { '--themed-light': light, '--themed-dark': dark } as React.CSSProperties
}
