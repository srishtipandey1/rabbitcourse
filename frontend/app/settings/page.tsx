'use client'

import { AppShell } from '@/components/RabbitUI'

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <main className="p-5 md:p-8">
        <p className="text-sm font-black text-[#1464d8]">Account preferences</p>
        <h1 className="text-4xl font-black">Settings</h1>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {[
            ['Learning pace', 'Default weekly commitment', '5 hours/week'],
            ['Preferred format', 'Course generation style', 'Mixed video and reading'],
            ['Exports', 'Default export bundle', 'Syllabus and notes'],
            ['Security', 'Token-based session', 'JWT secret in environment'],
          ].map(([title, desc, value]) => (
            <section key={title} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              <input className="mt-4 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold" defaultValue={value} />
            </section>
          ))}
        </div>
      </main>
    </AppShell>
  )
}
