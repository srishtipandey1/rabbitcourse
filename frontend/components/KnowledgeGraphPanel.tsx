'use client'
import { Network, Zap } from 'lucide-react'

interface GraphNode {
  id: string
  type: string
  label: string
  difficulty?: string
  confidence?: number
  mastery?: number
}

interface GraphEdge {
  from: string
  to: string
  type: string
}

export default function KnowledgeGraphPanel({ graph }: { graph?: { nodes?: GraphNode[], edges?: GraphEdge[] } }) {
  const nodes = graph?.nodes || []
  const concepts = nodes.filter(n => n.type === 'concept').slice(0, 18)
  const edges = graph?.edges || []

  if (concepts.length === 0) return null

  return (
    <section className="border-t border-white/10 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Network size={13} /> Knowledge graph
        </p>
        <span className="text-[11px] text-slate-500">{edges.length} links</span>
      </div>
      <div className="relative min-h-56 rounded-lg border border-white/10 bg-slate-950/70 overflow-hidden p-3">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.22),transparent_25%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.16),transparent_30%)]" />
        <div className="relative grid grid-cols-2 gap-2">
          {concepts.map((node, idx) => (
            <button
              key={node.id}
              className={`text-left rounded-md border px-2.5 py-2 transition hover:-translate-y-0.5 ${
                node.difficulty === 'advanced'
                  ? 'border-fuchsia-400/30 bg-fuchsia-400/10'
                  : node.difficulty === 'intermediate'
                    ? 'border-cyan-400/30 bg-cyan-400/10'
                    : 'border-emerald-400/25 bg-emerald-400/10'
              }`}
              style={{ transform: `translateY(${idx % 3 === 0 ? 4 : 0}px)` }}
              title={`${node.difficulty || 'beginner'} - ${Math.round((node.confidence || 0) * 100)}% confidence`}
            >
              <span className="block truncate text-xs text-slate-100">{node.label}</span>
              <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <Zap size={10} /> {node.mastery || 0}% mastery
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
