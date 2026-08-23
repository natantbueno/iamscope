'use strict'
/**
 * Detector de depreciação a partir da descrição oficial.
 *
 * POR QUE NÃO BASTA PROCURAR "deprecat":
 *   O GCP tem roles cujo ASSUNTO é depreciação e que estão perfeitamente
 *   ativas — `roles/recommender.cloudDeprecationRecommendationAdmin` e a
 *   variante Viewer ("Admin of Cloud Deprecation General Recommender Insights").
 *   Um `/deprecat/i` solto marcaria as duas como descontinuadas.
 *   Na AWS o risco é a seção "Learn more", que costuma linkar guias de
 *   depreciação em páginas de policies ativas — por isso só olhamos a
 *   descrição, nunca a página inteira.
 *
 * REDAÇÕES REAIS COBERTAS (verificadas em 29/07/2026):
 *   AWS  "This policy is on a deprecation path. See documentation for guidance"
 *   GCP  "Deprecated. Use featurestoreAdmin instead."
 *
 * LIMITE CONHECIDO — GCP:
 *   A documentação do Google não publica um marcador de depreciação: o launch
 *   stage exibido só assume GA ou Beta. `roles/aiplatform.featurestoreUser`
 *   aparece como "Beta" mesmo com "Deprecated." na descrição. Quem tem o campo
 *   `stage: DEPRECATED` é a IAM API (roles.list), usada por
 *   scripts/fetch-gcp-roles.js. Por isso a contagem vinda das docs é um piso,
 *   não o total: quem lê a API enxerga mais roles descontinuadas do que as
 *   docs sustentam.
 */

const DEPRECATION_RE = new RegExp([
  '^\\s*deprecated\\b',        // "Deprecated. Use X instead."
  '\\bis deprecated\\b',
  '\\bhas been deprecated\\b',
  '\\bwill be deprecated\\b',
  '\\bon a deprecation path\\b', // redação da AWS
  '\\bdeprecated[.:]',
].join('|'), 'i')

/** Recebe SÓ a descrição oficial — nunca o HTML da página inteira. */
function isDeprecated(description) {
  return DEPRECATION_RE.test(String(description ?? ''))
}

module.exports = { isDeprecated, DEPRECATION_RE }
