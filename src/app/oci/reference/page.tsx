import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { OCI_TIER_META } from '@/data/oci'
import { DATA_SYNC } from '@/data/syncMeta'

const OCI_COLOR = '#C74634'

const VERBS = [
  { verb: 'inspect', tier: 'Inspect' as const, example: 'Allow group Auditors to inspect all-resources in tenancy', desc: 'List resources and view basic metadata. No access to sensitive data or resource contents.' },
  { verb: 'read',    tier: 'Read'    as const, example: 'Allow group Readers to read buckets in compartment Prod', desc: 'Includes inspect plus the ability to view sensitive resource details such as object contents and configuration.' },
  { verb: 'use',     tier: 'Use'     as const, example: 'Allow group Developers to use instances in compartment Dev', desc: 'Includes read plus the ability to work with existing resources (start/stop, send messages, etc.) without creating or deleting at the top level.' },
  { verb: 'manage',  tier: 'Manage'  as const, example: 'Allow group Admins to manage db-systems in compartment Prod', desc: 'Full CRUD — create, update, delete and all use permissions on the resource type.' },
]

const SPECIAL_RESOURCES = [
  { name: 'all-resources',         desc: 'Matches every resource type in the given location. Used for broad admin policies.' },
  { name: 'all-items',             desc: 'Matches all non-identity resources (excludes users, groups, policies).' },
  { name: 'cluster-family',        desc: 'Convenience aggregate for OKE: clusters, node-pools and cluster-related resources.' },
  { name: 'database-family',       desc: 'Aggregate covering db-systems, autonomous-databases and related sub-resources.' },
  { name: 'object-family',         desc: 'Covers both bucket and object resource types together.' },
  { name: 'virtual-network-family', desc: 'Aggregate for VCN, subnets, security lists, route tables, gateways and more.' },
  { name: 'volume-family',         desc: 'Covers volumes, boot-volumes, volume-backups and related resources.' },
  { name: 'devops-family',         desc: 'Aggregate for all DevOps service resources: projects, pipelines, repositories.' },
  { name: 'data-science-family',   desc: 'Covers notebooks, projects, models and model deployments.' },
  { name: 'cloud-guard-family',    desc: 'Covers targets, detectors, responders and problems in Cloud Guard.' },
]

const BEST_PRACTICES = [
  'Use compartments to isolate workloads and apply least-privilege at the compartment level.',
  'Prefer resource-type families (e.g. virtual-network-family) over all-resources to minimize blast radius.',
  'Add where conditions (e.g. request.operation, target.resource.tag) to further restrict permissions.',
  'Use dynamic groups for instance/service principals — avoid storing credentials in compute instances.',
  'Enable OCI Audit and Cloud Guard to detect and alert on anomalous IAM activity.',
  'Rotate API keys and auth tokens regularly; use OCI Vault to store application secrets.',
  'Apply tenancy-level policies sparingly — prefer compartment-scoped policies wherever possible.',
]

