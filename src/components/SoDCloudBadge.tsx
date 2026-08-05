'use client'

export default function SoDCloudBadge({ cloud }: { cloud: 'entra-id' | 'azure-rbac' }) {
  const isEntra = cloud === 'entra-id'
  return (
    <span
      className="text-micro font-bold px-1.5 py-0.5 rounded shrink-0 text-white"
      style={{ background: isEntra ? '#0078d4' : '#5c2d91' }}
    >
      {isEntra ? 'Entra ID' : 'Azure RBAC'}
    </span>
  )
}
