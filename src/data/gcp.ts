// ── GCP IAM — Predefined Roles ───────────────────────────────────────────────
// Source: https://cloud.google.com/iam/docs/understanding-roles

export type GcpTier = 'ProjectOwner' | 'Admin' | 'Editor' | 'Operator' | 'Developer' | 'Viewer' | 'Specialized'

export type GcpCategory = 'IAM' | 'Compute' | 'Storage' | 'BigQuery' | 'Kubernetes' | 'Database' | 'Networking' | 'Security' | 'DevOps' | 'Serverless' | 'AI' | 'Analytics' | 'Observability' | 'Billing' | 'Management'

export interface GcpRole {
  slug: string
  name: string
  roleId: string
  description: string
  tier: GcpTier
  category: GcpCategory
  isPrivileged: boolean
  scope: 'project' | 'org' | 'folder' | 'resource'
  privileges: string[]
  permissions?: string[]
}

export interface GcpTierMeta {
  label: string; color: string; bg: string; description: string
}

export const GCP_TIER_META: Record<GcpTier, GcpTierMeta> = {
  ProjectOwner: { label: 'Project Owner', color: '#dc2626', bg: '#dc262618', description: 'Full control over the project and all resources' },
  Admin:        { label: 'Admin',         color: '#ea580c', bg: '#ea580c18', description: 'Administrative control over a service, may include IAM' },
  Editor:       { label: 'Editor',        color: '#ca8a04', bg: '#ca8a0418', description: 'Read and write access to all resources in a service' },
  Operator:     { label: 'Operator',      color: '#0891b2', bg: '#0891b218', description: 'Operational access to manage and run workloads' },
  Developer:    { label: 'Developer',     color: '#7c3aed', bg: '#7c3aed18', description: 'Deploy and manage code and workloads' },
  Viewer:       { label: 'Viewer',        color: '#16a34a', bg: '#16a34a18', description: 'Read-only access to resources' },
  Specialized:  { label: 'Specialized',   color: '#6b7280', bg: '#6b728018', description: 'Narrow-scope role for a specific action or use case' },
}

