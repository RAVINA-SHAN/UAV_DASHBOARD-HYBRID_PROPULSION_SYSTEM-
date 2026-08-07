import type { ReactNode } from 'react'

interface EquationBoxProps {
  formula: string
  inputs?: { name: string; value: string; symbol?: string }[]
  output?: string
  outputLabel?: string
  description?: string
}

/**
 * Display component for engineering equations.
 * Shows formula, input values, and computed output — used across all module pages.
 */
export function EquationBox({ formula, inputs, output, outputLabel = 'Output', description }: EquationBoxProps) {
  return (
    <div className="equation-box space-y-3">
      <div>
        <div className="equation-label">Engineering Calculation</div>
        <div className="formula-display">{formula}</div>
        {description && <div className="mt-1 text-[11px] text-steel-500">{description}</div>}
      </div>
      {inputs && inputs.length > 0 && (
        <div>
          <div className="equation-label">Input Values</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {inputs.map((input) => (
              <div key={input.name} className="flex items-center justify-between text-[12px]">
                <span className="text-steel-500">{input.name}</span>
                <span className="font-mono text-navy-800 font-semibold">{input.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {output && (
        <div className="border-t border-steel-200 pt-2">
          <div className="equation-label">{outputLabel}</div>
          <div className="font-mono text-lg font-bold text-aerospace-700">{output}</div>
        </div>
      )}
    </div>
  )
}

interface PageSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  badge?: ReactNode
  className?: string
}

/** Standard page section wrapper with header, used consistently across modules. */
export function PageSection({ title, subtitle, children, badge, className = '' }: PageSectionProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="text-[11px] text-steel-400 mt-0.5">{subtitle}</div>}
        </div>
        {badge}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}