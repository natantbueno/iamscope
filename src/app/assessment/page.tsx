import { Metadata } from 'next'
import AssessmentClient from './AssessmentClient'

export const metadata: Metadata = {
  title: 'Assessment do Tenant',
  description:
    'Script PowerShell somente-leitura que avalia o risco de identidade e acesso do seu tenant Entra ID e Azure RBAC usando a classificação do IAM Scope.',
}

export default function AssessmentPage() {
  return <AssessmentClient />
}
