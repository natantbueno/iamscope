// ── IBM Cloud IAM — Access Groups & Trusted Profiles ────────────────────────
// Estes dois primitivos não são "roles" no sentido do restante do catálogo —
// são os mecanismos de AGRUPAMENTO e DELEGAÇÃO DE IDENTIDADE do IBM Cloud IAM,
// usados para anexar roles (IBM_ROLES) a conjuntos de identidades ou a cargas
// de trabalho federadas. Antes desta página eles apareciam apenas como texto
// descritivo dentro de outras roles (ex.: IAM Administrator), sem serem
// entidades de catálogo próprias.
// Sources:
//   https://cloud.ibm.com/docs/account?topic=account-groups
//   https://cloud.ibm.com/docs/account?topic=account-create-trusted-profile

export type IbmAccessPrimitiveKind = 'access-group' | 'trusted-profile'

export interface IbmAccessPrimitive {
  slug: string
  name: string
  kind: IbmAccessPrimitiveKind
  description: string
  members?: string[]
  trustedBy?: string[]
  useCases: string[]
  keyCapabilities: string[]
  limits?: string[]
  docsUrl: string
}

export const IBM_ACCESS_PRIMITIVES: IbmAccessPrimitive[] = [
  {
    slug: 'access-group',
    name: 'Access Group',
    kind: 'access-group',
    description:
      'Um contêiner que agrupa usuários, IDs de serviço e trusted profiles para atribuição de política em massa. Em vez de atribuir uma role individualmente a cada identidade, a policy é atribuída uma única vez ao grupo, e todos os membros herdam o acesso.',
    members: ['Usuários IAM (por e-mail ou federados via IdP)', 'IDs de serviço (Service IDs)', 'Trusted profiles', 'Outros access groups não são suportados como membros — sem aninhamento'],
    useCases: [
      'Onboarding/offboarding em massa: adicionar/remover um usuário de um grupo em vez de reatribuir dezenas de policies',
      'Sincronização automática de membros via SCIM a partir de um IdP corporativo (Entra ID, Okta)',
      'Regras dinâmicas de associação baseadas em atributos SAML do IdP (ex.: todos os usuários do departamento "Engenharia" entram automaticamente)',
    ],
    keyCapabilities: [
      'Policies atribuídas ao grupo se aplicam a todos os membros, incluindo os adicionados posteriormente',
      'Suporta "dynamic rules" — associação automática baseada em atributos de federação SAML',
      'Um usuário pode pertencer a múltiplos access groups; o acesso efetivo é a união de todas as policies',
      'Access group access review — revisão periódica obrigatória de quem tem acesso a quê',
    ],
    limits: [
      'Sem aninhamento de access groups dentro de access groups',
      'Limite de 1.000 access groups por conta (padrão; pode ser aumentado via suporte)',
    ],
    docsUrl: 'https://cloud.ibm.com/docs/account?topic=account-groups',
  },
  {
    slug: 'trusted-profile',
    name: 'Trusted Profile',
    kind: 'trusted-profile',
    description:
      'Uma identidade IAM sem credenciais de login próprias, criada para ser assumida por uma entidade confiável — um recurso de computação (VSI, cluster), uma identidade federada de outro IdP, ou uma carga de trabalho de outra cloud via workload identity federation (OIDC). É o equivalente funcional a uma IAM Role assumível de outras clouds (ex.: AWS IAM Role, Azure Managed Identity).',
    trustedBy: [
      'Recursos de computação IBM Cloud (Virtual Server Instances, VPC, clusters de Kubernetes/OpenShift)',
      'Identidades federadas via IdP compatível com SAML 2.0/OIDC',
      'Cargas de trabalho de outras clouds (AWS, Azure, GCP) via workload identity federation, sem chaves de API de longa duração',
      'Serviços do próprio IBM Cloud atuando em nome de um recurso',
    ],
    useCases: [
      'Eliminar chaves de API de longa duração embutidas em código ou pipelines CI/CD',
      'Conceder a uma VSI ou cluster acesso apenas aos serviços que ela precisa, sem uma identidade de usuário humano por trás',
      'Federação cross-cloud: uma workload rodando em outra cloud assume um trusted profile para acessar recursos IBM Cloud',
      'Automação e workloads não-interativos (equivalente a Service Roles/Managed Identities de outras clouds)',
    ],
    keyCapabilities: [
      'Políticas IAM padrão (mesmas roles do restante do catálogo) podem ser atribuídas a um trusted profile',
      'Sessões obtidas via trusted profile são temporárias e não requerem armazenamento de credenciais estáticas',
      'Pode ser membro de um Access Group, herdando as policies do grupo',
      'Suporta condições de confiança (ex.: apenas de uma conta AWS/GCP específica, ou apenas de um cluster com um determinado namespace)',
    ],
    limits: [
      'Não é uma identidade de login interativo — não pode ser usada para acesso via console com usuário/senha',
      'A relação de confiança precisa ser configurada explicitamente por tipo de entidade confiável (compute resource, federado, ou cross-cloud)',
    ],
    docsUrl: 'https://cloud.ibm.com/docs/account?topic=account-create-trusted-profile',
  },
]

export function getAccessPrimitiveBySlug(slug: string): IbmAccessPrimitive | undefined {
  return IBM_ACCESS_PRIMITIVES.find(p => p.slug === slug)
}
