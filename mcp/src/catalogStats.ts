// GERADO por scripts/gen-stats.mjs — não editar à mão.
// Rode `npm run build` depois de qualquer coleta que altere os datasets.

export const CATALOG_STATS = {
  "rolesByPlatform": {
    "entraId": 144,
    "azureRbac": 504,
    "aws": 1582,
    "gcp": 2389,
    "googleWorkspace": 14,
    "ibmCloud": 7
  },
  "azureActions": 17591,
  "azureProviders": 151,
  "roles": 4640,
  "permissionsByCloud": {
    "entraId": 670,
    "aws": 16423,
    "gcp": 13701,
    "googleWorkspace": 71
  },
  "permissions": 30865,
  "sodRules": 190,
  "equivalences": 29
} as const

/** Formatados em pt-BR, para entrar em descrição de ferramenta sem virar "4640". */
export const CATALOG_TEXT = {
  roles: '4.640',
  permissions: '30.865',
  azureActions: '17.591',
  azureProviders: '151',
  sodRules: '190',
  equivalences: '29',
} as const
