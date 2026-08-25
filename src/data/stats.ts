// AUTO-GERADO por scripts/build-stats.js — não editar à mão.
// Gerado em: 2026-08-24T01:34:45.628Z
//
// O panorama cross-cloud que /stats publica. Só números e rótulos: nenhum
// dataset entra no bundle da página. Mesmo desenho de src/data/counts.ts.
//
// AS BASES DE CONTAGEM DE TAMANHO NÃO SÃO A MESMA COISA — leia `size.basis`
// antes de comparar duas medianas:
//
//   exact      contagem literal, sem wildcard envolvido (Entra ID, GCP IAM)
//   effective  wildcards já expandidos, e o resultado é um PISO (Azure RBAC).
//              Ver src/data/azureEffective.ts: o universo vem da documentação,
//              a Management API expõe mais. Sempre exibido com `≥`.
//   entries    entradas do documento de policy — `"*"` conta 1 (AWS IAM).
//              `patternRoles` diz quantas policies têm ao menos um padrão.
//   declared   capacidades que o provedor publica por role, não permissão de
//              API (Google Workspace).
//   none       o provedor não publica ação por role (IBM Cloud).
//
// Rode de novo depois de qualquer coletor que altere src/data/ ou
// public/*-index.json.

export type StatsCloudId = 'entraId' | 'azureRbac' | 'aws' | 'gcp' | 'ibmCloud' | 'googleWorkspace'

export type SizeBasis = 'exact' | 'effective' | 'entries' | 'declared' | 'none'

export interface StatsTier {
  tier: string
  label: string
  /** Chave de dicionário quando o rótulo é de interface; null quando é nome próprio. */
  labelKey: string | null
  /** Do TIER_META da plataforma — a escada do nível 3, não uma paleta nova. */
  color: string
  count: number
  level: 0 | 1 | 2 | null
}

export interface StatsEam { 0: number; 1: number; 2: number; unclassified: number }

export interface StatsSize {
  basis: SizeBasis
  /** null quando não há base para calcular — nunca 0, que se leria como zero permissões. */
  median: number | null
  max: number | null
  /** Quantas roles entraram na conta. */
  counted: number
  /** Quantas ficaram de fora por não terem lista publicada. */
  excluded: number
  /**
   * AWS: policies com ao menos um padrão wildcard.
   * Entra ID: actions com wildcard no dataset (é 0, e a tela usa isso para
   * afirmar que a base é literal em vez de prometer).
   * Google Workspace: roles cujo mapa de privilégio de API é completo.
   */
  patternRoles: number
}

export interface StatsTopItem { permission: string; roles: number; isPattern: boolean }

/**
 * De onde sai o top de permissões:
 *   index     índice invertido real de permissão -> roles
 *   declared  a lista de capacidades que o provedor publica, em prosa — o mapa
 *             machine-readable só existe para parte das roles (Google Workspace)
 *   none      o provedor não publica permissão por role (IBM Cloud)
 */
export type TopBasis = 'index' | 'declared' | 'none'

export interface StatsCloud {
  label: string
  unit: 'roles' | 'policies'
  href: string
  total: number
  privileged: number
  tiers: StatsTier[]
  eam: StatsEam
  size: StatsSize
  top: { basis: TopBasis; permissions: number; items: StatsTopItem[] }
}

