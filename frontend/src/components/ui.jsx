import { Link } from 'react-router-dom'
import { formatFriendlyError, getStatusClass } from '../utils/display'

export function Card({ children, className = '', as: Component = 'section', ...props }) {
  return (
    <Component className={`card ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}

export function CardHeader({ eyebrow, title, description, action }) {
  return (
    <div className="card-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && <h2>{title}</h2>}
        {description && <p className="subtle">{description}</p>}
      </div>
      {action && <div className="card-action">{action}</div>}
    </div>
  )
}

export function Button({
  children,
  className = '',
  tone = 'default',
  to,
  href,
  ...props
}) {
  const classes = `button ${tone !== 'default' ? tone : ''} ${className}`.trim()

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} type={props.type ?? 'button'} {...props}>
      {children}
    </button>
  )
}

export function Badge({ children, tone = '', className = '' }) {
  const resolvedTone = tone === 'status' ? getStatusClass(children) : tone
  return (
    <span className={`badge ${resolvedTone} ${className}`.trim()}>{children}</span>
  )
}

export function Input({ label, hint, className = '', ...props }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Select({ label, hint, children, className = '', ...props }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      <select {...props}>{children}</select>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Loading({ message = '불러오는 중입니다.' }) {
  return (
    <div className="state-card loading-state">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export function EmptyState({
  title = '표시할 데이터가 없습니다.',
  description,
  action,
}) {
  return (
    <div className="state-card empty-state">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="form-actions">{action}</div>}
    </div>
  )
}

export function ErrorMessage({ error, message }) {
  return (
    <div className="state-card error-state">
      <strong>확인 필요</strong>
      <p>{message ?? formatFriendlyError(error)}</p>
    </div>
  )
}
