'use strict'
/**
 * Classificação editorial do IAM Scope para AWS Managed Policies.
 *
 * ATENÇÃO: tier, categoria e isPrivileged NÃO vêm da AWS. São derivados de
 * sinais objetivos (nome da policy e actions reais) para serem reprodutíveis,
 * e a UI precisa rotular como classificação nossa.
 *
 * O que É oficial e vem da AWS: name, arn, description, type, createdAt,
 * editedAt, version e o documento JSON da policy.
 *
 * BUG QUE ISTO CORRIGE: a versão anterior escolhia a categoria pelo serviço da
 * PRIMEIRA action em ordem alfabética. Resultado: AccessAnalyzerServiceRolePolicy
 * caía em 'Database' porque `dynamodb:...` vinha primeiro. Agora o nome da
 * policy tem prioridade e, na ausência de pista no nome, vale o serviço mais
 * FREQUENTE entre as actions, não o primeiro.
 */

const SERVICE_CATEGORY = {
  iam: 'IAM', sts: 'IAM', organizations: 'IAM', sso: 'IAM', identitystore: 'IAM',
  'access-analyzer': 'Security', accessanalyzer: 'Security',
  ec2: 'Compute', autoscaling: 'Compute', batch: 'Compute', lightsail: 'Compute',
  s3: 'Storage', 's3-object-lambda': 'Storage', s3express: 'Storage', glacier: 'Storage',
  efs: 'Storage', elasticfilesystem: 'Storage', fsx: 'Storage', backup: 'Storage',
  rds: 'Database', dynamodb: 'Database', elasticache: 'Database', redshift: 'Database',
  neptune: 'Database', docdb: 'Database', timestream: 'Database', memorydb: 'Database',
  qldb: 'Database', keyspaces: 'Database',
  vpc: 'Networking', route53: 'Networking', elasticloadbalancing: 'Networking',
  cloudfront: 'Networking', directconnect: 'Networking', globalaccelerator: 'Networking',
  networkmanager: 'Networking', apigateway: 'Networking',
  kms: 'Security', secretsmanager: 'Security', guardduty: 'Security', inspector: 'Security',
  inspector2: 'Security', macie: 'Security', macie2: 'Security', shield: 'Security',
  waf: 'Security', 'waf-regional': 'Security', wafv2: 'Security', securityhub: 'Security',
  acm: 'Security', 'acm-pca': 'Security', detective: 'Security', 'network-firewall': 'Security',
  codebuild: 'DevOps', codecommit: 'DevOps', codedeploy: 'DevOps', codepipeline: 'DevOps',
  codeartifact: 'DevOps', codestar: 'DevOps', cloudformation: 'DevOps', cloud9: 'DevOps',
  lambda: 'Serverless', states: 'Serverless', appsync: 'Serverless', amplify: 'Serverless',
  ecs: 'Containers', eks: 'Containers', ecr: 'Containers', 'ecr-public': 'Containers',
  'app-runner': 'Containers', apprunner: 'Containers',
  sagemaker: 'AI', bedrock: 'AI', comprehend: 'AI', rekognition: 'AI', textract: 'AI',
  polly: 'AI', transcribe: 'AI', translate: 'AI', lex: 'AI', personalize: 'AI',
  forecast: 'AI', kendra: 'AI', q: 'AI', 'deeplens': 'AI',
  athena: 'Analytics', glue: 'Analytics', emr: 'Analytics', 'elasticmapreduce': 'Analytics',
  kinesis: 'Analytics', firehose: 'Analytics', quicksight: 'Analytics', datazone: 'Analytics',
  es: 'Analytics', opensearch: 'Analytics', lakeformation: 'Analytics',
  cloudwatch: 'Management', logs: 'Management', cloudtrail: 'Management', config: 'Management',
  ssm: 'Management', servicecatalog: 'Management', resourcegroups: 'Management',
  'trustedadvisor': 'Management', support: 'Management', health: 'Management',
  iot: 'IoT', iotanalytics: 'IoT', iotevents: 'IoT', iotsitewise: 'IoT', greengrass: 'IoT',
  'iot1click': 'IoT', iotwireless: 'IoT',
  'aws-portal': 'Billing', budgets: 'Billing', ce: 'Billing', cur: 'Billing',
  billing: 'Billing', payments: 'Billing', 'freetier': 'Billing', pricing: 'Billing',
  sns: 'Messaging', sqs: 'Messaging', ses: 'Messaging', events: 'Messaging',
  mq: 'Messaging', 'schemas': 'Messaging', pinpoint: 'Messaging',
}