export const STATS_CLOUDS: Record<StatsCloudId, StatsCloud> = {
  "entraId": {
    "label": "Entra ID",
    "unit": "roles",
    "href": "/entraid/roles",
    "total": 144,
    "privileged": 33,
    "tiers": [
      {
        "tier": "ControlPlane",
        "label": "Control Plane",
        "labelKey": "tier.controlPlane",
        "color": "#9a2020",
        "count": 65,
        "level": 0
      },
      {
        "tier": "ManagementPlane",
        "label": "Management Plane",
        "labelKey": "tier.managementPlane",
        "color": "#5a6370",
        "count": 71,
        "level": 1
      },
      {
        "tier": "UserAccess",
        "label": "User Access",
        "labelKey": "tier.userAccess",
        "color": "#5a6370",
        "count": 8,
        "level": 2
      },
      {
        "tier": "Unclassified",
        "label": "Nao classificada",
        "labelKey": "tier.unclassified",
        "color": "#5a6370",
        "count": 0,
        "level": null
      }
    ],
    "eam": {
      "0": 65,
      "1": 71,
      "2": 8,
      "unclassified": 0
    },
    "size": {
      "basis": "exact",
      "median": 6,
      "max": 254,
      "counted": 144,
      "excluded": 0,
      "patternRoles": 0
    },
    "top": {
      "basis": "index",
      "permissions": 670,
      "items": [
        {
          "permission": "microsoft.office365.webPortal/allEntities/standard/read",
          "roles": 84,
          "isPattern": false
        },
        {
          "permission": "microsoft.office365.supportTickets/allEntities/allTasks",
          "roles": 56,
          "isPattern": false
        },
        {
          "permission": "microsoft.office365.serviceHealth/allEntities/allTasks",
          "roles": 52,
          "isPattern": false
        },
        {
          "permission": "microsoft.azure.serviceHealth/allEntities/allTasks",
          "roles": 48,
          "isPattern": false
        },
        {
          "permission": "microsoft.azure.supportTickets/allEntities/allTasks",
          "roles": 45,
          "isPattern": false
        },
        {
          "permission": "microsoft.office365.usageReports/allEntities/allProperties/read",
          "roles": 21,
          "isPattern": false
        },
        {
          "permission": "microsoft.office365.network/performance/allProperties/read",
          "roles": 19,
          "isPattern": false
        },
        {
          "permission": "microsoft.office365.messageCenter/messages/read",
          "roles": 18,
          "isPattern": false
        },
        {
          "permission": "microsoft.directory/authorizationPolicy/standard/read",
          "roles": 17,
          "isPattern": false
        },
        {
          "permission": "microsoft.directory/auditLogs/allProperties/read",
          "roles": 12,
          "isPattern": false
        }
      ]
    }
  },
  "azureRbac": {
    "label": "Azure RBAC",
    "unit": "roles",
    "href": "/azure-rbac/roles",
    "total": 504,
    "privileged": 58,
    "tiers": [
      {
        "tier": "FullControl",
        "label": "Full Control",
        "labelKey": null,
        "color": "#dc2626",
        "count": 1,
        "level": 0
      },
      {
        "tier": "AccessManagement",
        "label": "Access Management",
        "labelKey": null,
        "color": "#5a6370",
        "count": 12,
        "level": 0
      },
      {
        "tier": "Contributor",
        "label": "Contributor",
        "labelKey": null,
        "color": "#5a6370",
        "count": 342,
        "level": 1
      },
      {
        "tier": "DataPlane",
        "label": "Data Plane",
        "labelKey": null,
        "color": "#5a6370",
        "count": 122,
        "level": 1
      },
      {
        "tier": "Reader",
        "label": "Reader",
        "labelKey": null,
        "color": "#5a6370",
        "count": 27,
        "level": 2
      },
      {
        "tier": "Specialized",
        "label": "Specialized",
        "labelKey": null,
        "color": "#5a6370",
        "count": 0,
        "level": 1
      }
    ],
    "eam": {
      "0": 13,
      "1": 464,
      "2": 27,
      "unclassified": 0
    },
    "size": {
      "basis": "effective",
      "median": 49,
      "max": 17591,
      "counted": 504,
      "excluded": 0,
      "patternRoles": 0
    },
    "top": {
      "basis": "index",
      "permissions": 2697,
      "items": [
        {
          "permission": "Microsoft.Authorization/*/read",
          "roles": 247,
          "isPattern": true
        },
        {
          "permission": "Microsoft.Resources/subscriptions/resourceGroups/read",
          "roles": 241,
          "isPattern": false
        },
        {
          "permission": "Microsoft.Resources/deployments/*",
          "roles": 156,
          "isPattern": true
        },
        {
          "permission": "Microsoft.Insights/alertRules/*",
          "roles": 152,
          "isPattern": true
        },
        {
          "permission": "Microsoft.Support/*",
          "roles": 131,
          "isPattern": true
        },
        {
          "permission": "Microsoft.ResourceHealth/availabilityStatuses/read",
          "roles": 60,
          "isPattern": false
        },
        {
          "permission": "Microsoft.Resources/subscriptions/read",
          "roles": 53,
          "isPattern": false
        },
        {
          "permission": "Microsoft.Resources/subscriptions/operationresults/read",
          "roles": 41,
          "isPattern": false
        },
        {
          "permission": "Microsoft.Resources/deployments/read",
          "roles": 31,
          "isPattern": false
        },
        {
          "permission": "Microsoft.Network/virtualNetworks/read",
          "roles": 27,
          "isPattern": false
        }
      ]
    }
  },
  "aws": {
    "label": "AWS IAM",
    "unit": "policies",
    "href": "/aws/policies",
    "total": 1582,
    "privileged": 417,
    "tiers": [
      {
        "tier": "FullAccess",
        "label": "Full Access",
        "labelKey": null,
        "color": "#dc2626",
        "count": 332,
        "level": 0
      },
      {
        "tier": "PowerUser",
        "label": "Power User",
        "labelKey": null,
        "color": "#6b7280",
        "count": 61,
        "level": 1
      },
      {
        "tier": "ReadOnly",
        "label": "Read Only",
        "labelKey": null,
        "color": "#6b7280",
        "count": 312,
        "level": 2
      },
      {
        "tier": "Operator",
        "label": "Operator",
        "labelKey": null,
        "color": "#6b7280",
        "count": 89,
        "level": 1
      },
      {
        "tier": "Specialized",
        "label": "Specialized",
        "labelKey": null,
        "color": "#6b7280",
        "count": 788,
        "level": 1
      }
    ],
    "eam": {
      "0": 332,
      "1": 938,
      "2": 312,
      "unclassified": 0
    },
    "size": {
      "basis": "entries",
      "median": 10,
      "max": 4533,
      "counted": 1582,
      "excluded": 0,
      "patternRoles": 536
    },
    "top": {
      "basis": "index",
      "permissions": 16423,
      "items": [
        {
          "permission": "ec2:DescribeSubnets",
          "roles": 268,
          "isPattern": false
        },
        {
          "permission": "iam:PassRole",
          "roles": 256,
          "isPattern": false
        },
        {
          "permission": "ec2:DescribeSecurityGroups",
          "roles": 235,
          "isPattern": false
        },
        {
          "permission": "ec2:DescribeVpcs",
          "roles": 231,
          "isPattern": false
        },
        {
          "permission": "iam:CreateServiceLinkedRole",
          "roles": 221,
          "isPattern": false
        },
        {
          "permission": "ec2:CreateTags",
          "roles": 176,
          "isPattern": false
        },
        {
          "permission": "s3:ListBucket",
          "roles": 175,
          "isPattern": false
        },
        {
          "permission": "s3:GetObject",
          "roles": 172,
          "isPattern": false
        },
        {
          "permission": "ec2:DescribeInstances",
          "roles": 171,
          "isPattern": false
        },
        {
          "permission": "iam:GetRole",
          "roles": 151,
          "isPattern": false
        }
      ]
    }
  },
  "gcp": {
    "label": "GCP IAM",
    "unit": "roles",
    "href": "/gcp/roles",
    "total": 2389,
    "privileged": 280,
    "tiers": [
      {
        "tier": "ProjectOwner",
        "label": "Project Owner",
        "labelKey": null,
        "color": "#dc2626",
        "count": 1,
        "level": 0
      },
      {
        "tier": "Admin",
        "label": "Admin",
        "labelKey": null,
        "color": "#6b7280",
        "count": 449,
        "level": 0
      },
      {
        "tier": "Editor",
        "label": "Editor",
        "labelKey": null,
        "color": "#6b7280",
        "count": 1,
        "level": 1
      },
      {
        "tier": "Operator",
        "label": "Operator",
        "labelKey": null,
        "color": "#6b7280",
        "count": 49,
        "level": 1
      },
      {
        "tier": "Developer",
        "label": "Developer",
        "labelKey": null,
        "color": "#6b7280",
        "count": 171,
        "level": 1
      },
      {
        "tier": "Viewer",
        "label": "Viewer",
        "labelKey": null,
        "color": "#6b7280",
        "count": 300,
        "level": 2
      },
      {
        "tier": "Specialized",
        "label": "Specialized",
        "labelKey": null,
        "color": "#6b7280",
        "count": 1418,
        "level": 1
      }
    ],
    "eam": {
      "0": 450,
      "1": 1639,
      "2": 300,
      "unclassified": 0
    },
    "size": {
      "basis": "exact",
      "median": 12,
      "max": 6545,
      "counted": 2368,
      "excluded": 21,
      "patternRoles": 0
    },
    "top": {
      "basis": "index",
      "permissions": 13701,
      "items": [
        {
          "permission": "resourcemanager.projects.get",
          "roles": 1535,
          "isPattern": false
        },
        {
          "permission": "resourcemanager.projects.list",
          "roles": 1452,
          "isPattern": false
        },
        {
          "permission": "serviceusage.services.get",
          "roles": 182,
          "isPattern": false
        },
        {
          "permission": "serviceusage.groups.list",
          "roles": 173,
          "isPattern": false
        },
        {
          "permission": "serviceusage.consumerpolicy.get",
          "roles": 171,
          "isPattern": false
        },
        {
          "permission": "serviceusage.effectivepolicy.get",
          "roles": 171,
          "isPattern": false
        },
        {
          "permission": "serviceusage.groups.listMembers",
          "roles": 171,
          "isPattern": false
        },
        {
          "permission": "serviceusage.values.test",
          "roles": 171,
          "isPattern": false
        },
        {
          "permission": "serviceusage.consumerpolicy.analyze",
          "roles": 166,
          "isPattern": false
        },
        {
          "permission": "serviceusage.groups.listExpandedMembers",
          "roles": 166,
          "isPattern": false
        }
      ]
    }
  },
  "ibmCloud": {
    "label": "IBM Cloud",
    "unit": "roles",
    "href": "/ibm-cloud/roles",
    "total": 7,
    "privileged": 1,
    "tiers": [
      {
        "tier": "AccountAdmin",
        "label": "Account Admin",
        "labelKey": null,
        "color": "#dc2626",
        "count": 0,
        "level": 0
      },
      {
        "tier": "PlatformAdmin",
        "label": "Platform Admin",
        "labelKey": null,
        "color": "#6b7280",
        "count": 1,
        "level": 1
      },
      {
        "tier": "PlatformOperator",
        "label": "Platform Operator",
        "labelKey": null,
        "color": "#6b7280",
        "count": 3,
        "level": 1
      },
      {
        "tier": "ServiceManager",
        "label": "Service Manager",
        "labelKey": null,
        "color": "#6b7280",
        "count": 1,
        "level": 1
      },
      {
        "tier": "ReadOnly",
        "label": "Read Only",
        "labelKey": null,
        "color": "#6b7280",
        "count": 2,
        "level": 2
      }
    ],
    "eam": {
      "0": 0,
      "1": 5,
      "2": 2,
      "unclassified": 0
    },
    "size": {
      "basis": "none",
      "median": null,
      "max": null,
      "counted": 0,
      "excluded": 7,
      "patternRoles": 0
    },
    "top": {
      "basis": "none",
      "permissions": 0,
      "items": []
    }
  },
  "googleWorkspace": {
    "label": "Google Workspace",
    "unit": "roles",
    "href": "/google-workspace/roles",
    "total": 14,
    "privileged": 4,
    "tiers": [
      {
        "tier": "SuperAdmin",
        "label": "Super Admin",
        "labelKey": null,
        "color": "#dc2626",
        "count": 1,
        "level": 0
      },
      {
        "tier": "DelegatedAdmin",
        "label": "Delegated Admin",
        "labelKey": null,
        "color": "#5a6370",
        "count": 4,
        "level": 1
      },
      {
        "tier": "ServiceAdmin",
        "label": "Service Admin",
        "labelKey": null,
        "color": "#5a6370",
        "count": 3,
        "level": 1
      },
      {
        "tier": "SpecializedAdmin",
        "label": "Specialized Admin",
        "labelKey": null,
        "color": "#5a6370",
        "count": 5,
        "level": 1
      },
      {
        "tier": "ReadOnly",
        "label": "Read Only",
        "labelKey": null,
        "color": "#5a6370",
        "count": 1,
        "level": 2
      }
    ],
    "eam": {
      "0": 1,
      "1": 12,
      "2": 1,
      "unclassified": 0
    },
    "size": {
      "basis": "declared",
      "median": 5,
      "max": 13,
      "counted": 14,
      "excluded": 0,
      "patternRoles": 1
    },
    "top": {
      "basis": "declared",
      "permissions": 71,
      "items": [
        {
          "permission": "View organizational units",
          "roles": 4,
          "isPattern": false
        },
        {
          "permission": "View user profiles and your organizational structure",
          "roles": 3,
          "isPattern": false
        },
        {
          "permission": "Add, view, edit, and transfer resold customers",
          "roles": 2,
          "isPattern": false
        },
        {
          "permission": "Privileges can be scoped to all groups, only security groups, or only non-security groups",
          "roles": 2,
          "isPattern": false
        },
        {
          "permission": "Accept the Terms of Service for a product",
          "roles": 1,
          "isPattern": false
        },
        {
          "permission": "Access and manage a customer's Admin console, Google Workspace Admin SDK, and support cases",
          "roles": 1,
          "isPattern": false
        },
        {
          "permission": "Access settings in the Partner Sales Console to view and edit support information",
          "roles": 1,
          "isPattern": false
        },
        {
          "permission": "Add a security label to a group",
          "roles": 1,
          "isPattern": false
        },
        {
          "permission": "Add locations",
          "roles": 1,
          "isPattern": false
        },
        {
          "permission": "ADMIN_APIS_ALL",
          "roles": 1,
          "isPattern": false
        }
      ]
    }
  }
}