export const GCP_ROLES: GcpRole[] = [
  // ── Basic / Primitive Roles ───────────────────────────────────────────────────
  {
    slug: 'owner', name: 'Project Owner', roleId: 'roles/owner',
    description: 'Full control of all GCP resources including IAM policies, billing, and all services.',
    tier: 'ProjectOwner', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Full access to all Google Cloud services', 'Manage IAM policies and roles', 'Manage billing', 'Delete projects', 'Invite members'],
    permissions: ['resourcemanager.projects.get', 'resourcemanager.projects.getIamPolicy', 'resourcemanager.projects.setIamPolicy', 'resourcemanager.projects.delete', 'resourcemanager.projects.update', 'billing.accounts.getIamPolicy', 'billing.accounts.setIamPolicy', 'serviceusage.services.enable', 'serviceusage.services.disable', 'iam.roles.list', 'iam.roles.get', 'iam.serviceAccounts.create', 'iam.serviceAccounts.delete'],
  },
  {
    slug: 'editor', name: 'Project Editor', roleId: 'roles/editor',
    description: 'Full edit access to all resources, excluding IAM policy management and billing.',
    tier: 'Editor', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create and modify all resources', 'Read all resources', 'Cannot manage IAM policies', 'Cannot manage billing'],
    permissions: ['resourcemanager.projects.get', 'resourcemanager.projects.update', 'compute.instances.create', 'compute.instances.delete', 'storage.buckets.create', 'storage.buckets.delete', 'bigquery.datasets.create', 'bigquery.jobs.create', 'pubsub.topics.create', 'pubsub.subscriptions.create', 'logging.logEntries.create', 'monitoring.timeSeries.create'],
  },
  {
    slug: 'viewer', name: 'Project Viewer', roleId: 'roles/viewer',
    description: 'Read-only access to all resources. Cannot create, modify, or delete.',
    tier: 'Viewer', category: 'IAM', isPrivileged: false, scope: 'project',
    privileges: ['Read all resources in the project', 'List all services and configurations', 'No write access'],
    permissions: ['resourcemanager.projects.get', 'resourcemanager.projects.list', 'compute.instances.list', 'compute.instances.get', 'storage.buckets.list', 'storage.buckets.get', 'storage.objects.list', 'storage.objects.get', 'bigquery.datasets.get', 'logging.logEntries.list', 'monitoring.timeSeries.list'],
  },

  // ── IAM & Service Accounts ─────────────────────────────────────────────────────
  {
    slug: 'iam-admin', name: 'IAM Admin', roleId: 'roles/iam.admin',
    description: 'Full administrative access to IAM service accounts, roles, and policies.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete service accounts', 'Manage IAM policies on all resources', 'Create and manage custom roles', 'Manage workforce identity pools'],
    permissions: ['iam.serviceAccounts.create', 'iam.serviceAccounts.delete', 'iam.serviceAccounts.get', 'iam.serviceAccounts.list', 'iam.serviceAccounts.update', 'iam.roles.create', 'iam.roles.delete', 'iam.roles.update', 'iam.roles.get', 'iam.roles.list', 'iam.policies.get', 'iam.policies.set', 'resourcemanager.projects.getIamPolicy', 'resourcemanager.projects.setIamPolicy'],
  },
  {
    slug: 'iam-security-admin', name: 'Security Admin', roleId: 'roles/iam.securityAdmin',
    description: 'Can get and set any IAM policy. Used by security teams to audit and configure access.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Get and set IAM policies on all resources', 'Audit all IAM configurations', 'View all security settings'],
    permissions: ['resourcemanager.projects.getIamPolicy', 'resourcemanager.projects.setIamPolicy', 'resourcemanager.organizations.getIamPolicy', 'resourcemanager.organizations.setIamPolicy', 'resourcemanager.folders.getIamPolicy', 'resourcemanager.folders.setIamPolicy', 'iam.serviceAccounts.getIamPolicy', 'iam.serviceAccounts.setIamPolicy', 'iam.roles.list', 'iam.roles.get'],
  },
  {
    slug: 'iam-security-reviewer', name: 'Security Reviewer', roleId: 'roles/iam.securityReviewer',
    description: 'Can get IAM policies and read security configurations. Read-only security auditor.',
    tier: 'Viewer', category: 'IAM', isPrivileged: false, scope: 'project',
    privileges: ['Get IAM policies on all resources', 'View security configurations', 'Audit access controls without modification'],
    permissions: ['resourcemanager.projects.getIamPolicy', 'resourcemanager.organizations.getIamPolicy', 'resourcemanager.folders.getIamPolicy', 'iam.serviceAccounts.getIamPolicy', 'iam.roles.list', 'iam.roles.get', 'iam.serviceAccounts.list', 'iam.serviceAccounts.get'],
  },
  {
    slug: 'iam-service-account-admin', name: 'Service Account Admin', roleId: 'roles/iam.serviceAccountAdmin',
    description: 'Create, update, and delete service accounts and manage their keys.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete service accounts', 'Update service account metadata', 'Manage service account IAM policies', 'Enable and disable service accounts'],
    permissions: ['iam.serviceAccounts.create', 'iam.serviceAccounts.delete', 'iam.serviceAccounts.get', 'iam.serviceAccounts.list', 'iam.serviceAccounts.update', 'iam.serviceAccounts.enable', 'iam.serviceAccounts.disable', 'iam.serviceAccounts.getIamPolicy', 'iam.serviceAccounts.setIamPolicy', 'iam.serviceAccounts.undelete'],
  },
  {
    slug: 'iam-service-account-key-admin', name: 'Service Account Key Admin', roleId: 'roles/iam.serviceAccountKeyAdmin',
    description: 'Create, delete, and rotate service account keys.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'resource',
    privileges: ['Create service account keys', 'Delete service account keys', 'List service account keys'],
    permissions: ['iam.serviceAccountKeys.create', 'iam.serviceAccountKeys.delete', 'iam.serviceAccountKeys.get', 'iam.serviceAccountKeys.list', 'iam.serviceAccountKeys.enable', 'iam.serviceAccountKeys.disable'],
  },
  {
    slug: 'iam-service-account-token-creator', name: 'Service Account Token Creator', roleId: 'roles/iam.serviceAccountTokenCreator',
    description: 'Impersonate service accounts to create short-lived credentials and sign JWTs.',
    tier: 'Specialized', category: 'IAM', isPrivileged: true, scope: 'resource',
    privileges: ['Create access tokens for service accounts', 'Sign blobs and JWTs using service account keys', 'Impersonate service accounts'],
    permissions: ['iam.serviceAccounts.getAccessToken', 'iam.serviceAccounts.getOpenIdToken', 'iam.serviceAccounts.signBlob', 'iam.serviceAccounts.signJwt', 'iam.serviceAccounts.implicitDelegation', 'iam.serviceAccounts.get', 'iam.serviceAccounts.list'],
  },
  {
    slug: 'iam-service-account-user', name: 'Service Account User', roleId: 'roles/iam.serviceAccountUser',
    description: 'Run operations as the service account. Required to deploy workloads that run as a SA.',
    tier: 'Specialized', category: 'IAM', isPrivileged: false, scope: 'resource',
    privileges: ['Attach service account to a resource', 'Run VMs and jobs as the service account'],
    permissions: ['iam.serviceAccounts.actAs', 'iam.serviceAccounts.get', 'iam.serviceAccounts.list'],
  },
  {
    slug: 'iam-organization-role-admin', name: 'Organization Role Admin', roleId: 'roles/iam.organizationRoleAdmin',
    description: 'Full control of all custom roles defined in the organization.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'org',
    privileges: ['Create, update, and delete custom roles at org level', 'List and view all custom roles'],
    permissions: ['iam.roles.create', 'iam.roles.delete', 'iam.roles.get', 'iam.roles.list', 'iam.roles.update', 'iam.roles.undelete', 'resourcemanager.organizations.getIamPolicy', 'resourcemanager.projects.getIamPolicy'],
  },
  {
    slug: 'iam-role-admin', name: 'Role Admin', roleId: 'roles/iam.roleAdmin',
    description: 'Full control of all custom roles defined in the project.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create, update, and delete custom roles at project level', 'List all roles'],
    permissions: ['iam.roles.create', 'iam.roles.delete', 'iam.roles.get', 'iam.roles.list', 'iam.roles.update', 'iam.roles.undelete', 'resourcemanager.projects.getIamPolicy'],
  },
  {
    slug: 'iam-role-viewer', name: 'Role Viewer', roleId: 'roles/iam.roleViewer',
    description: 'Read-only access to all custom and predefined IAM roles.',
    tier: 'Viewer', category: 'IAM', isPrivileged: false, scope: 'project',
    privileges: ['List and view all IAM roles', 'View role metadata and permissions'],
    permissions: ['iam.roles.get', 'iam.roles.list', 'resourcemanager.projects.get', 'resourcemanager.projects.getIamPolicy'],
  },
  {
    slug: 'iam-workload-identity-pool-admin', name: 'Workload Identity Pool Admin', roleId: 'roles/iam.workloadIdentityPoolAdmin',
    description: 'Full control over Workload Identity Pools for federating external identities.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create and manage workload identity pools', 'Create and manage pool providers', 'Configure attribute mappings and conditions'],
    permissions: ['iam.workloadIdentityPools.create', 'iam.workloadIdentityPools.delete', 'iam.workloadIdentityPools.get', 'iam.workloadIdentityPools.list', 'iam.workloadIdentityPools.update', 'iam.workloadIdentityPoolProviders.create', 'iam.workloadIdentityPoolProviders.delete', 'iam.workloadIdentityPoolProviders.get', 'iam.workloadIdentityPoolProviders.list', 'iam.workloadIdentityPoolProviders.update'],
  },

  // ── Resource Manager ───────────────────────────────────────────────────────────
  {
    slug: 'resourcemanager-org-admin', name: 'Organization Admin', roleId: 'roles/resourcemanager.organizationAdmin',
    description: 'Full control over an organization resource including IAM and folder management.',
    tier: 'Admin', category: 'Management', isPrivileged: true, scope: 'org',
    privileges: ['Set IAM policies on the organization', 'View organization metadata', 'Create and manage folders and projects', 'Delete the organization'],
    permissions: ['resourcemanager.organizations.get', 'resourcemanager.organizations.getIamPolicy', 'resourcemanager.organizations.setIamPolicy', 'resourcemanager.folders.create', 'resourcemanager.folders.delete', 'resourcemanager.folders.get', 'resourcemanager.folders.list', 'resourcemanager.projects.create', 'resourcemanager.projects.delete', 'resourcemanager.projects.get', 'resourcemanager.projects.list', 'resourcemanager.projects.move'],
  },
  {
    slug: 'resourcemanager-folder-admin', name: 'Folder Admin', roleId: 'roles/resourcemanager.folderAdmin',
    description: 'Full control over a folder, including creating subfolders and projects.',
    tier: 'Admin', category: 'Management', isPrivileged: true, scope: 'folder',
    privileges: ['Create, update, delete folders', 'Manage IAM policies on folders', 'Move folders and projects'],
  },
  {
    slug: 'resourcemanager-folder-viewer', name: 'Folder Viewer', roleId: 'roles/resourcemanager.folderViewer',
    description: 'Read-only access to folder metadata. Can view folder hierarchy and list projects.',
    tier: 'Viewer', category: 'Management', isPrivileged: false, scope: 'folder',
    privileges: ['View folder metadata', 'List subfolders and projects', 'View IAM policies on folders'],
  },
  {
    slug: 'resourcemanager-project-creator', name: 'Project Creator', roleId: 'roles/resourcemanager.projectCreator',
    description: 'Can create new projects within an organization or folder.',
    tier: 'Specialized', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['Create new GCP projects'],
  },
  {
    slug: 'resourcemanager-project-deleter', name: 'Project Deleter', roleId: 'roles/resourcemanager.projectDeleter',
    description: 'Can delete projects within an organization or folder.',
    tier: 'Specialized', category: 'Management', isPrivileged: true, scope: 'org',
    privileges: ['Delete GCP projects'],
  },
  {
    slug: 'resourcemanager-tag-admin', name: 'Tag Administrator', roleId: 'roles/resourcemanager.tagAdmin',
    description: 'Full control over tag keys, tag values, and tag bindings across the organization.',
    tier: 'Admin', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['Create and delete tag keys and values', 'Bind and unbind tags to resources', 'Manage IAM policies on tags'],
  },
  {
    slug: 'resourcemanager-tag-viewer', name: 'Tag Viewer', roleId: 'roles/resourcemanager.tagViewer',
    description: 'Read-only access to all tag keys, tag values, and tag bindings.',
    tier: 'Viewer', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['List and view tag keys and values', 'View tag bindings on resources'],
  },

  // ── Compute Engine ───────────────────────────────────────────────────
  {
    slug: 'compute-admin', name: 'Compute Admin', roleId: 'roles/compute.admin',
    description: 'Full control of all Compute Engine resources including VMs, disks, networks, and images.',
    tier: 'Admin', category: 'Compute', isPrivileged: true, scope: 'project',
    privileges: ['Create, update, delete VMs', 'Manage disks and snapshots', 'Configure networks and firewalls', 'Manage images and machine types', 'Set IAM policies on Compute resources'],
  },
  {
    slug: 'compute-instance-admin-v1', name: 'Compute Instance Admin (v1)', roleId: 'roles/compute.instanceAdmin.v1',
    description: 'Full control of Compute Engine instances, instance groups, and related configurations.',
    tier: 'Operator', category: 'Compute', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete VM instances', 'Start and stop instances', 'Modify instance configurations', 'Manage instance groups and templates', 'Attach service accounts to instances'],
  },
  {
    slug: 'compute-network-admin', name: 'Compute Network Admin', roleId: 'roles/compute.networkAdmin',
    description: 'Full control of Compute Engine networking resources, excluding firewall rules.',
    tier: 'Admin', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage VPCs, subnets, and routes', 'Manage load balancers and forwarding rules', 'Configure VPN and Cloud Interconnect', 'Read firewall rules'],
  },
  {
    slug: 'compute-network-viewer', name: 'Compute Network Viewer', roleId: 'roles/compute.networkViewer',
    description: 'Read-only access to all Compute Engine networking resources.',
    tier: 'Viewer', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['View VPCs, subnets, routes', 'View firewall rules', 'View load balancers', 'View VPN and interconnect configurations'],
  },
  {
    slug: 'compute-security-admin', name: 'Compute Security Admin', roleId: 'roles/compute.securityAdmin',
    description: 'Full control of Compute Engine security resources including firewalls and SSL policies.',
    tier: 'Admin', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage firewall rules', 'Manage SSL certificates and policies', 'Configure Cloud Armor security policies', 'Manage IAP settings'],
  },
  {
    slug: 'compute-storage-admin', name: 'Compute Storage Admin', roleId: 'roles/compute.storageAdmin',
    description: 'Full control of Compute Engine storage resources: disks, images, and snapshots.',
    tier: 'Admin', category: 'Storage', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete persistent disks', 'Create and manage disk snapshots', 'Create and manage custom images'],
  },
  {
    slug: 'compute-viewer', name: 'Compute Viewer', roleId: 'roles/compute.viewer',
    description: 'Read-only access to all Compute Engine resources. Cannot read data stored on disks.',
    tier: 'Viewer', category: 'Compute', isPrivileged: false, scope: 'project',
    privileges: ['List and view all Compute resources', 'View instance configurations', 'View network and storage configurations'],
  },
  {
    slug: 'compute-load-balancer-admin', name: 'Compute Load Balancer Admin', roleId: 'roles/compute.loadBalancerAdmin',
    description: 'Create and manage load balancers and associated health checks and backend services.',
    tier: 'Operator', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage load balancers', 'Configure backend services and health checks', 'Manage forwarding rules and URL maps', 'Configure SSL certificates on LBs'],
  },
  {
    slug: 'compute-os-admin-login', name: 'Compute OS Admin Login', roleId: 'roles/compute.osAdminLogin',
    description: 'Log in to a Compute Engine instance as an administrator via OS Login with sudo.',
    tier: 'Specialized', category: 'Compute', isPrivileged: true, scope: 'resource',
    privileges: ['SSH into VM instances', 'Sudo/root access within the instance', 'Manage OS-level configurations'],
  },
  {
    slug: 'compute-os-login', name: 'Compute OS Login', roleId: 'roles/compute.osLogin',
    description: 'Log in to a Compute Engine instance as a non-administrator user via OS Login.',
    tier: 'Specialized', category: 'Compute', isPrivileged: false, scope: 'resource',
    privileges: ['SSH into VM instances', 'Standard user access without sudo', 'Read filesystem and run processes as user'],
  },
  {
    slug: 'compute-image-user', name: 'Compute Image User', roleId: 'roles/compute.imageUser',
    description: 'List and read images. Required to use a custom image when creating VMs.',
    tier: 'Specialized', category: 'Compute', isPrivileged: false, scope: 'resource',
    privileges: ['List and read custom images', 'Use images to create new VM instances'],
  },
  {
    slug: 'compute-public-ip-admin', name: 'Compute Public IP Admin', roleId: 'roles/compute.publicIpAdmin',
    description: 'Reserve and manage external IP addresses in Compute Engine.',
    tier: 'Specialized', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Reserve external IP addresses', 'Release IP addresses', 'View IP address usage'],
  },
  {
    slug: 'compute-security-policies-admin', name: 'Compute Security Policies Admin', roleId: 'roles/compute.securityPoliciesAdmin',
    description: 'Create and manage Cloud Armor security policies for DDoS protection and WAF.',
    tier: 'Admin', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and modify Cloud Armor security policies', 'Configure WAF rules and rate limiting', 'Manage adaptive protection settings', 'Associate policies with backends'],
  },

  // ── Cloud Storage ───────────────────────────────────────────────────
  {
    slug: 'storage-admin', name: 'Storage Admin', roleId: 'roles/storage.admin',
    description: 'Full control of Cloud Storage: buckets, objects, and IAM policies.',
    tier: 'Admin', category: 'Storage', isPrivileged: true, scope: 'project',
    privileges: ['Create, update, and delete buckets', 'Manage objects in all buckets', 'Set IAM policies on buckets', 'Configure bucket retention and lifecycle', 'Manage HMAC keys'],
  },
  {
    slug: 'storage-object-admin', name: 'Storage Object Admin', roleId: 'roles/storage.objectAdmin',
    description: 'Full control of Cloud Storage objects including reading, writing, and deleting.',
    tier: 'Editor', category: 'Storage', isPrivileged: false, scope: 'resource',
    privileges: ['Read, write, and delete objects', 'List objects in buckets', 'Set object metadata and ACLs'],
  },
  {
    slug: 'storage-object-creator', name: 'Storage Object Creator', roleId: 'roles/storage.objectCreator',
    description: 'Create new objects in Cloud Storage buckets. Cannot list or delete existing objects.',
    tier: 'Specialized', category: 'Storage', isPrivileged: false, scope: 'resource',
    privileges: ['Create new objects in a bucket', 'Cannot list, read, delete, or overwrite existing objects'],
  },
  {
    slug: 'storage-object-viewer', name: 'Storage Object Viewer', roleId: 'roles/storage.objectViewer',
    description: 'Read-only access to Cloud Storage objects and their metadata.',
    tier: 'Viewer', category: 'Storage', isPrivileged: false, scope: 'resource',
    privileges: ['Read objects from buckets', 'List objects in buckets', 'View object metadata'],
  },
  {
    slug: 'storage-hmac-key-admin', name: 'Storage HMAC Key Admin', roleId: 'roles/storage.hmacKeyAdmin',
    description: 'Create, list, update, and delete HMAC keys for Cloud Storage service accounts.',
    tier: 'Specialized', category: 'Storage', isPrivileged: false, scope: 'project',
    privileges: ['Create HMAC keys for service accounts', 'List and view HMAC key metadata', 'Delete HMAC keys'],
  },

  // ── BigQuery ────────────────────────────────────────────────────────
  {
    slug: 'bigquery-admin', name: 'BigQuery Admin', roleId: 'roles/bigquery.admin',
    description: 'Full control of all BigQuery resources. Manage datasets, tables, jobs, and IAM.',
    tier: 'Admin', category: 'BigQuery', isPrivileged: true, scope: 'project',
    privileges: ['Create, update, and delete datasets and tables', 'Run and cancel all jobs', 'Manage reservations and capacity commitments', 'Set IAM policies on datasets', 'View all query results'],
  },
  {
    slug: 'bigquery-data-editor', name: 'BigQuery Data Editor', roleId: 'roles/bigquery.dataEditor',
    description: 'Read, create, and delete datasets and tables.',
    tier: 'Editor', category: 'BigQuery', isPrivileged: false, scope: 'resource',
    privileges: ['Create and delete datasets and tables', 'Update table schemas', 'Read table data', 'Create and delete table rows'],
  },
  {
    slug: 'bigquery-data-owner', name: 'BigQuery Data Owner', roleId: 'roles/bigquery.dataOwner',
    description: 'Full control of datasets, including managing IAM policies.',
    tier: 'Admin', category: 'BigQuery', isPrivileged: false, scope: 'resource',
    privileges: ['Full control of datasets', 'Set IAM policies on datasets', 'Create and delete tables', 'Read and write all table data'],
  },
  {
    slug: 'bigquery-data-viewer', name: 'BigQuery Data Viewer', roleId: 'roles/bigquery.dataViewer',
    description: 'Read-only access to BigQuery datasets and tables.',
    tier: 'Viewer', category: 'BigQuery', isPrivileged: false, scope: 'resource',
    privileges: ['List and view datasets and tables', 'Read table data', 'View table schemas and metadata'],
  },
  {
    slug: 'bigquery-filtered-data-viewer', name: 'BigQuery Filtered Data Viewer', roleId: 'roles/bigquery.filteredDataViewer',
    description: 'Read data from BigQuery tables with row-level access policies applied.',
    tier: 'Viewer', category: 'BigQuery', isPrivileged: false, scope: 'resource',
    privileges: ['Read filtered row-level secured table data', 'View accessible rows based on IAM conditions'],
  },
  {
    slug: 'bigquery-job-user', name: 'BigQuery Job User', roleId: 'roles/bigquery.jobUser',
    description: 'Run BigQuery jobs including queries, loads, and exports.',
    tier: 'Specialized', category: 'BigQuery', isPrivileged: false, scope: 'project',
    privileges: ['Run BigQuery query jobs', 'Run load and export jobs', 'View own job results'],
  },
  {
    slug: 'bigquery-metadata-viewer', name: 'BigQuery Metadata Viewer', roleId: 'roles/bigquery.metadataViewer',
    description: 'List and view dataset and table metadata without reading actual data.',
    tier: 'Viewer', category: 'BigQuery', isPrivileged: false, scope: 'resource',
    privileges: ['List datasets and tables', 'View schema and metadata', 'View table statistics without data access'],
  },
  {
    slug: 'bigquery-user', name: 'BigQuery User', roleId: 'roles/bigquery.user',
    description: 'Run jobs, list datasets, read metadata. Typical role for data analysts.',
    tier: 'Operator', category: 'BigQuery', isPrivileged: false, scope: 'project',
    privileges: ['Run BigQuery jobs', 'List all datasets in project', 'View all public datasets', 'Read dataset metadata'],
  },
  {
    slug: 'bigquery-read-session-user', name: 'BigQuery Read Session User', roleId: 'roles/bigquery.readSessionUser',
    description: 'Create and use read sessions for high-throughput BigQuery Storage API reads.',
    tier: 'Specialized', category: 'BigQuery', isPrivileged: false, scope: 'project',
    privileges: ['Create read sessions via BigQuery Storage API', 'Read data from tables using storage API'],
  },
  {
    slug: 'bigquery-connection-admin', name: 'BigQuery Connection Admin', roleId: 'roles/bigquery.connectionAdmin',
    description: 'Create, update, and delete BigQuery connections to external data sources.',
    tier: 'Admin', category: 'BigQuery', isPrivileged: false, scope: 'project',
    privileges: ['Create, update, delete BigQuery connections', 'Set connection IAM policies', 'Use connections in queries'],
  },

  // ── Kubernetes Engine (GKE) ───────────────────────────────────────────
  {
    slug: 'container-admin', name: 'Kubernetes Engine Admin', roleId: 'roles/container.admin',
    description: 'Full access to all Kubernetes Engine resources, including cluster IAM management.',
    tier: 'Admin', category: 'Kubernetes', isPrivileged: true, scope: 'project',
    privileges: ['Create, update, and delete GKE clusters', 'Manage Kubernetes RBAC', 'Access Kubernetes API', 'Set IAM policies on clusters', 'Manage node pools and autoscaling'],
  },
  {
    slug: 'container-cluster-admin', name: 'Kubernetes Engine Cluster Admin', roleId: 'roles/container.clusterAdmin',
    description: 'Manage Kubernetes clusters and node pools, without accessing deployed workloads.',
    tier: 'Admin', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete GKE clusters', 'Configure node pools and autoscaling', 'Upgrade cluster versions', 'Manage cluster networking'],
  },
  {
    slug: 'container-developer', name: 'Kubernetes Engine Developer', roleId: 'roles/container.developer',
    description: 'Full access to Kubernetes objects inside clusters. Deploy and manage workloads.',
    tier: 'Developer', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['Deploy and manage workloads', 'Access Kubernetes API for namespaced resources', 'Manage Kubernetes secrets and configmaps'],
  },
  {
    slug: 'container-cluster-viewer', name: 'Kubernetes Engine Cluster Viewer', roleId: 'roles/container.clusterViewer',
    description: 'Read-only access to GKE cluster metadata. Cannot access Kubernetes objects inside the cluster.',
    tier: 'Viewer', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['View cluster metadata and configuration', 'List clusters and node pools', 'View cluster networking settings'],
  },
  {
    slug: 'container-viewer', name: 'Kubernetes Engine Viewer', roleId: 'roles/container.viewer',
    description: 'Read-only access to all Kubernetes Engine resources and cluster configuration.',
    tier: 'Viewer', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['View all GKE cluster and workload configurations', 'Read cluster metadata', 'View node pool details'],
  },
  {
    slug: 'container-node-service-account', name: 'Kubernetes Engine Node Service Account', roleId: 'roles/container.nodeServiceAccount',
    description: 'Minimum permissions for a GKE node pool service account to function correctly.',
    tier: 'Specialized', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['Pull container images from Artifact Registry', 'Write logs and metrics from nodes', 'Report node health and status'],
  },
  {
    slug: 'container-host-service-agent-user', name: 'Kubernetes Engine Host Service Agent User', roleId: 'roles/container.hostServiceAgentUser',
    description: 'Allows GKE service accounts in a service project to use shared VPC networks.',
    tier: 'Specialized', category: 'Kubernetes', isPrivileged: false, scope: 'project',
    privileges: ['Use shared VPC networks from a host project', 'Configure networking for GKE clusters in service projects'],
  },

  // ── Cloud SQL ─────────────────────────────────────────────────────────
  {
    slug: 'cloudsql-admin', name: 'Cloud SQL Admin', roleId: 'roles/cloudsql.admin',
    description: 'Full control of all Cloud SQL resources including creating and deleting instances.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete Cloud SQL instances', 'Manage databases and users', 'Configure backups and maintenance', 'Set IAM policies on instances', 'Export and import data'],
  },
  {
    slug: 'cloudsql-editor', name: 'Cloud SQL Editor', roleId: 'roles/cloudsql.editor',
    description: 'Full access to manage Cloud SQL instances excluding delete and IAM policy changes.',
    tier: 'Editor', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Manage databases and users', 'Configure backups and high availability', 'Connect to instances', 'Import and export data', 'Cannot delete instances'],
  },
  {
    slug: 'cloudsql-viewer', name: 'Cloud SQL Viewer', roleId: 'roles/cloudsql.viewer',
    description: 'Read-only access to view Cloud SQL instance configurations and metadata.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View instance configurations', 'List databases and users', 'View backup and replication settings'],
  },
  {
    slug: 'cloudsql-client', name: 'Cloud SQL Client', roleId: 'roles/cloudsql.client',
    description: 'Connect to Cloud SQL instances via Cloud SQL Auth Proxy for application connections.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Connect to Cloud SQL instances via auth proxy', 'Authenticate database connections'],
  },
  {
    slug: 'cloudsql-instance-user', name: 'Cloud SQL Instance User', roleId: 'roles/cloudsql.instanceUser',
    description: 'Log in to a Cloud SQL for PostgreSQL instance using IAM-based authentication.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Authenticate to Cloud SQL PostgreSQL using IAM', 'Log in as a database user'],
  },

  // ── Cloud Spanner ─────────────────────────────────────────────────────
  {
    slug: 'spanner-admin', name: 'Cloud Spanner Admin', roleId: 'roles/spanner.admin',
    description: 'Full control of all Cloud Spanner resources including instances, databases, and IAM.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete Spanner instances', 'Manage databases and schemas', 'Read and write all data', 'Set IAM policies', 'Manage backups and restore'],
  },
  {
    slug: 'spanner-database-admin', name: 'Cloud Spanner Database Admin', roleId: 'roles/spanner.databaseAdmin',
    description: 'Manage Cloud Spanner databases and schemas. Create tables, run DDL, and read data.',
    tier: 'Admin', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Create and delete databases', 'Modify database schemas via DDL', 'Read and write all data in databases', 'Manage database IAM policies'],
  },
  {
    slug: 'spanner-database-reader', name: 'Cloud Spanner Database Reader', roleId: 'roles/spanner.databaseReader',
    description: 'Read data and metadata from Cloud Spanner databases with read-only queries.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Execute read-only SQL queries', 'Read all data in tables', 'View database schema and metadata'],
  },
  {
    slug: 'spanner-database-user', name: 'Cloud Spanner Database User', roleId: 'roles/spanner.databaseUser',
    description: 'Execute read and write queries on Cloud Spanner databases.',
    tier: 'Operator', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Execute read/write SQL queries', 'Read and write table data', 'Begin and commit transactions'],
  },
  {
    slug: 'spanner-viewer', name: 'Cloud Spanner Viewer', roleId: 'roles/spanner.viewer',
    description: 'Read-only access to Cloud Spanner instance and database metadata. Cannot read table data.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View instance and database configurations', 'List instances and databases', 'View instance metrics without data access'],
  },
  {
    slug: 'spanner-backup-admin', name: 'Cloud Spanner Backup Admin', roleId: 'roles/spanner.backupAdmin',
    description: 'Create, manage, and delete Spanner backups and restore databases.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Create and delete backups', 'Restore databases from backups', 'List and view backup details'],
  },

  // ── Cloud Datastore / Firestore ───────────────────────────────────────
  {
    slug: 'datastore-owner', name: 'Cloud Datastore Owner', roleId: 'roles/datastore.owner',
    description: 'Full access to Cloud Datastore and Firestore in Datastore mode, including IAM.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Read and write all entities', 'Manage indexes and queries', 'Import and export data', 'Set IAM policies'],
  },
  {
    slug: 'datastore-user', name: 'Cloud Datastore User', roleId: 'roles/datastore.user',
    description: 'Read and write entities in Cloud Datastore and Firestore in Datastore mode.',
    tier: 'Editor', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Read and write entities', 'Run queries and transactions', 'Allocate entity IDs'],
  },
  {
    slug: 'datastore-viewer', name: 'Cloud Datastore Viewer', roleId: 'roles/datastore.viewer',
    description: 'Read-only access to Cloud Datastore entities and metadata.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Read entities and run read-only queries', 'View index configurations'],
  },
  {
    slug: 'datastore-import-export-admin', name: 'Cloud Datastore Import Export Admin', roleId: 'roles/datastore.importExportAdmin',
    description: 'Initiate import and export operations for Cloud Datastore.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Start and manage import jobs', 'Start and manage export jobs to Cloud Storage'],
  },
  {
    slug: 'datastore-index-admin', name: 'Cloud Datastore Index Admin', roleId: 'roles/datastore.indexAdmin',
    description: 'Create, update, and delete Cloud Datastore indexes.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete composite indexes', 'View index configurations'],
  },

  // ── Firebase ───────────────────────────────────────────────────────────
  {
    slug: 'firebase-admin', name: 'Firebase Admin', roleId: 'roles/firebase.admin',
    description: 'Full administrative access to all Firebase services and underlying GCP resources.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Manage all Firebase services', 'Configure Firebase project settings', 'Manage Firebase Authentication and Firestore', 'Set IAM policies'],
  },
  {
    slug: 'firebase-viewer', name: 'Firebase Viewer', roleId: 'roles/firebase.viewer',
    description: 'Read-only access to all Firebase services and configurations.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View all Firebase configurations', 'Read Firebase Realtime Database', 'View Firestore data', 'Read Firebase Analytics'],
  },
  {
    slug: 'firebase-develop-admin', name: 'Firebase Develop Admin', roleId: 'roles/firebase.developAdmin',
    description: 'Full access to Firebase development services: Auth, Firestore, Storage, and Functions.',
    tier: 'Admin', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Manage Firebase Authentication', 'Manage Firestore databases', 'Deploy Cloud Functions for Firebase', 'Manage Firebase Storage and Hosting'],
  },
  {
    slug: 'firebase-grow-admin', name: 'Firebase Growth Admin', roleId: 'roles/firebase.growthAdmin',
    description: 'Full access to Firebase growth services: Analytics, Cloud Messaging, and Remote Config.',
    tier: 'Admin', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['Manage Firebase Analytics', 'Send Firebase Cloud Messaging notifications', 'Manage Remote Config parameters', 'Manage Dynamic Links'],
  },

  // ── Pub/Sub ────────────────────────────────────────────────────────────
  {
    slug: 'pubsub-admin', name: 'Pub/Sub Admin', roleId: 'roles/pubsub.admin',
    description: 'Full control of all Pub/Sub resources: topics, subscriptions, snapshots, and schemas.',
    tier: 'Admin', category: 'Analytics', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete topics and subscriptions', 'Publish and consume messages', 'Set IAM policies on topics and subscriptions', 'Manage schemas and snapshots'],
  },
  {
    slug: 'pubsub-editor', name: 'Pub/Sub Editor', roleId: 'roles/pubsub.editor',
    description: 'Create and manage Pub/Sub topics and subscriptions, publish and consume messages.',
    tier: 'Editor', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete topics and subscriptions', 'Publish messages to topics', 'Consume messages from subscriptions', 'Manage snapshots'],
  },
  {
    slug: 'pubsub-publisher', name: 'Pub/Sub Publisher', roleId: 'roles/pubsub.publisher',
    description: 'Publish messages to Pub/Sub topics. Cannot create/delete topics or manage subscriptions.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'resource',
    privileges: ['Publish messages to a topic', 'View topic metadata'],
  },
  {
    slug: 'pubsub-subscriber', name: 'Pub/Sub Subscriber', roleId: 'roles/pubsub.subscriber',
    description: 'Consume messages from Pub/Sub subscriptions and acknowledge message delivery.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'resource',
    privileges: ['Pull messages from subscriptions', 'Acknowledge message delivery', 'Modify message acknowledgment deadlines', 'View subscription metadata'],
  },
  {
    slug: 'pubsub-viewer', name: 'Pub/Sub Viewer', roleId: 'roles/pubsub.viewer',
    description: 'Read-only access to Pub/Sub topic and subscription configurations.',
    tier: 'Viewer', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['List topics and subscriptions', 'View topic and subscription metadata', 'View schema configurations'],
  },
  {
    slug: 'pubsub-schema-editor', name: 'Pub/Sub Schema Editor', roleId: 'roles/pubsub.schemaEditor',
    description: 'Create, update, delete, and validate Pub/Sub schemas.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete schemas', 'Validate schema definitions', 'List and view schemas'],
  },

  // ── Cloud Functions ────────────────────────────────────────────────────
  {
    slug: 'cloudfunctions-admin', name: 'Cloud Functions Admin', roleId: 'roles/cloudfunctions.admin',
    description: 'Full access to Cloud Functions. Create, update, delete functions and manage IAM.',
    tier: 'Admin', category: 'Serverless', isPrivileged: true, scope: 'project',
    privileges: ['Deploy and delete Cloud Functions', 'Invoke functions', 'Set IAM policies on functions', 'View function logs and metrics', 'Manage function secrets and environment variables'],
  },
  {
    slug: 'cloudfunctions-developer', name: 'Cloud Functions Developer', roleId: 'roles/cloudfunctions.developer',
    description: 'Deploy and manage Cloud Functions. Cannot set IAM policies on functions.',
    tier: 'Developer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Deploy and update functions', 'Delete functions', 'Invoke functions', 'View function logs', 'Manage function configurations'],
  },
  {
    slug: 'cloudfunctions-invoker', name: 'Cloud Functions Invoker', roleId: 'roles/cloudfunctions.invoker',
    description: 'Invoke HTTP-triggered Cloud Functions. Cannot deploy or manage function configurations.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Invoke an HTTP Cloud Function', 'Cannot deploy or configure functions'],
  },
  {
    slug: 'cloudfunctions-viewer', name: 'Cloud Functions Viewer', roleId: 'roles/cloudfunctions.viewer',
    description: 'Read-only access to Cloud Functions configurations and metadata.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['View function configurations and source', 'List all functions in a project', 'View function environment variables'],
  },

  // ── Cloud Run ──────────────────────────────────────────────────────────
  {
    slug: 'run-admin', name: 'Cloud Run Admin', roleId: 'roles/run.admin',
    description: 'Full access to Cloud Run services and jobs, including IAM management.',
    tier: 'Admin', category: 'Serverless', isPrivileged: true, scope: 'project',
    privileges: ['Deploy and delete Cloud Run services and jobs', 'Manage traffic splitting and revisions', 'Set IAM policies on services', 'View logs and metrics', 'Configure secrets and environment variables'],
  },
  {
    slug: 'run-developer', name: 'Cloud Run Developer', roleId: 'roles/run.developer',
    description: 'Deploy and manage Cloud Run services and jobs. Cannot modify IAM policies.',
    tier: 'Developer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Deploy new service revisions', 'Create and run jobs', 'Manage traffic configuration', 'View service configurations and logs'],
  },
  {
    slug: 'run-invoker', name: 'Cloud Run Invoker', roleId: 'roles/run.invoker',
    description: 'Invoke authenticated Cloud Run services via Identity Token authentication.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Send HTTP requests to a Cloud Run service', 'Authenticate using Identity Tokens'],
  },
  {
    slug: 'run-viewer', name: 'Cloud Run Viewer', roleId: 'roles/run.viewer',
    description: 'Read-only access to Cloud Run service configurations and metadata.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['View service and revision configurations', 'List all Cloud Run services and jobs', 'View traffic configurations'],
  },
  {
    slug: 'run-source-developer', name: 'Cloud Run Source Developer', roleId: 'roles/run.sourceDeveloper',
    description: 'Build and deploy Cloud Run services from source code using Cloud Build.',
    tier: 'Developer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Deploy Cloud Run services from source', 'Trigger Cloud Build for source deployments', 'Manage Artifact Registry images for Cloud Run'],
  },

  // ── App Engine ─────────────────────────────────────────────────────────
  {
    slug: 'appengine-app-admin', name: 'App Engine Admin', roleId: 'roles/appengine.appAdmin',
    description: 'Full access to App Engine application configuration and settings.',
    tier: 'Admin', category: 'Serverless', isPrivileged: true, scope: 'project',
    privileges: ['Modify App Engine application settings', 'Deploy to App Engine', 'Manage services, versions, and instances', 'Configure traffic splitting', 'Manage firewall rules'],
  },
  {
    slug: 'appengine-app-creator', name: 'App Engine App Creator', roleId: 'roles/appengine.appCreator',
    description: 'Create the App Engine application for a project.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create the App Engine application resource for a project'],
  },
  {
    slug: 'appengine-app-viewer', name: 'App Engine App Viewer', roleId: 'roles/appengine.appViewer',
    description: 'View App Engine application settings and deployed versions.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['View App Engine application configuration', 'List services and versions', 'View instance details'],
  },
  {
    slug: 'appengine-code-viewer', name: 'App Engine Code Viewer', roleId: 'roles/appengine.codeViewer',
    description: 'View App Engine settings and download source code of deployed versions.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['View all App Engine configurations', 'Download deployed application source code'],
  },
  {
    slug: 'appengine-deployer', name: 'App Engine Deployer', roleId: 'roles/appengine.deployer',
    description: 'Deploy new versions to App Engine. Cannot modify traffic or delete existing versions.',
    tier: 'Developer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Deploy new App Engine versions', 'View existing versions and configurations', 'Cannot route traffic or delete versions'],
  },
  {
    slug: 'appengine-service-admin', name: 'App Engine Service Admin', roleId: 'roles/appengine.serviceAdmin',
    description: 'Manage App Engine service configurations and traffic routing without deploying new code.',
    tier: 'Operator', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Start and stop App Engine versions', 'Configure traffic splitting', 'Adjust instance scaling', 'Cannot deploy new code'],
  },

  // ── Cloud Build ────────────────────────────────────────────────────────
  {
    slug: 'cloudbuild-builds-editor', name: 'Cloud Build Editor', roleId: 'roles/cloudbuild.builds.editor',
    description: 'Create and manage Cloud Build builds and triggers.',
    tier: 'Editor', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Create and cancel builds', 'Create and manage build triggers', 'View build history and logs'],
  },
  {
    slug: 'cloudbuild-builds-builder', name: 'Cloud Build Builder', roleId: 'roles/cloudbuild.builds.builder',
    description: 'Service account role used by Cloud Build to deploy to other services during builds.',
    tier: 'Specialized', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Run Cloud Build steps', 'Access Google Cloud services as part of a build', 'Pull images from Artifact Registry', 'Deploy to Cloud Run and App Engine'],
  },
  {
    slug: 'cloudbuild-builds-viewer', name: 'Cloud Build Viewer', roleId: 'roles/cloudbuild.builds.viewer',
    description: 'Read-only access to Cloud Build builds, triggers, and logs.',
    tier: 'Viewer', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['View build history and status', 'View build triggers', 'Read build logs'],
  },
  {
    slug: 'cloudbuild-builds-approver', name: 'Cloud Build Approver', roleId: 'roles/cloudbuild.builds.approver',
    description: 'Approve or reject Cloud Build builds that require manual approval.',
    tier: 'Specialized', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Approve or reject pending builds', 'View build details and logs before approval'],
  },
  {
    slug: 'cloudbuild-connection-admin', name: 'Cloud Build Connection Admin', roleId: 'roles/cloudbuild.connectionAdmin',
    description: 'Manage Cloud Build connections to source code repositories.',
    tier: 'Admin', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Create, update, and delete repository connections', 'Manage repository access tokens', 'Link repositories to Cloud Build'],
  },

  // ── Artifact Registry ──────────────────────────────────────────────────
  {
    slug: 'artifactregistry-admin', name: 'Artifact Registry Administrator', roleId: 'roles/artifactregistry.admin',
    description: 'Full control of Artifact Registry repositories, including creating and managing IAM.',
    tier: 'Admin', category: 'DevOps', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete repositories', 'Push and pull artifacts', 'Set IAM policies on repositories', 'Configure repository settings and cleanup policies'],
  },
  {
    slug: 'artifactregistry-repo-admin', name: 'Artifact Registry Repository Admin', roleId: 'roles/artifactregistry.repoAdmin',
    description: 'Manage a specific Artifact Registry repository: push, pull, and configure settings.',
    tier: 'Admin', category: 'DevOps', isPrivileged: false, scope: 'resource',
    privileges: ['Push and pull artifacts', 'Delete artifact versions', 'Configure repository settings', 'Set IAM policies on a repository'],
  },
  {
    slug: 'artifactregistry-writer', name: 'Artifact Registry Writer', roleId: 'roles/artifactregistry.writer',
    description: 'Push artifacts to Artifact Registry repositories. Used by CI/CD systems.',
    tier: 'Developer', category: 'DevOps', isPrivileged: false, scope: 'resource',
    privileges: ['Push new artifacts and versions', 'Pull existing artifacts', 'View repository metadata'],
  },
  {
    slug: 'artifactregistry-reader', name: 'Artifact Registry Reader', roleId: 'roles/artifactregistry.reader',
    description: 'Pull artifacts from Artifact Registry repositories. Used by deployment systems.',
    tier: 'Viewer', category: 'DevOps', isPrivileged: false, scope: 'resource',
    privileges: ['Pull (download) artifacts', 'View artifact metadata and versions', 'List repositories and artifacts'],
  },
  {
    slug: 'artifactregistry-create-on-push-writer', name: 'Artifact Registry Create-on-Push Writer', roleId: 'roles/artifactregistry.createOnPushWriter',
    description: 'Push artifacts to existing or automatically created repositories.',
    tier: 'Specialized', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Push artifacts and create repos on first push', 'Pull artifacts from repositories'],
  },

  // ── Secret Manager ─────────────────────────────────────────────────────
  {
    slug: 'secretmanager-admin', name: 'Secret Manager Admin', roleId: 'roles/secretmanager.admin',
    description: 'Full control of Secret Manager: create, manage, and access all secrets.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete secrets', 'Add and disable secret versions', 'Access secret values', 'Set IAM policies on secrets', 'View secret metadata'],
  },
  {
    slug: 'secretmanager-secret-accessor', name: 'Secret Manager Secret Accessor', roleId: 'roles/secretmanager.secretAccessor',
    description: 'Access the payload of Secret Manager secrets. Common role for application workloads.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Access (read) secret version payloads', 'List secret versions', 'View secret metadata'],
  },
  {
    slug: 'secretmanager-secret-version-adder', name: 'Secret Manager Secret Version Adder', roleId: 'roles/secretmanager.secretVersionAdder',
    description: 'Add new versions to an existing Secret Manager secret.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Add new versions to a secret', 'Cannot access existing secret values'],
  },
  {
    slug: 'secretmanager-secret-version-manager', name: 'Secret Manager Secret Version Manager', roleId: 'roles/secretmanager.secretVersionManager',
    description: 'Enable, disable, and destroy secret versions. Manage secret version lifecycle.',
    tier: 'Operator', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Enable and disable secret versions', 'Destroy secret versions', 'List and view version metadata'],
  },
  {
    slug: 'secretmanager-viewer', name: 'Secret Manager Viewer', roleId: 'roles/secretmanager.viewer',
    description: 'View Secret Manager secret metadata without accessing secret values.',
    tier: 'Viewer', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['List secrets and view metadata', 'View secret version status', 'Cannot access secret payloads'],
  },

  // ── Cloud KMS ──────────────────────────────────────────────────────────
  {
    slug: 'cloudkms-admin', name: 'Cloud KMS Admin', roleId: 'roles/cloudkms.admin',
    description: 'Full control of Cloud KMS: key rings, keys, and crypto key versions.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'project',
    privileges: ['Create and destroy key rings and keys', 'Manage crypto key versions', 'Set IAM policies on keys', 'Configure key rotation and purpose'],
  },
  {
    slug: 'cloudkms-encrypter-decrypter', name: 'Cloud KMS Encrypter/Decrypter', roleId: 'roles/cloudkms.cryptoKeyEncrypterDecrypter',
    description: 'Encrypt and decrypt data using Cloud KMS keys. Used for envelope encryption.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Encrypt plaintext using a CryptoKey', 'Decrypt ciphertext using a CryptoKey', 'View key metadata'],
  },
  {
    slug: 'cloudkms-encrypter', name: 'Cloud KMS Encrypter', roleId: 'roles/cloudkms.cryptoKeyEncrypter',
    description: 'Encrypt data using Cloud KMS keys. Cannot decrypt.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Encrypt plaintext data using a CryptoKey', 'Cannot decrypt ciphertext'],
  },
  {
    slug: 'cloudkms-decrypter', name: 'Cloud KMS Decrypter', roleId: 'roles/cloudkms.cryptoKeyDecrypter',
    description: 'Decrypt data using Cloud KMS keys. Cannot encrypt.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Decrypt ciphertext using a CryptoKey', 'Cannot encrypt plaintext'],
  },
  {
    slug: 'cloudkms-viewer', name: 'Cloud KMS Viewer', roleId: 'roles/cloudkms.viewer',
    description: 'View Cloud KMS key ring and key metadata without cryptographic operations.',
    tier: 'Viewer', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['View key ring and key metadata', 'List key rings, keys, and versions', 'View key rotation schedules'],
  },
  {
    slug: 'cloudkms-signer-verifier', name: 'Cloud KMS Signer/Verifier', roleId: 'roles/cloudkms.signerVerifier',
    description: 'Sign and verify data using asymmetric Cloud KMS keys.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Sign data using asymmetric keys', 'Verify signatures using asymmetric keys', 'Retrieve public key material'],
  },

  // ── Cloud Logging ──────────────────────────────────────────────────────
  {
    slug: 'logging-admin', name: 'Logging Admin', roleId: 'roles/logging.admin',
    description: 'Full control of all Cloud Logging: log buckets, sinks, views, and exclusions.',
    tier: 'Admin', category: 'Observability', isPrivileged: true, scope: 'project',
    privileges: ['Read all logs including private logs', 'Create and manage log sinks and exports', 'Configure log buckets and views', 'Set exclusion filters', 'Manage log-based metrics'],
  },
  {
    slug: 'logging-config-writer', name: 'Logs Configuration Writer', roleId: 'roles/logging.configWriter',
    description: 'Create and manage log sinks, log-based metrics, and exclusion filters.',
    tier: 'Operator', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Create and update log sinks', 'Configure log exclusion filters', 'Manage log-based metrics', 'Configure log buckets and views'],
  },
  {
    slug: 'logging-log-writer', name: 'Logs Writer', roleId: 'roles/logging.logWriter',
    description: 'Write log entries to Cloud Logging. Used by service accounts running workloads.',
    tier: 'Specialized', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Write log entries to Cloud Logging', 'Cannot read or manage log configurations'],
  },
  {
    slug: 'logging-private-log-viewer', name: 'Private Logs Viewer', roleId: 'roles/logging.privateLogViewer',
    description: 'Read all log entries including private logs (data access audit logs).',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View all log entries including data access audit logs', 'Query logs using Logs Explorer', 'Read log bucket and sink configurations'],
  },
  {
    slug: 'logging-viewer', name: 'Logs Viewer', roleId: 'roles/logging.viewer',
    description: 'Read all non-private log entries. Cannot access data access audit logs.',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View non-private log entries', 'Query logs using Logs Explorer', 'Cannot read data access audit logs'],
  },

  // ── Cloud Monitoring ───────────────────────────────────────────────────
  {
    slug: 'monitoring-admin', name: 'Monitoring Admin', roleId: 'roles/monitoring.admin',
    description: 'Full access to all Cloud Monitoring: dashboards, alerting policies, uptime checks.',
    tier: 'Admin', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage alerting policies', 'Create and manage custom dashboards', 'Configure uptime checks', 'Manage notification channels', 'Write custom metrics'],
  },
  {
    slug: 'monitoring-editor', name: 'Monitoring Editor', roleId: 'roles/monitoring.editor',
    description: 'Read and write access to Cloud Monitoring. Can create and modify monitoring configurations.',
    tier: 'Editor', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Modify dashboards and alerting policies', 'Create uptime checks', 'View all metrics', 'Write custom metrics'],
  },
  {
    slug: 'monitoring-metric-writer', name: 'Monitoring Metric Writer', roleId: 'roles/monitoring.metricWriter',
    description: 'Write custom metrics to Cloud Monitoring. Used by applications and agents.',
    tier: 'Specialized', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Write custom metric data to Cloud Monitoring'],
  },
  {
    slug: 'monitoring-viewer', name: 'Monitoring Viewer', roleId: 'roles/monitoring.viewer',
    description: 'Read-only access to all Cloud Monitoring data and configurations.',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View all metrics and time series data', 'View dashboards and alerting policies', 'View uptime check results'],
  },
  {
    slug: 'monitoring-dashboard-editor', name: 'Monitoring Dashboard Editor', roleId: 'roles/monitoring.dashboardEditor',
    description: 'Create and edit Cloud Monitoring custom dashboards. Cannot manage alerting policies.',
    tier: 'Specialized', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Create and edit custom dashboards', 'View all metrics and time series'],
  },

  // ── Security Command Center ────────────────────────────────────────────
  {
    slug: 'securitycenter-admin', name: 'Security Center Admin', roleId: 'roles/securitycenter.admin',
    description: 'Full access to Security Command Center. Manage findings, sources, and organization settings.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'org',
    privileges: ['Manage all SCC sources and findings', 'Configure organization SCC settings', 'Manage security marks', 'Set IAM policies on SCC resources', 'Access threat intelligence'],
  },
  {
    slug: 'securitycenter-admin-editor', name: 'Security Center Admin Editor', roleId: 'roles/securitycenter.adminEditor',
    description: 'Edit Security Command Center findings, sources, and notification configs.',
    tier: 'Editor', category: 'Security', isPrivileged: false, scope: 'org',
    privileges: ['Update security findings', 'Manage notification configs', 'Configure security sources', 'Manage security marks'],
  },
  {
    slug: 'securitycenter-admin-viewer', name: 'Security Center Admin Viewer', roleId: 'roles/securitycenter.adminViewer',
    description: 'Read-only access to all Security Command Center resources at the organization level.',
    tier: 'Viewer', category: 'Security', isPrivileged: false, scope: 'org',
    privileges: ['View all security findings', 'Read SCC organization settings', 'View all security sources and configurations'],
  },
  {
    slug: 'securitycenter-findings-editor', name: 'Security Center Findings Editor', roleId: 'roles/securitycenter.findingsEditor',
    description: 'Create and update Security Command Center findings within a source.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Create and update findings in a source', 'Set security marks on findings', 'Cannot delete findings or manage sources'],
  },

  // ── Networking (DNS, VPC Access) ───────────────────────────────────────
  {
    slug: 'dns-admin', name: 'DNS Admin', roleId: 'roles/dns.admin',
    description: 'Full access to Cloud DNS. Manage DNS zones, record sets, and policies.',
    tier: 'Admin', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete DNS managed zones', 'Manage DNS record sets', 'Configure DNS policies and response policies', 'Manage DNSSEC'],
  },
  {
    slug: 'dns-reader', name: 'DNS Reader', roleId: 'roles/dns.reader',
    description: 'Read-only access to Cloud DNS zones and record sets.',
    tier: 'Viewer', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['List and view DNS managed zones', 'View DNS record sets', 'View DNS policies'],
  },
  {
    slug: 'vpcaccess-admin', name: 'VPC Access Admin', roleId: 'roles/vpcaccess.admin',
    description: 'Manage Serverless VPC Access connectors for serverless services to connect to VPCs.',
    tier: 'Admin', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete VPC Access connectors', 'Configure connector settings', 'View connector status'],
  },
  {
    slug: 'vpcaccess-user', name: 'VPC Access User', roleId: 'roles/vpcaccess.user',
    description: 'Use existing VPC Access connectors when deploying serverless workloads.',
    tier: 'Specialized', category: 'Networking', isPrivileged: false, scope: 'resource',
    privileges: ['Attach VPC Access connector to Cloud Run, Cloud Functions, or App Engine'],
  },
  {
    slug: 'networkmanagement-admin', name: 'Network Management Admin', roleId: 'roles/networkmanagement.admin',
    description: 'Run network connectivity tests and manage Connectivity Test resources.',
    tier: 'Admin', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete connectivity tests', 'Run network connectivity analysis', 'View test results and trace routes'],
  },
  {
    slug: 'networkmanagement-viewer', name: 'Network Management Viewer', roleId: 'roles/networkmanagement.viewer',
    description: 'View network connectivity test results and configurations.',
    tier: 'Viewer', category: 'Networking', isPrivileged: false, scope: 'project',
    privileges: ['View connectivity test configurations', 'Read test results and trace routes'],
  },

  // ── Vertex AI / AI Platform ────────────────────────────────────────────
  {
    slug: 'aiplatform-admin', name: 'Vertex AI Administrator', roleId: 'roles/aiplatform.admin',
    description: 'Full control of all Vertex AI resources: datasets, models, endpoints, pipelines, and IAM.',
    tier: 'Admin', category: 'AI', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete datasets, models, and endpoints', 'Train and deploy models', 'Manage ML pipelines and experiments', 'Set IAM policies on Vertex AI resources', 'Access Vertex AI Workbench'],
  },
  {
    slug: 'aiplatform-user', name: 'Vertex AI User', roleId: 'roles/aiplatform.user',
    description: 'Use Vertex AI to create and manage models, experiments, and predictions.',
    tier: 'Editor', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage datasets and models', 'Train models and run pipelines', 'Deploy models to endpoints', 'Make online and batch predictions', 'Use Vertex AI Workbench'],
  },
  {
    slug: 'aiplatform-viewer', name: 'Vertex AI Viewer', roleId: 'roles/aiplatform.viewer',
    description: 'Read-only access to all Vertex AI resources.',
    tier: 'Viewer', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['View datasets, models, and endpoints', 'View training jobs and pipeline runs', 'View experiment results and metadata'],
  },
  {
    slug: 'aiplatform-featurestore-admin', name: 'Vertex AI Feature Store Admin', roleId: 'roles/aiplatform.featurestoreAdmin',
    description: 'Manage Vertex AI Feature Store: entity types, features, and feature values.',
    tier: 'Admin', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete feature stores', 'Manage entity types and features', 'Read and write feature values', 'Manage online serving configurations'],
  },
  {
    slug: 'ml-admin', name: 'AI Platform Admin', roleId: 'roles/ml.admin',
    description: 'Full control of AI Platform (legacy ML Engine) resources.',
    tier: 'Admin', category: 'AI', isPrivileged: true, scope: 'project',
    privileges: ['Create and manage training jobs', 'Deploy and manage model versions', 'Set IAM policies on ML resources', 'Manage models and versions'],
  },
  {
    slug: 'ml-developer', name: 'AI Platform Developer', roleId: 'roles/ml.developer',
    description: 'Create and manage AI Platform training jobs and model versions.',
    tier: 'Developer', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['Create training jobs', 'Deploy model versions', 'Make predictions', 'View model and job details'],
  },
  {
    slug: 'ml-viewer', name: 'AI Platform Viewer', roleId: 'roles/ml.viewer',
    description: 'Read-only access to AI Platform resources.',
    tier: 'Viewer', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['View training jobs and model versions', 'View prediction results metadata', 'List all ML resources'],
  },

  // ── Cloud Dataflow ─────────────────────────────────────────────────────
  {
    slug: 'dataflow-admin', name: 'Dataflow Admin', roleId: 'roles/dataflow.admin',
    description: 'Full control of Dataflow jobs and pipeline resources.',
    tier: 'Admin', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and cancel Dataflow jobs', 'Update running jobs', 'View job status and metrics', 'Manage Dataflow snapshots'],
  },
  {
    slug: 'dataflow-developer', name: 'Dataflow Developer', roleId: 'roles/dataflow.developer',
    description: 'Create and manage Dataflow jobs for data processing pipelines.',
    tier: 'Developer', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and cancel Dataflow jobs', 'View job execution details', 'Access job logs and metrics'],
  },
  {
    slug: 'dataflow-viewer', name: 'Dataflow Viewer', roleId: 'roles/dataflow.viewer',
    description: 'View Dataflow jobs, their status, and execution metrics.',
    tier: 'Viewer', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['View all Dataflow jobs and their status', 'View job metrics and logs', 'View pipeline graphs'],
  },
  {
    slug: 'dataflow-worker', name: 'Dataflow Worker', roleId: 'roles/dataflow.worker',
    description: 'Service account role for Dataflow worker VMs to execute pipeline steps.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Run Dataflow pipeline steps', 'Access data sources and sinks defined in the pipeline', 'Report worker metrics and status'],
  },

  // ── Cloud Dataproc ─────────────────────────────────────────────────────
  {
    slug: 'dataproc-admin', name: 'Dataproc Administrator', roleId: 'roles/dataproc.admin',
    description: 'Full control of Cloud Dataproc: clusters, jobs, and operations.',
    tier: 'Admin', category: 'Analytics', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete Dataproc clusters', 'Submit and cancel jobs', 'Manage cluster configurations', 'Set IAM policies on clusters', 'Manage workflow templates'],
  },
  {
    slug: 'dataproc-editor', name: 'Dataproc Editor', roleId: 'roles/dataproc.editor',
    description: 'Create and manage Dataproc clusters and submit jobs.',
    tier: 'Editor', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete clusters', 'Submit and manage jobs', 'View cluster status and job output'],
  },
  {
    slug: 'dataproc-viewer', name: 'Dataproc Viewer', roleId: 'roles/dataproc.viewer',
    description: 'Read-only access to Dataproc cluster and job configurations.',
    tier: 'Viewer', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['View clusters and job metadata', 'View job output and logs', 'List all Dataproc resources'],
  },
  {
    slug: 'dataproc-worker', name: 'Dataproc Worker', roleId: 'roles/dataproc.worker',
    description: 'Service account role for Dataproc cluster nodes to perform job execution.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Write logs from cluster nodes', 'Access Cloud Storage for input/output', 'Report cluster health and status'],
  },

  // ── Cloud Bigtable ─────────────────────────────────────────────────────
  {
    slug: 'bigtable-admin', name: 'Bigtable Administrator', roleId: 'roles/bigtable.admin',
    description: 'Full control of Cloud Bigtable: instances, clusters, tables, and IAM.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete Bigtable instances and clusters', 'Manage tables and column families', 'Read and write all data', 'Set IAM policies', 'Manage backups'],
  },
  {
    slug: 'bigtable-reader', name: 'Bigtable Reader', roleId: 'roles/bigtable.reader',
    description: 'Read data and metadata from Cloud Bigtable tables.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Read rows from tables', 'View table schemas and metadata', 'Run read-only queries'],
  },
  {
    slug: 'bigtable-user', name: 'Bigtable User', roleId: 'roles/bigtable.user',
    description: 'Read and write data to Cloud Bigtable tables.',
    tier: 'Editor', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Read and mutate rows in tables', 'View table configurations', 'Cannot create or delete tables or instances'],
  },
  {
    slug: 'bigtable-viewer', name: 'Bigtable Viewer', roleId: 'roles/bigtable.viewer',
    description: 'View Cloud Bigtable instance and table configurations without data access.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View instance and cluster configurations', 'List tables and column families', 'Cannot read table data'],
  },

  // ── Memorystore for Redis ──────────────────────────────────────────────
  {
    slug: 'redis-admin', name: 'Memorystore Redis Admin', roleId: 'roles/redis.admin',
    description: 'Full control of Memorystore for Redis instances.',
    tier: 'Admin', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete Redis instances', 'Update instance configurations', 'Manage failover and import/export'],
  },
  {
    slug: 'redis-editor', name: 'Memorystore Redis Editor', roleId: 'roles/redis.editor',
    description: 'Manage Memorystore for Redis instances but cannot create or delete them.',
    tier: 'Editor', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Update Redis instance configurations', 'Manage maintenance schedules', 'View instance details'],
  },
  {
    slug: 'redis-viewer', name: 'Memorystore Redis Viewer', roleId: 'roles/redis.viewer',
    description: 'Read-only access to Memorystore for Redis instance configurations.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View Redis instance configurations', 'List all Redis instances', 'View maintenance settings'],
  },

  // ── Cloud Billing ──────────────────────────────────────────────────────
  {
    slug: 'billing-admin', name: 'Billing Account Administrator', roleId: 'roles/billing.admin',
    description: 'Full control of a billing account: payment methods, project linking, and cost visibility.',
    tier: 'Admin', category: 'Billing', isPrivileged: true, scope: 'org',
    privileges: ['Manage payment instruments', 'Link and unlink projects to billing accounts', 'View and export billing data', 'Manage budgets and alerts', 'Grant billing roles'],
  },
  {
    slug: 'billing-costs-manager', name: 'Billing Account Costs Manager', roleId: 'roles/billing.costsManager',
    description: 'Manage budgets and alerts on a billing account without accessing payment information.',
    tier: 'Operator', category: 'Billing', isPrivileged: false, scope: 'org',
    privileges: ['Create and manage budgets', 'Configure budget alerts', 'View cost data', 'Cannot access payment instruments'],
  },
  {
    slug: 'billing-creator', name: 'Billing Account Creator', roleId: 'roles/billing.creator',
    description: 'Create new billing accounts.',
    tier: 'Specialized', category: 'Billing', isPrivileged: false, scope: 'org',
    privileges: ['Create new billing accounts'],
  },
  {
    slug: 'billing-project-manager', name: 'Project Billing Manager', roleId: 'roles/billing.projectManager',
    description: 'Link and unlink a project to/from a billing account.',
    tier: 'Specialized', category: 'Billing', isPrivileged: false, scope: 'project',
    privileges: ['Link project to billing account', 'Unlink project from billing account', 'View billing account details'],
  },
  {
    slug: 'billing-viewer', name: 'Billing Account Viewer', roleId: 'roles/billing.viewer',
    description: 'View billing account metadata and cost information. Cannot modify billing settings.',
    tier: 'Viewer', category: 'Billing', isPrivileged: false, scope: 'org',
    privileges: ['View billing account details', 'View cost and usage data', 'View budgets and alerts', 'Cannot change billing settings'],
  },

  // ── Organization Policy ────────────────────────────────────────────────
  {
    slug: 'orgpolicy-policy-admin', name: 'Organization Policy Administrator', roleId: 'roles/orgpolicy.policyAdmin',
    description: 'Set and manage organization policies that govern resource configurations.',
    tier: 'Admin', category: 'Management', isPrivileged: true, scope: 'org',
    privileges: ['Set and delete organization policies', 'View all organization policies', 'Override policies at folder and project level'],
  },
  {
    slug: 'orgpolicy-policy-viewer', name: 'Organization Policy Viewer', roleId: 'roles/orgpolicy.policyViewer',
    description: 'View organization policies at the organization, folder, and project levels.',
    tier: 'Viewer', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['View all organization policies', 'List policy constraints and settings'],
  },

  // ── Access Context Manager ─────────────────────────────────────────────
  {
    slug: 'accesscontextmanager-policy-admin', name: 'Access Context Manager Policy Admin', roleId: 'roles/accesscontextmanager.policyAdmin',
    description: 'Full control of VPC Service Controls, access policies, and service perimeters.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'org',
    privileges: ['Create and manage access policies', 'Define access levels', 'Create and modify service perimeters', 'Manage access context for VPC Service Controls'],
  },
  {
    slug: 'accesscontextmanager-policy-editor', name: 'Access Context Manager Policy Editor', roleId: 'roles/accesscontextmanager.policyEditor',
    description: 'Create and modify access policies, access levels, and service perimeters.',
    tier: 'Editor', category: 'Security', isPrivileged: false, scope: 'org',
    privileges: ['Create and update access levels', 'Create and update service perimeters', 'Cannot delete policies or manage IAM'],
  },
  {
    slug: 'accesscontextmanager-policy-reader', name: 'Access Context Manager Policy Reader', roleId: 'roles/accesscontextmanager.policyReader',
    description: 'Read-only access to all Access Context Manager resources.',
    tier: 'Viewer', category: 'Security', isPrivileged: false, scope: 'org',
    privileges: ['View access policies, levels, and service perimeters', 'List all access context configurations'],
  },

  // ── Certificate Authority Service ──────────────────────────────────────
  {
    slug: 'privateca-admin', name: 'CA Service Admin', roleId: 'roles/privateca.admin',
    description: 'Full control of Certificate Authority Service: CA pools, CAs, certificates, and IAM.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete CA pools and CAs', 'Issue and revoke certificates', 'Set IAM policies on CA resources', 'Manage CRL and certificate templates'],
  },
  {
    slug: 'privateca-certificate-manager', name: 'CA Service Certificate Manager', roleId: 'roles/privateca.certificateManager',
    description: 'Create, list, and revoke certificates from a CA Service CA pool.',
    tier: 'Operator', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Create certificates from CA pool', 'List issued certificates', 'Revoke certificates'],
  },
  {
    slug: 'privateca-certificate-requester', name: 'CA Service Certificate Requester', roleId: 'roles/privateca.certificateRequester',
    description: 'Request certificates from a CA Service CA pool. Used by applications needing TLS certificates.',
    tier: 'Specialized', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Request and receive certificates from a CA pool', 'View own issued certificates'],
  },

  // ── Cloud Workflows ────────────────────────────────────────────────────
  {
    slug: 'workflows-admin', name: 'Workflows Admin', roleId: 'roles/workflows.admin',
    description: 'Full control of Cloud Workflows: create, update, delete workflows and executions.',
    tier: 'Admin', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete workflows', 'Start and cancel workflow executions', 'View execution history', 'Manage workflow configurations'],
  },
  {
    slug: 'workflows-editor', name: 'Workflows Editor', roleId: 'roles/workflows.editor',
    description: 'Create and update Cloud Workflows and manage their executions.',
    tier: 'Editor', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and update workflow definitions', 'Execute workflows', 'View execution results'],
  },
  {
    slug: 'workflows-invoker', name: 'Workflows Invoker', roleId: 'roles/workflows.invoker',
    description: 'Execute Cloud Workflows without the ability to modify workflow definitions.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Trigger workflow executions', 'View execution status and results'],
  },

  // ── Cloud Scheduler ────────────────────────────────────────────────────
  {
    slug: 'cloudscheduler-admin', name: 'Cloud Scheduler Admin', roleId: 'roles/cloudscheduler.admin',
    description: 'Full control of Cloud Scheduler jobs: create, update, delete, and run jobs.',
    tier: 'Admin', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete scheduler jobs', 'Pause and resume jobs', 'Manually trigger job runs', 'View job history'],
  },
  {
    slug: 'cloudscheduler-job-runner', name: 'Cloud Scheduler Job Runner', roleId: 'roles/cloudscheduler.jobRunner',
    description: 'Manually trigger Cloud Scheduler jobs to run.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Manually trigger scheduled jobs', 'View job status'],
  },
  {
    slug: 'cloudscheduler-viewer', name: 'Cloud Scheduler Viewer', roleId: 'roles/cloudscheduler.viewer',
    description: 'View Cloud Scheduler job configurations and execution history.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['List and view scheduler jobs', 'View job schedules and history'],
  },

  // ── Cloud Tasks ────────────────────────────────────────────────────────
  {
    slug: 'cloudtasks-admin', name: 'Cloud Tasks Admin', roleId: 'roles/cloudtasks.admin',
    description: 'Full control of Cloud Tasks queues and tasks.',
    tier: 'Admin', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete task queues', 'Create and delete tasks', 'Pause and resume queues', 'View queue stats'],
  },
  {
    slug: 'cloudtasks-enqueuer', name: 'Cloud Tasks Enqueuer', roleId: 'roles/cloudtasks.enqueuer',
    description: 'Create new tasks in Cloud Tasks queues.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Create tasks in a queue', 'List tasks in a queue'],
  },
  {
    slug: 'cloudtasks-viewer', name: 'Cloud Tasks Viewer', roleId: 'roles/cloudtasks.viewer',
    description: 'View Cloud Tasks queue and task configurations and metadata.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['List and view task queues', 'View task metadata', 'View queue statistics'],
  },

  // ── Cloud Deploy ───────────────────────────────────────────────────────
  {
    slug: 'clouddeploy-admin', name: 'Cloud Deploy Admin', roleId: 'roles/clouddeploy.admin',
    description: 'Full control of Cloud Deploy: delivery pipelines, targets, releases, and rollouts.',
    tier: 'Admin', category: 'DevOps', isPrivileged: true, scope: 'project',
    privileges: ['Create and manage delivery pipelines', 'Create targets and releases', 'Approve and cancel rollouts', 'Set IAM policies', 'Access deployment history'],
  },
  {
    slug: 'clouddeploy-developer', name: 'Cloud Deploy Developer', roleId: 'roles/clouddeploy.developer',
    description: 'Create and manage Cloud Deploy releases and rollouts.',
    tier: 'Developer', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['Create releases and trigger rollouts', 'View pipeline configurations', 'Access deployment history'],
  },
  {
    slug: 'clouddeploy-releaser', name: 'Cloud Deploy Releaser', roleId: 'roles/clouddeploy.releaser',
    description: 'Approve rollouts in Cloud Deploy delivery pipelines.',
    tier: 'Specialized', category: 'DevOps', isPrivileged: false, scope: 'resource',
    privileges: ['Approve or reject pending rollouts', 'View rollout and release details'],
  },
  {
    slug: 'clouddeploy-viewer', name: 'Cloud Deploy Viewer', roleId: 'roles/clouddeploy.viewer',
    description: 'Read-only access to Cloud Deploy resources.',
    tier: 'Viewer', category: 'DevOps', isPrivileged: false, scope: 'project',
    privileges: ['View pipelines, targets, releases, and rollouts', 'View deployment history'],
  },

  // ── Eventarc ───────────────────────────────────────────────────────────
  {
    slug: 'eventarc-admin', name: 'Eventarc Admin', roleId: 'roles/eventarc.admin',
    description: 'Full control of Eventarc triggers and channels for event-driven workflows.',
    tier: 'Admin', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create, update, and delete Eventarc triggers', 'Manage channels and providers', 'Set IAM policies on triggers'],
  },
  {
    slug: 'eventarc-developer', name: 'Eventarc Developer', roleId: 'roles/eventarc.developer',
    description: 'Create and manage Eventarc triggers for event-driven applications.',
    tier: 'Developer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete Eventarc triggers', 'List and view trigger configurations'],
  },
  {
    slug: 'eventarc-event-receiver', name: 'Eventarc Event Receiver', roleId: 'roles/eventarc.eventReceiver',
    description: 'Receive events from Eventarc event providers. Required for event targets.',
    tier: 'Specialized', category: 'Serverless', isPrivileged: false, scope: 'resource',
    privileges: ['Receive events from Eventarc', 'Acknowledge event delivery'],
  },

  // ── AlloyDB ────────────────────────────────────────────────────────────
  {
    slug: 'alloydb-admin', name: 'AlloyDB Admin', roleId: 'roles/alloydb.admin',
    description: 'Full control of AlloyDB clusters, instances, and databases.',
    tier: 'Admin', category: 'Database', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete clusters and instances', 'Manage databases and users', 'Configure backups and maintenance', 'Set IAM policies'],
  },
  {
    slug: 'alloydb-database-user', name: 'AlloyDB Database User', roleId: 'roles/alloydb.databaseUser',
    description: 'Connect to AlloyDB instances using IAM-based authentication.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'resource',
    privileges: ['Authenticate to AlloyDB via IAM', 'Connect as a database user'],
  },
  {
    slug: 'alloydb-client', name: 'AlloyDB Client', roleId: 'roles/alloydb.client',
    description: 'Connect to AlloyDB instances via AlloyDB Auth Proxy.',
    tier: 'Specialized', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['Connect to AlloyDB via auth proxy', 'View instance connection details'],
  },
  {
    slug: 'alloydb-viewer', name: 'AlloyDB Viewer', roleId: 'roles/alloydb.viewer',
    description: 'View AlloyDB cluster and instance configurations.',
    tier: 'Viewer', category: 'Database', isPrivileged: false, scope: 'project',
    privileges: ['View cluster and instance configurations', 'List AlloyDB resources'],
  },

  // ── Cloud Composer ─────────────────────────────────────────────────────
  {
    slug: 'composer-admin', name: 'Cloud Composer Admin', roleId: 'roles/composer.admin',
    description: 'Full control of Cloud Composer environments: create, update, delete, and manage DAGs.',
    tier: 'Admin', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete Composer environments', 'Manage DAGs and Airflow configurations', 'Set environment variables and connections', 'View DAG run history'],
  },
  {
    slug: 'composer-user', name: 'Cloud Composer User', roleId: 'roles/composer.user',
    description: 'Use Cloud Composer environments: view and trigger DAGs.',
    tier: 'Operator', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['View DAGs and DAG run history', 'Trigger DAG runs', 'View task logs'],
  },
  {
    slug: 'composer-worker', name: 'Cloud Composer Worker', roleId: 'roles/composer.worker',
    description: 'Service account role for Composer worker nodes to execute DAG tasks.',
    tier: 'Specialized', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Execute Airflow tasks', 'Access Cloud Storage for DAG storage', 'Write logs and metrics'],
  },

  // ── Datastream ─────────────────────────────────────────────────────────
  {
    slug: 'datastream-admin', name: 'Datastream Admin', roleId: 'roles/datastream.admin',
    description: 'Full control of Datastream: streams, connection profiles, and private connections.',
    tier: 'Admin', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete streams and connection profiles', 'Start and stop streams', 'Configure private connectivity'],
  },
  {
    slug: 'datastream-editor', name: 'Datastream Editor', roleId: 'roles/datastream.editor',
    description: 'Create and manage Datastream resources without deleting them.',
    tier: 'Editor', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['Create and update streams', 'Manage connection profiles', 'Monitor stream status'],
  },
  {
    slug: 'datastream-viewer', name: 'Datastream Viewer', roleId: 'roles/datastream.viewer',
    description: 'View Datastream configurations and monitor stream status.',
    tier: 'Viewer', category: 'Analytics', isPrivileged: false, scope: 'project',
    privileges: ['View streams and connection profiles', 'Monitor stream errors and throughput'],
  },

  // ── Trace / Profiler / Error Reporting ─────────────────────────────────
  {
    slug: 'cloudtrace-admin', name: 'Cloud Trace Admin', roleId: 'roles/cloudtrace.admin',
    description: 'Full access to Cloud Trace: view, filter, and delete trace data.',
    tier: 'Admin', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View and analyze traces', 'Delete trace data', 'Configure trace sampling'],
  },
  {
    slug: 'cloudtrace-user', name: 'Cloud Trace User', roleId: 'roles/cloudtrace.user',
    description: 'Write and read trace data from Cloud Trace.',
    tier: 'Operator', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Write trace spans and data', 'View and search traces'],
  },
  {
    slug: 'cloudprofiler-agent', name: 'Cloud Profiler Agent', roleId: 'roles/cloudprofiler.agent',
    description: 'Allow Cloud Profiler agents to create and upload profiling data.',
    tier: 'Specialized', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Upload profiling data from running applications', 'Create profiling sessions'],
  },
  {
    slug: 'cloudprofiler-user', name: 'Cloud Profiler User', roleId: 'roles/cloudprofiler.user',
    description: 'View and analyze profiling data in Cloud Profiler.',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View CPU and memory profiles', 'Analyze profile data and flame graphs'],
  },
  {
    slug: 'errorreporting-user', name: 'Error Reporting User', roleId: 'roles/errorreporting.user',
    description: 'View and manage error groups in Cloud Error Reporting.',
    tier: 'Operator', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View error groups and events', 'Mute and resolve error groups', 'Set error notification preferences'],
  },
  {
    slug: 'errorreporting-viewer', name: 'Error Reporting Viewer', roleId: 'roles/errorreporting.viewer',
    description: 'View error groups and events in Cloud Error Reporting without modifying them.',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View all error groups and events', 'View error stack traces and metadata'],
  },
  {
    slug: 'errorreporting-writer', name: 'Error Reporting Writer', roleId: 'roles/errorreporting.writer',
    description: 'Write error events from applications to Cloud Error Reporting.',
    tier: 'Specialized', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['Write error reports to Error Reporting service', 'Used by application service accounts'],
  },

  // ── Binary Authorization ────────────────────────────────────────────────
  {
    slug: 'binaryauthorization-policy-admin', name: 'Binary Authorization Policy Administrator', roleId: 'roles/binaryauthorization.policyAdmin',
    description: 'Manage Binary Authorization policies that control what container images can be deployed.',
    tier: 'Admin', category: 'Security', isPrivileged: true, scope: 'project',
    privileges: ['Create and update Binary Authorization policies', 'Manage attestors', 'Configure deployment controls for GKE and Cloud Run'],
  },
  {
    slug: 'binaryauthorization-attestor-admin', name: 'Binary Authorization Attestor Admin', roleId: 'roles/binaryauthorization.attestorAdmin',
    description: 'Create and manage Binary Authorization attestors and their public keys.',
    tier: 'Admin', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete attestors', 'Manage attestor public keys', 'Create attestations for container images'],
  },

  // ── Container Analysis ──────────────────────────────────────────────────
  {
    slug: 'containeranalysis-admin', name: 'Container Analysis Admin', roleId: 'roles/containeranalysis.admin',
    description: 'Full access to Container Analysis notes, occurrences, and vulnerability data.',
    tier: 'Admin', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete notes and occurrences', 'View all vulnerability scan results', 'Manage Container Analysis IAM policies'],
  },
  {
    slug: 'containeranalysis-notes-editor', name: 'Container Analysis Notes Editor', roleId: 'roles/containeranalysis.notes.editor',
    description: 'Create and edit Container Analysis notes for vulnerability definitions.',
    tier: 'Editor', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Create and update vulnerability notes', 'List notes in a project'],
  },
  {
    slug: 'containeranalysis-occurrences-editor', name: 'Container Analysis Occurrences Editor', roleId: 'roles/containeranalysis.occurrences.editor',
    description: 'Create and update Container Analysis occurrences and vulnerability findings on images.',
    tier: 'Editor', category: 'Security', isPrivileged: false, scope: 'resource',
    privileges: ['Create and update occurrences', 'Report vulnerability findings on container images'],
  },

  // ── Service Usage / API Keys / Certificate Manager / Essential Contacts / OS Config / Service Mgmt / Recommender / Healthcare / Looker ─
  {
    slug: 'serviceusage-api-keys-admin', name: 'API Keys Admin', roleId: 'roles/serviceusage.apiKeysAdmin',
    description: 'Create, manage, and delete API keys for a project.',
    tier: 'Admin', category: 'IAM', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete API keys', 'Manage API key restrictions', 'View API key usage'],
  },
  {
    slug: 'serviceusage-service-usage-admin', name: 'Service Usage Admin', roleId: 'roles/serviceusage.serviceUsageAdmin',
    description: 'Enable and disable GCP services (APIs) in a project.',
    tier: 'Admin', category: 'Management', isPrivileged: false, scope: 'project',
    privileges: ['Enable and disable GCP APIs for a project', 'View all enabled and disabled services'],
  },
  {
    slug: 'serviceusage-service-usage-consumer', name: 'Service Usage Consumer', roleId: 'roles/serviceusage.serviceUsageConsumer',
    description: 'Inspect enabled services and consume quota for a project.',
    tier: 'Specialized', category: 'Management', isPrivileged: false, scope: 'project',
    privileges: ['View enabled services in a project', 'Consume service quota'],
  },
  {
    slug: 'certificatemanager-owner', name: 'Certificate Manager Owner', roleId: 'roles/certificatemanager.owner',
    description: 'Full control of Certificate Manager certificates, certificate maps, and DNS authorizations.',
    tier: 'Admin', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete certificates and maps', 'Manage DNS authorizations', 'Configure certificate map entries', 'Set IAM policies'],
  },
  {
    slug: 'certificatemanager-editor', name: 'Certificate Manager Editor', roleId: 'roles/certificatemanager.editor',
    description: 'Create and manage Certificate Manager resources excluding IAM policy changes.',
    tier: 'Editor', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['Create and update certificates', 'Manage certificate maps and DNS authorizations', 'Cannot set IAM policies'],
  },
  {
    slug: 'certificatemanager-viewer', name: 'Certificate Manager Viewer', roleId: 'roles/certificatemanager.viewer',
    description: 'View Certificate Manager resources and certificate status.',
    tier: 'Viewer', category: 'Security', isPrivileged: false, scope: 'project',
    privileges: ['View certificates and their status', 'List certificate maps and DNS authorizations'],
  },
  {
    slug: 'essentialcontacts-admin', name: 'Essential Contacts Admin', roleId: 'roles/essentialcontacts.admin',
    description: 'Manage essential contacts for GCP projects, folders, and organizations.',
    tier: 'Admin', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['Create and delete essential contacts', 'Assign notification categories to contacts', 'Manage contact visibility'],
  },
  {
    slug: 'essentialcontacts-viewer', name: 'Essential Contacts Viewer', roleId: 'roles/essentialcontacts.viewer',
    description: 'View essential contacts configured for a project, folder, or organization.',
    tier: 'Viewer', category: 'Management', isPrivileged: false, scope: 'org',
    privileges: ['View essential contacts and notification categories', 'List all configured contacts'],
  },
  {
    slug: 'osconfig-guest-policy-admin', name: 'OS Config Guest Policy Admin', roleId: 'roles/osconfig.guestPolicyAdmin',
    description: 'Manage OS Config guest policies for VM patching and configuration management.',
    tier: 'Admin', category: 'Compute', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage guest policies', 'Configure OS package installations', 'Manage file and process configurations on VMs'],
  },
  {
    slug: 'osconfig-inventory-viewer', name: 'OS Config Inventory Viewer', roleId: 'roles/osconfig.inventoryViewer',
    description: 'View OS inventory data collected from VM instances.',
    tier: 'Viewer', category: 'Observability', isPrivileged: false, scope: 'project',
    privileges: ['View installed packages on VMs', 'View OS version and update information', 'View kernel and package inventory'],
  },
  {
    slug: 'osconfig-patch-deployment-admin', name: 'OS Config Patch Deployment Admin', roleId: 'roles/osconfig.patchDeploymentAdmin',
    description: 'Create and manage patch deployments to keep VM instances up-to-date.',
    tier: 'Admin', category: 'Compute', isPrivileged: false, scope: 'project',
    privileges: ['Create and manage patch deployments', 'Schedule patch windows', 'View patch compliance reports'],
  },
  {
    slug: 'servicemanagement-admin', name: 'Service Management Admin', roleId: 'roles/servicemanagement.admin',
    description: 'Full control of Service Management: manage, enable, and configure GCP managed services.',
    tier: 'Admin', category: 'Management', isPrivileged: true, scope: 'project',
    privileges: ['Create and manage Cloud Endpoints services', 'Enable and disable services', 'Set IAM policies on services', 'Manage service configurations and rollouts'],
  },
  {
    slug: 'apigateway-admin', name: 'API Gateway Admin', roleId: 'roles/apigateway.admin',
    description: 'Full control of API Gateway: APIs, API configs, and gateways.',
    tier: 'Admin', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['Create and delete APIs and gateways', 'Manage API configs and deployments', 'View API traffic and logs'],
  },
  {
    slug: 'apigateway-viewer', name: 'API Gateway Viewer', roleId: 'roles/apigateway.viewer',
    description: 'View API Gateway configurations and traffic statistics.',
    tier: 'Viewer', category: 'Serverless', isPrivileged: false, scope: 'project',
    privileges: ['View API and gateway configurations', 'List all API Gateway resources'],
  },
  {
    slug: 'recommender-admin', name: 'Cloud Recommender Admin', roleId: 'roles/recommender.admin',
    description: 'View and apply all Recommender recommendations and insights across GCP services.',
    tier: 'Admin', category: 'Management', isPrivileged: false, scope: 'project',
    privileges: ['View all recommendations and insights', 'Apply and dismiss recommendations', 'Mark recommendations as claimed'],
  },
  {
    slug: 'recommender-viewer', name: 'Cloud Recommender Viewer', roleId: 'roles/recommender.viewer',
    description: 'View Recommender recommendations and insights without applying them.',
    tier: 'Viewer', category: 'Management', isPrivileged: false, scope: 'project',
    privileges: ['View recommendations across all recommenders', 'View recommendation impact and priority'],
  },
  {
    slug: 'healthcare-dataset-admin', name: 'Healthcare Dataset Admin', roleId: 'roles/healthcare.datasetAdmin',
    description: 'Full control of Cloud Healthcare API datasets: DICOM, FHIR, and HL7v2 stores.',
    tier: 'Admin', category: 'AI', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete healthcare datasets', 'Manage DICOM, FHIR, and HL7v2 stores', 'Set IAM policies on datasets', 'Export and import healthcare data'],
  },
  {
    slug: 'healthcare-fhir-resource-editor', name: 'Healthcare FHIR Resource Editor', roleId: 'roles/healthcare.fhirResourceEditor',
    description: 'Create, read, update, and delete FHIR resources in Cloud Healthcare FHIR stores.',
    tier: 'Editor', category: 'AI', isPrivileged: false, scope: 'resource',
    privileges: ['Create and update FHIR resources', 'Execute FHIR operations', 'Read all FHIR resources'],
  },
  {
    slug: 'healthcare-fhir-resource-viewer', name: 'Healthcare FHIR Resource Viewer', roleId: 'roles/healthcare.fhirResourceViewer',
    description: 'Read FHIR resources from Cloud Healthcare FHIR stores.',
    tier: 'Viewer', category: 'AI', isPrivileged: false, scope: 'resource',
    privileges: ['Read FHIR resources', 'Execute FHIR search queries (read-only)'],
  },
  {
    slug: 'looker-admin', name: 'Looker Admin', roleId: 'roles/looker.admin',
    description: 'Full control of Looker instances including creation and deletion.',
    tier: 'Admin', category: 'AI', isPrivileged: true, scope: 'project',
    privileges: ['Create and delete Looker instances', 'Manage instance configurations', 'Set IAM policies on instances'],
  },
  {
    slug: 'looker-viewer', name: 'Looker Viewer', roleId: 'roles/looker.viewer',
    description: 'View Looker instance configurations and metadata.',
    tier: 'Viewer', category: 'AI', isPrivileged: false, scope: 'project',
    privileges: ['View Looker instance details', 'List all Looker instances'],
  },
]

export const GCP_CATEGORIES: GcpCategory[] = [
  'IAM', 'Compute', 'Storage', 'BigQuery', 'Kubernetes', 'Database',
  'Networking', 'Security', 'DevOps', 'Serverless', 'AI', 'Analytics',
  'Observability', 'Billing', 'Management',
]
