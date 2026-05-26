import React from 'react'
// lightweight alternative to clsx to avoid extra dependency
function clsx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'icon'
}

export default function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  const base = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4'
  const variants: Record<string, string> = {
    default: 'bg-slate-950 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'text-slate-700 hover:bg-slate-100',
    outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3',
    md: 'h-9 px-4',
    icon: 'size-8 p-0',
  }
  return <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />
}
