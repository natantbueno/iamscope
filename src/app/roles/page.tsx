'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RolesTable, { FilterType } from '@/components/RolesTable'
import ExportMenu from '@/components/ExportMenu'
import { ROLES } from '@/data/roles'

const TIER_VALUES = ['ControlPlane', 'ManagementPlane', 'WorkloadPlane', 'UserAccess', 'Unclassified']

function RolesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const q = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('category')
  const tierParam = searchParams.get('tier')
  const filterParam = searchParams.get('filter')

  // Determina o filtro ativo a partir da URL
  const initialFilter: FilterType =
    filterParam === 'privileged' ? 'privileged'
    : tierParam && TIER_VALUES.includes(tierParam) ? (tierParam as FilterType)
    : categoryParam ? (categoryParam as FilterType)
    : 'all'

  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter)

  // Sincroniza quando a URL muda
  useEffect(() => {
    setActiveFilter(initialFilter)
  }, [initialFilter])

  const handleFilterChange = (f: FilterType) => {
    setActiveFilter(f)
    // Atualiza a URL para refletir o filtro
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (f === 'privileged') params.set('filter', 'privileged')
    else if (TIER_VALUES.includes(f)) params.set('tier', f)
    else if (f !== 'all') params.set('category', f)
    const qs = params.toString()
    router.replace(`/roles${qs ? '?' + qs : ''}`)
  }

  const filteredRoles = useMemo(() => {
    const query = q.toLowerCase()
    return ROLES.filter((r) => {
      const matchSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.permissions.some((p) => p.action.toLowerCase().includes(query))

      let matchFilter = true
      if (activeFilter === 'privileged') matchFilter = r.isPrivileged
      else if (activeFilter === 'all') matchFilter = true
      else if (TIER_VALUES.includes(activeFilter)) matchFilter = r.eamTier === activeFilter
      else matchFilter = r.category === activeFilter

      return matchSearch && matchFilter
    }).sort((a, b) => {
      const order = { ControlPlane: 0, ManagementPlane: 1, WorkloadPlane: 2, UserAccess: 3, Unclassified: 4 }
      return order[a.eamTier] - order[b.eamTier]
    })
  }, [q, activeFilter])

  const subtitle = q
    ? `Resultados para "${q}" — ${filteredRoles.length} roles`
    : 'Roles built-in classificadas pelo Enterprise Access Model'

  return (
    <AppShell
      headerTitle="Built-in Roles"
      headerSub={subtitle}
      headerActions={<ExportMenu roles={filteredRoles} />}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <RolesTable roles={filteredRoles} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
      </div>
    </AppShell>
  )
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Carregando...</div>}>
      <RolesContent />
    </Suspense>
  )
}
