export const TYPE_OPTIONS = [
  { value: 'daily_log', label: '일일 기록' },
  { value: 'task', label: '할 일' },
  { value: 'blocker', label: '막힘' },
  { value: 'discussion', label: '논의' },
  { value: 'retrospective', label: '회고' },
]

export const STATUS_OPTIONS = [
  { value: 'todo', label: '할 예정' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'done', label: '완료' },
  { value: 'blocked', label: '막힘' },
]

export const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
]

const TYPE_LABELS = Object.fromEntries(
  TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
)

const PRIORITY_LABELS = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option.label]),
)

export function getTypeLabel(value) {
  return TYPE_LABELS[value] ?? value ?? '미지정'
}

export function getStatusLabel(value) {
  return STATUS_LABELS[value] ?? value ?? '미지정'
}

export function getPriorityLabel(value) {
  return PRIORITY_LABELS[value] ?? value ?? '미지정'
}

export function getStatusClass(status) {
  return status?.replace('_', '-') ?? ''
}

export function formatDateTime(value) {
  if (!value) {
    return '미정'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatFriendlyError(message) {
  if (!message) {
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (message.includes('401') || message.includes('로그인')) {
    return '로그인이 필요합니다. 로그인한 뒤 다시 시도해주세요.'
  }

  if (message.includes('403')) {
    return '이 작업을 할 권한이 없습니다.'
  }

  if (message.includes('404')) {
    return '요청한 데이터를 찾을 수 없습니다.'
  }

  if (message.includes('500')) {
    return '서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  if (message.includes('Failed to fetch')) {
    return '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.'
  }

  return message
}
