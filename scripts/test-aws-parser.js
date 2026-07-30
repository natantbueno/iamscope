#!/usr/bin/env node
/**
 * Teste offline do parser de scripts/fetch-aws-policies-official.js.
 *
 * O fixture reproduz o markup real das páginas da AWS, incluindo o que quebra
 * parser ingênuo:
 *   - "Edited time:" com o dois-pontos DENTRO do <b> (Description/Type/ARN têm fora);
 *   - bloco JSON com <span> injetado e entidades HTML (&quot;);
 *   - Type variando entre "AWS managed policy" e "Service-linked role policy";
 *   - ARN de service-role (caminho /aws-service-role/);
 *   - Statement como objeto único em vez de array;
 *   - NotAction.
 *
 * Uso: node scripts/test-aws-parser.js
 */
const { parsePolicy, discoverPolicies } = require('./fetch-aws-policies-official')
const { classifyCategory, classifyTier, isPrivileged, classifyType } = require('./lib/aws-classify')

const PAGE_NORMAL = `
<h1>AmazonS3ReadOnlyAccess</h1>
<p><b>Description</b>: Provides read only access to all buckets via the AWS Management Console.</p>
<ul>
  <li class="listitem"><p><b>Type</b>: AWS managed policy </p></li>
  <li class="listitem"><p><b>Creation time</b>: February 06, 2015, 18:40 UTC </p></li>
  <li class="listitem"><p><b>Edited time:</b> August 10, 2023, 21:31 UTC</p></li>
  <li class="listitem"><p><b>ARN</b>: <code class="code">arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess</code></p></li>
</ul>
<p><b>Policy version</b>: v3 (default)</p>
<pre class="programlisting"><code class="json "><span>{</span> &quot;Version&quot; : &quot;2012-10-17&quot;,
 &quot;Statement&quot; : [ <span>{</span> &quot;Effect&quot; : &quot;Allow&quot;,
 &quot;Action&quot; : [ &quot;s3:Get*&quot;, &quot;s3:List*&quot; ],
 &quot;Resource&quot; : &quot;*&quot; <span>}</span> ] <span>}</span></code></pre>
`

const PAGE_SERVICE_ROLE = `
<h1>AccessAnalyzerServiceRolePolicy</h1>
<p><b>Description</b>: Allow Access Analyzer to analyze resource metadata</p>
<ul>
  <li class="listitem"><p><b>Type</b>: Service-linked role policy </p></li>
  <li class="listitem"><p><b>Creation time</b>: December 02, 2019, 17:13 UTC </p></li>
  <li class="listitem"><p><b>Edited time:</b> February 12, 2026, 17:59 UTC</p></li>
  <li class="listitem"><p><b>ARN</b>: <code class="code">arn:aws:iam::aws:policy/aws-service-role/AccessAnalyzerServiceRolePolicy</code></p></li>
</ul>
<p><b>Policy version</b>: v23 (default)</p>
<pre class="programlisting"><code class="json "><span>{</span> &quot;Version&quot; : &quot;2012-10-17&quot;,
 &quot;Statement&quot; : <span>{</span> &quot;Effect&quot; : &quot;Allow&quot;,
 &quot;NotAction&quot; : &quot;iam:DeleteRole&quot;,
 &quot;Action&quot; : [ &quot;dynamodb:ListTables&quot;, &quot;kms:DescribeKey&quot;, &quot;dynamodb:ListStreams&quot; ],
 &quot;Resource&quot; : &quot;*&quot; <span>}</span> <span>}</span></code></pre>
`

/** A AWS escreve a depreciação dentro da descrição, com esta redação. */
const PAGE_DEPRECATED = `
<h1>AWSElasticBeanstalkService</h1>
<p><b>Description</b>: This policy is on a deprecation path. See documentation for guidance. AWS Elastic Beanstalk Service role policy.</p>
<ul>
  <li class="listitem"><p><b>Type</b>: Service role policy </p></li>
  <li class="listitem"><p><b>ARN</b>: <code class="code">arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService</code></p></li>
</ul>
<pre class="programlisting"><code class="json "><span>{</span> &quot;Statement&quot; : [ <span>{</span> &quot;Action&quot; : &quot;s3:GetObject&quot; <span>}</span> ] <span>}</span></code></pre>
`

