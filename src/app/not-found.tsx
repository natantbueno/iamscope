import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center px-6">
      <ShieldX size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
      <h1 className="text-[20px] font-semibold text-gray-800 dark:text-gray-100 mb-2">Role não encontrada</h1>
      <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">
        A role que você procura não existe ou foi renomeada.
      </p>
      <Link href="/roles"
        className="text-[13px] px-4 py-2 rounded-md bg-[#0078d4] text-white hover:bg-[#106ebe] transition-colors">
        Ver todas as roles
      </Link>
    </div>
  )
}