export default function OciReferencePage() {
  return (
    <AppShell
      headerTitle="OCI IAM Reference"
      headerSub="Verb model, resource types, policy syntax and best practices"
      headerBack={<Link href="/oci" className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-[#C74634] transition-colors"><ArrowLeft size={14} /> Dashboard</Link>}
    >
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Verb tiers */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-4">OCI Policy Verbs (Tiers)</h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            OCI IAM uses a verb-based access model. Each verb is cumulative — <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">manage</code> includes all permissions of <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">use</code>, which includes <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">read</code>, which includes <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">inspect</code>.
          </p>
          <div className="space-y-3">
            {VERBS.map(({ verb, tier, example, desc }) => {
              const meta = OCI_TIER_META[tier]
              return (
                <div key={verb} className="border border-gray-100 dark:border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[13px] font-bold px-2 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{verb}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</span>
                  </div>
                  <code className="text-[11px] text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 block px-3 py-1.5 rounded">{example}</code>
                </div>
              )
            })}
          </div>
        </div>

        {/* Policy syntax */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-3">Policy Statement Syntax</h2>
          <code className="block text-[12px] font-mono bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-4 rounded-lg border border-gray-200 dark:border-gray-700 leading-relaxed">
            {'Allow <subject> to <verb> <resource-type> in <location> [where <conditions>]'}
          </code>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            {[
              { field: '<subject>', desc: 'group <GroupName>, dynamic-group <Name>, service <ServiceName>, any-user' },
              { field: '<verb>', desc: 'inspect | read | use | manage' },
              { field: '<resource-type>', desc: 'OCI resource type name or aggregate family (e.g. all-resources, virtual-network-family)' },
              { field: '<location>', desc: 'tenancy  or  compartment <CompartmentName>  or  compartment id <OCID>' },
              { field: '<conditions>', desc: 'Optional: request.operation, target.resource.tag, request.networkSource.name, etc.' },
            ].map(({ field, desc }) => (
              <div key={field} className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                <code className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-200">{field}</code>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Special resource type families */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-3">Resource Type Aggregates</h2>
          <div className="grid grid-cols-2 gap-2">
            {SPECIAL_RESOURCES.map(({ name, desc }) => (
              <div key={name} className="flex flex-col gap-0.5 border border-gray-100 dark:border-gray-800 rounded p-3">
                <code className="text-[11px] font-mono text-gray-700 dark:text-gray-300 font-medium">{name}</code>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Best practices */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-3">Boas Práticas</h2>
          <ol className="space-y-2">
            {BEST_PRACTICES.map((bp, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-gray-600 dark:text-gray-400">
                <span className="shrink-0 text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center text-white mt-0.5" style={{ background: OCI_COLOR }}>{i + 1}</span>
                {bp}
              </li>
            ))}
          </ol>
        </div>

        {/* Docs links */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-3">Documentação Oracle</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Getting Started with Policies', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policygetstarted.htm' },
              { label: 'Policy Reference', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/policyreference/policyreference.htm' },
              { label: 'Common Policies', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/commonpolicies.htm' },
              { label: 'Dynamic Groups', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingdynamicgroups.htm' },
              { label: 'Compartments', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/managingcompartments.htm' },
              { label: 'Policy Conditions', url: 'https://docs.oracle.com/en-us/iaas/Content/Identity/Concepts/policyadvancedfeatures.htm' },
            ].map(({ label, url }) => (
              <a key={label} href={url} target="_blank" rel="noopener"
                className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 text-[12px] text-gray-600 dark:text-gray-400 hover:border-[#C74634] hover:text-[#C74634] transition-colors">
                <ExternalLink size={12} className="shrink-0" />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Frescor dos dados */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-[#dde3ec] dark:border-gray-800 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 mb-2">Frescor dos dados (OCI IAM)</h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            Data da última verificação de cada conjunto de dados OCI contra sua fonte oficial. Veja a página{' '}
            <Link href="/info" className="hover:underline" style={{ color: OCI_COLOR }}>Sobre</Link> para o frescor das demais clouds.
          </p>
          <table className="w-full text-[13px] border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Conjunto de dados</th>
                <th className="text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Última verificação</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SYNC.filter(d => d.platform === 'OCI IAM').map((d, i, arr) => (
                <tr key={d.id} className={`${i === arr.length - 1 ? '' : 'border-b border-gray-100 dark:border-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                  <td className="px-4 py-2.5 align-top text-[13px] font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
                  <td className="px-4 py-2.5 align-top text-[13px] text-gray-500 dark:text-gray-400"><code className="font-mono text-[12px]">{d.lastSynced}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pb-2 text-[11px] text-gray-400 dark:text-gray-600">
          OCI IAM · Verb-based access control · Oracle Cloud Infrastructure
        </div>
      </div>
    </AppShell>
  )
}
