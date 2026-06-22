'use client'

import AppShell from '@/components/AppShell'
import EntraScopeIcon from '@/components/EntraScopeIcon'
import {
  Shield, Search, BookOpen, Layers, ExternalLink, Github, Linkedin,
  ShieldCheck, ListTree, KeyRound, FileText,
} from 'lucide-react'

export default function InfoPage() {
  return (
    <AppShell
      headerTitle="Sobre"
      headerSub="Entra Scope — proposta e autor"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

          {/* Hero */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-8 flex flex-col items-center text-center gap-4">
            <EntraScopeIcon size={56} />
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-gray-100 mb-1">Entra Scope</h1>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Referência comunitária de roles, permissões e API permissions do Microsoft Entra ID
              </p>
            </div>
            <a
              href="https://entrascope.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-[#0078d4] dark:text-[#85b7eb] hover:underline"
            >
              entrascope.cloud <ExternalLink size={12} />
            </a>
          </section>

          {/* Proposta */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">O que é o Entra Scope?</h2>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              O Entra Scope é uma ferramenta de referência rápida para profissionais de identidade e segurança que trabalham com o <strong className="text-gray-800 dark:text-gray-100">Microsoft Entra ID</strong>. O objetivo é centralizar informações sobre roles, role actions e API permissions em um único lugar, com classificação pelo <strong className="text-gray-800 dark:text-gray-100">Enterprise Access Model (EAM)</strong> da Microsoft.
            </p>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
              A documentação oficial da Microsoft é extensa e dispersa. O Entra Scope traz essa informação organizada, filtrável e pesquisável — ideal para revisões de acesso, design de roles customizadas e auditorias de segurança.
            </p>
          </section>

          {/* O que você encontra */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">O que você encontra aqui</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: <ShieldCheck size={14} />, title: 'Built-in Roles', desc: '144 roles classificadas por categoria e tier EAM, com descrições e permissões completas.' },
                { icon: <ListTree size={14} />, title: 'Role Actions', desc: 'Todas as actions únicas agregadas entre roles, com namespace, verbo, tier e quais roles as utilizam.' },
                { icon: <KeyRound size={14} />, title: 'API Permissions', desc: 'Permissões do Microsoft Graph (Application e Delegated) com classificação EAM e filtros por tipo.' },
                { icon: <FileText size={14} />, title: 'Reference', desc: 'Documentação sobre o EAM, categorias de roles, custom roles e suas limitações.' },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-3 rounded-lg bg-[#f7f9fc] dark:bg-gray-800 border border-[#dde3ec] dark:border-gray-700">
                  <span className="text-[#0078d4] dark:text-[#85b7eb] mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 mb-0.5">{item.title}</p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* EAM */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Enterprise Access Model</h2>
            </div>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              O EAM é um framework da Microsoft para classificar o nível de privilégio de roles e permissões. Cada item no Entra Scope é classificado em um dos tiers:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Control Plane', color: '#dc2626', bg: '#fef2f2', darkBg: '#450a0a', desc: 'Controle total do tenant' },
                { label: 'Management Plane', color: '#ea580c', bg: '#fff7ed', darkBg: '#431407', desc: 'Gerenciamento de recursos' },
                { label: 'User Access', color: '#16a34a', bg: '#f0fdf4', darkBg: '#052e16', desc: 'Acesso a dados de usuários' },
                { label: 'Unclassified', color: '#6b7280', bg: '#f9fafb', darkBg: '#111827', desc: 'Sem classificação EAM' },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium"
                  style={{ backgroundColor: t.bg, borderColor: t.color + '40', color: t.color }}>
                  {t.label}
                </div>
              ))}
            </div>
          </section>

          {/* Sobre o autor */}
          <section className="bg-white dark:bg-gray-900 border border-[#dde3ec] dark:border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[#0078d4] dark:text-[#85b7eb]" />
              <h2 className="text-[15px] font-semibold text-gray-800 dark:text-gray-100">Sobre o autor</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-16 h-16 rounded-full bg-[#e8f1fb] dark:bg-[#0c2a47] border-2 border-[#0078d4] dark:border-[#85b7eb] flex items-center justify-center shrink-0">
                <span className="text-[22px] font-bold text-[#0078d4] dark:text-[#85b7eb]">N</span>
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Natan Tomaz</h3>
                <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  Profissional de identidade e segurança com foco em Microsoft Entra ID, Zero Trust e ambientes cloud. Apaixonado por automação, governança de acesso e compartilhamento de conhecimento técnico com a comunidade.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www.linkedin.com/in/natantomazbueno/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#0a66c2] hover:bg-[#094fa1] text-white transition-colors"
                  >
                    <Linkedin size={13} /> LinkedIn
                  </a>
                  <a
                    href="https://entrascope.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium border border-[#dde3ec] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink size={13} /> entrascope.cloud
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Fontes */}
          <section className="text-center pb-4">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Dados baseados em{' '}
              <a href="https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                Microsoft Learn
              </a>{' '}e{' '}
              <a href="https://github.com/Cloud-Architekt/AzurePrivilegedIAM" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                EntraOps
              </a>
              . Projeto comunitário, sem vínculo com a Microsoft.
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
