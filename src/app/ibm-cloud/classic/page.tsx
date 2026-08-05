import { Metadata } from 'next'
import { Suspense } from 'react'
import IbmClassicClient from './IbmClassicClient'
import { IBM_CLASSIC_PERMISSIONS_COUNT } from '@/data/counts'

export const metadata: Metadata = {
  title: 'IBM Cloud — Classic Infrastructure',
  description:
    `How access works in IBM Cloud classic infrastructure: all ${IBM_CLASSIC_PERMISSIONS_COUNT} individual `
    + 'permissions across six categories, device access and VPN subnets — not prebuilt roles.',
}

export default function IbmClassicPage() {
  return (
    <Suspense fallback={<div className="p-6 text-fg-subtle">Carregando...</div>}>
      <IbmClassicClient />
    </Suspense>
  )
}