/** Ordem de exibição — a mesma de CLOUD_ORDER em src/data/compare/types.ts. */
export const STATS_ORDER: StatsCloudId[] = [
  "entraId",
  "azureRbac",
  "aws",
  "gcp",
  "ibmCloud",
  "googleWorkspace"
]

export interface StatsSodPlatform {
  platform: string
  label: string
  provider: string
  rules: number
  cross: number
  roles: number
  severity: { critical: number; high: number; medium: number; low: number }
}

export const STATS_SOD = {
  "total": 190,
  "cross": 17,
  "platforms": [
    {
      "platform": "entra-id",
      "label": "Entra ID",
      "provider": "microsoft",
      "rules": 71,
      "cross": 15,
      "roles": 51,
      "severity": {
        "critical": 14,
        "high": 27,
        "medium": 25,
        "low": 5
      }
    },
    {
      "platform": "azure-rbac",
      "label": "Azure RBAC",
      "provider": "microsoft",
      "rules": 67,
      "cross": 15,
      "roles": 47,
      "severity": {
        "critical": 13,
        "high": 19,
        "medium": 27,
        "low": 8
      }
    },
    {
      "platform": "aws",
      "label": "AWS IAM",
      "provider": "aws",
      "rules": 25,
      "cross": 0,
      "roles": 33,
      "severity": {
        "critical": 5,
        "high": 10,
        "medium": 10,
        "low": 0
      }
    },
    {
      "platform": "gcp",
      "label": "GCP IAM",
      "provider": "google",
      "rules": 27,
      "cross": 2,
      "roles": 35,
      "severity": {
        "critical": 11,
        "high": 12,
        "medium": 3,
        "low": 1
      }
    },
    {
      "platform": "google-workspace",
      "label": "Google Workspace",
      "provider": "google",
      "rules": 17,
      "cross": 2,
      "roles": 14,
      "severity": {
        "critical": 3,
        "high": 6,
        "medium": 4,
        "low": 4
      }
    }
  ],
  "byProvider": {
    "microsoft": 123,
    "aws": 25,
    "google": 42
  },
  "severity": {
    "critical": 41,
    "high": 69,
    "medium": 62,
    "low": 18
  },
  "uncoveredClouds": [
    "ibmCloud"
  ]
} as {
  total: number
  cross: number
  platforms: StatsSodPlatform[]
  byProvider: Record<string, number>
  severity: { critical: number; high: number; medium: number; low: number }
  uncoveredClouds: string[]
}

export const STATS_TOTALS = {
  "roles": 4640,
  "privileged": 793,
  "tierZero": 861,
  "clouds": 6
}

/** Universo da expansão do Azure, para a página poder dizer contra o que o piso é medido. */
export const STATS_AZURE_UNIVERSE = {
  "actions": 17591,
  "providers": 151
}