/** Pistas no NOME da policy têm prioridade sobre as actions. */
const NAME_HINTS = [
  [/access.?analyzer|guardduty|inspector|macie|securityhub|shield|waf|detective|kms|secretsmanager|certificate|audit/i, 'Security'],
  [/^iam|identity|sso|organizations|directoryservice/i, 'IAM'],
  [/billing|cost|budget|purchase|payment|invoic|freetier/i, 'Billing'],
  [/sagemaker|bedrock|comprehend|rekognition|textract|polly|transcribe|translate|lex|personalize|forecast|kendra|deeplens|machinelearning/i, 'AI'],
  [/athena|glue|emr|kinesis|quicksight|opensearch|elasticsearch|lakeformation|datazone|redshift/i, 'Analytics'],
  [/ecs|eks|ecr|fargate|container|apprunner/i, 'Containers'],
  [/lambda|stepfunction|states|appsync|amplify|serverless/i, 'Serverless'],
  [/codebuild|codecommit|codedeploy|codepipeline|codeartifact|codestar|cloudformation|cloud9|devops/i, 'DevOps'],
  [/rds|dynamodb|aurora|elasticache|neptune|documentdb|docdb|timestream|memorydb|qldb|keyspaces|database/i, 'Database'],
  [/vpc|route53|loadbalanc|cloudfront|directconnect|networkfirewall|globalaccelerator|apigateway|network/i, 'Networking'],
  [/s3|glacier|efs|fsx|backup|storage/i, 'Storage'],
  [/ec2|autoscaling|lightsail|batch|compute/i, 'Compute'],
  [/^iot|greengrass/i, 'IoT'],
  [/sns|sqs|ses|eventbridge|pinpoint|messaging|notification/i, 'Messaging'],
  [/cloudwatch|cloudtrail|systemsmanager|^ssm|config|servicecatalog|trustedadvisor|support|health|monitor/i, 'Management'],
]

function serviceOf(action) {
  const i = String(action).indexOf(':')
  return i > 0 ? String(action).slice(0, i).toLowerCase() : ''
}

function classifyCategory(name, actions) {
  for (const [re, cat] of NAME_HINTS) if (re.test(name)) return cat

  // serviço MAIS FREQUENTE entre as actions (não o primeiro)
  const freq = new Map()
  for (const a of actions) {
    const s = serviceOf(a)
    if (!s || s === '*') continue
    freq.set(s, (freq.get(s) || 0) + 1)
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1])
  for (const [svc] of ranked) if (SERVICE_CATEGORY[svc]) return SERVICE_CATEGORY[svc]
  return 'Management'
}

const ADMIN_RE = /^(\*|iam:\*|.*:\*)$/
const IAM_WRITE = /^iam:(Create|Delete|Update|Put|Attach|Detach|Add|Remove|Set|Pass)/i

function classifyTier(name, actions) {
  if (actions.includes('*')) return 'FullAccess'
  if (/administratoraccess/i.test(name)) return 'FullAccess'
  if (/^poweruser|poweruseraccess/i.test(name)) return 'PowerUser'

  const allRead = actions.length > 0 && actions.every((a) =>
    /:(Get|List|Describe|View|Read|BatchGet|Search|Query|Head)/i.test(a) || /:(Get|List|Describe)\*$/i.test(a))
  if (allRead) return 'ReadOnly'
  if (/readonly|viewonly|readaccess/i.test(name)) return 'ReadOnly'

  if (/fullaccess/i.test(name)) return 'FullAccess'
  if (actions.some((a) => ADMIN_RE.test(a))) return 'PowerUser'
  if (/operator|deploy|execution|automation|maintenance/i.test(name)) return 'Operator'
  return 'Specialized'
}

function isPrivileged(name, actions) {
  if (actions.includes('*')) return true
  if (/administratoraccess/i.test(name)) return true
  return actions.some((a) => IAM_WRITE.test(a) || a === 'iam:*'
    || /^sts:AssumeRole/i.test(a) || /^organizations:(Create|Delete|Attach|Detach|Update|Move|Leave|Remove)/i.test(a))
}

/**
 * Tipo derivado do ARN + do campo Type oficial.
 * A AWS usa strings como "AWS managed policy" e "Service-linked role policy".
 */
function classifyType(arn, officialType) {
  const t = String(officialType ?? '').toLowerCase()
  if (/aws-service-role/.test(arn) || t.includes('service-linked')) return 'service-role'
  if (t.includes('job function')) return 'permission-set'
  if (/service-role/.test(arn) || t.includes('service role')) return 'service-role'
  return 'managed'
}

function classifyScope(arn) {
  if (/aws-service-role/.test(arn)) return 'service'
  return 'account'
}

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')

module.exports = {
  classifyCategory, classifyTier, isPrivileged, classifyType, classifyScope,
  slugify, esc, serviceOf, SERVICE_CATEGORY, NAME_HINTS,
}
