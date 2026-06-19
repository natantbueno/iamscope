'use client'

import { Suspense, useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RolesTable, { FilterType } from '@/components/RolesTable'
import ExportMenu from '@/components/ExportMenu'
import { ROLES, RoleCategory } from '@/data/roles'

const TIER_VALUES = ['ControlPlane', 'ManagementPlane', 'UserAccess', 'Unclassified']
const CATEGORY_VALUES: RoleCategory[] = ['Identity', 'Application', 'Security', 'Compliance', 'M365', 'Device', 'Other']

function RolesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const q = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('category')
  const tierParam = searchParams.get('tier')
  const filterParam = searchParams.get('filter')

  // Tier e category são filtros independentes
  const initialTier: FilterType =
    filterParam === 'privileged' ? 'privileged'
    : tierParam && TIER_VALUES.includes(tierParam) ? (tierParam as FilterType)
    : 'all'

  const initialCategory: RoleCategory | null =
    categoryParam && CATEGORY_VALUES.includes(categoryParam as RoleCategory)
      ? (categoryParam as RoleCategory)
      : null

  const [activeTier, setActiveTier] = useState<FilterType>(initialTier)
  const [activeCategory, setActiveCategory] = useState<RoleCategory | null>(initialCategory)

  useEffect(() => {
    setActiveTier(initialTier)
    setActiveCategory(initialCategory)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  const syncUrl = (tier: FilterType, category: RoleCategory | null, search: string) => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (tier === 'privileged') params.set('filter', 'privileged')
    else if (tier !== 'all') params.set('tier', tier)
    if (category) params.set('category', category)
    const qs = params.toString()
    router.replace(`/roles${qs ? '?' + qs : ''}`)
  }

  const handleTierChange = (f: FilterType) => {
    setActiveTier(f)
    syncUrl(f, activeCategory, q)
  }

  const handleCategoryChange = (c: RoleCategory | null) => {
    setActiveCategory(c)
    syncUrl(activeTier, c, q)
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

      const matchTier =
        activeTier === 'all' ? true
        : activeTier === 'privileged' ? r.isPrivileged
        : r.eamTier === activeTier

      const matchCategory = !activeCategory || r.category === activeCategory

      return matchSearch && matchTier && matchCategory
    }).sort((a, b) => {
      const order = { ControlPlane: 0, ManagementPlane: 1, UserAccess: 2, Unclassified: 3 }
      return (order[a.eamTier] ?? 99) - (order[b.eamTier] ?? 99)
    })
  }, [q, activeTier, activeCategory])

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
        <RolesTable
          roles={filteredRoles}
          activeTier={activeTier}
          activeCategory={activeCategory}
          onTierChange={handleTierChange}
          onCategoryChange={handleCategoryChange}
        />
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