/** Não pode virar deprecated só porque a seção "Learn more" cita depreciação. */
const PAGE_LEARN_MORE_TRAP = `
<h1>AmazonS3FullAccess</h1>
<p><b>Description</b>: Provides full access to all buckets via the AWS Management Console.</p>
<ul><li class="listitem"><p><b>ARN</b>: <code class="code">arn:aws:iam::aws:policy/AmazonS3FullAccess</code></p></li></ul>
<pre class="programlisting"><code class="json "><span>{</span> &quot;Statement&quot; : [ <span>{</span> &quot;Action&quot; : &quot;s3:*&quot; <span>}</span> ] <span>}</span></code></pre>
<h2>Learn more</h2><p>See the deprecation guide for older policies.</p>
`

const INDEX_FIXTURE = `
<li><p><a href="./AdministratorAccess.html">AdministratorAccess</a></p></li>
<li><p><a href="./AmazonS3ReadOnlyAccess.html">AmazonS3ReadOnlyAccess</a></p></li>
<li><p><a href="./index.html">Index</a></p></li>
<li><p><a href="./about-managed-policy-reference.html">About</a></p></li>
`

let fails = 0
function check(label, actual, expected) {
  const a = JSON.stringify(actual); const e = JSON.stringify(expected)
  if (a === e) console.log(`  ok   ${label}`)
  else { console.log(`  FALHA ${label}\n        esperado: ${e}\n        obtido  : ${a}`); fails++ }
}

console.log('parsePolicy — página normal:')
const p1 = parsePolicy(PAGE_NORMAL, 'AmazonS3ReadOnlyAccess')
check('descrição oficial', p1.description,
  'Provides read only access to all buckets via the AWS Management Console.')
check('type oficial', p1.officialType, 'AWS managed policy')
check('creation time', p1.createdAt, 'February 06, 2015, 18:40 UTC')
check('edited time (dois-pontos dentro do <b>)', p1.editedAt, 'August 10, 2023, 21:31 UTC')
check('arn', p1.arn, 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess')
check('version', p1.version, 'v3 (default)')
check('JSON parseou apesar dos <span> e &quot;', typeof p1.document, 'object')
check('actions extraídas', p1.actions, ['s3:Get*', 's3:List*'])
check('sem erro de parse', p1.parseError, null)

console.log('\nparsePolicy — service-linked role:')
const p2 = parsePolicy(PAGE_SERVICE_ROLE, 'AccessAnalyzerServiceRolePolicy')
check('type oficial', p2.officialType, 'Service-linked role policy')
check('Statement como objeto único', p2.actions,
  ['dynamodb:ListStreams', 'dynamodb:ListTables', 'kms:DescribeKey'])
check('NotAction capturada à parte', p2.notActions, ['iam:DeleteRole'])
check('arn de service-role', p2.arn,
  'arn:aws:iam::aws:policy/aws-service-role/AccessAnalyzerServiceRolePolicy')

console.log('\nparsePolicy — depreciação:')
const p3 = parsePolicy(PAGE_DEPRECATED, 'AWSElasticBeanstalkService')
check('"on a deprecation path" é detectado', p3.deprecated, true)
check('type oficial "Service role policy"', p3.officialType, 'Service role policy')
check('service role pelo ARN /service-role/', classifyType(p3.arn, p3.officialType), 'service-role')
const p4 = parsePolicy(PAGE_LEARN_MORE_TRAP, 'AmazonS3FullAccess')
check('"Learn more" citando depreciação NÃO marca deprecated', p4.deprecated, false)

console.log('\ndiscoverPolicies:')
check('ignora páginas de navegação', discoverPolicies(INDEX_FIXTURE),
  ['AdministratorAccess', 'AmazonS3ReadOnlyAccess'])

console.log('\nclassificação (regressão do bug de categoria):')
check('AccessAnalyzer NÃO cai em Database', classifyCategory(p2.name, p2.actions), 'Security')
check('S3 ReadOnly -> Storage', classifyCategory(p1.name, p1.actions), 'Storage')
check('S3 ReadOnly -> tier ReadOnly', classifyTier(p1.name, p1.actions), 'ReadOnly')
check('AdministratorAccess -> FullAccess', classifyTier('AdministratorAccess', ['*']), 'FullAccess')
check('AdministratorAccess -> privilegiada', isPrivileged('AdministratorAccess', ['*']), true)
check('S3 ReadOnly -> não privilegiada', isPrivileged(p1.name, p1.actions), false)
check('service-role detectado pelo ARN', classifyType(p2.arn, p2.officialType), 'service-role')
check('managed comum', classifyType(p1.arn, p1.officialType), 'managed')

console.log(fails === 0 ? '\nTodos os testes passaram.' : `\n${fails} teste(s) falharam.`)
if (fails) process.exitCode = 1
