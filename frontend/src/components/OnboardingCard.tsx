import React from 'react'

interface OnboardingCardProps {
  title: string
  message: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  icon?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

const widthClass: Record<NonNullable<OnboardingCardProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  icon,
  maxWidth = 'md',
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className={`card ${widthClass[maxWidth]} w-full text-center space-y-4`}>
        {icon && <div className="flex justify-center">{icon}</div>}
        <h2 className="text-2xl font-semibold text-brand-ink dark:text-gray-100">{title}</h2>
        <p className="text-muted dark:text-gray-300">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onPrimary} className="btn-cta">{primaryLabel}</button>
          {secondaryLabel && onSecondary && (
            <button onClick={onSecondary} className="btn-secondary">{secondaryLabel}</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingCard

