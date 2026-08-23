'use client'

import Link from 'next/link'
import { useT } from '@/i18n/LanguageProvider'
import { ShieldX } from 'lucide-react'

export default function NotFound() {
  const t = useT()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center px-6">
      <ShieldX size={48} className="text-fg-muted dark:text-gray-700 mb-4" />
      <h1 className="text-heading font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('empty.roleNotFound')}</h1>
      <p className="text-note text-fg-muted mb-6">
        A role que você procura não existe ou foi renomeada.
      </p>
      <Link href="/entraid/roles"
        className="text-body px-4 py-2 rounded-md bg-brand text-white hover:bg-brand-hover transition-colors">
        Ver todas as roles
      </Link>
    </div>
  )
}
