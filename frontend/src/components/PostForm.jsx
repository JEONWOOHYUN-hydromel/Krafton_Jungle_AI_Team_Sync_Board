import { useState } from 'react'

const TYPE_OPTIONS = [
  { value: 'daily_log', label: 'Daily Log' },
  { value: 'task', label: 'Task' },
  { value: 'blocker', label: 'Blocker' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'retrospective', label: 'Retrospective' },
]

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function PostForm({ initialValues, submitLabel, onSubmit }) {
  const [formData, setFormData] = useState({
    title: initialValues?.title ?? '',
    content: initialValues?.content ?? '',
    type: initialValues?.type ?? 'task',
    status: initialValues?.status ?? 'todo',
    priority: initialValues?.priority ?? 'medium',
    due_date: initialValues?.due_date ?? '',
    tagsText: initialValues?.tags?.join(', ') ?? '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        tags: formData.tagsText
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="title">제목</label>
        <br />
        <input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="content">내용</label>
        <br />
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          rows={8}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="type">종류</label>
        <br />
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="status">상태</label>
        <br />
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="priority">우선순위</label>
        <br />
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="due_date">마감일</label>
        <br />
        <input
          id="due_date"
          name="due_date"
          type="date"
          value={formData.due_date}
          onChange={handleChange}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="tagsText">태그</label>
        <br />
        <input
          id="tagsText"
          name="tagsText"
          value={formData.tagsText}
          onChange={handleChange}
          placeholder="backend, auth, jwt"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
        <p style={{ fontSize: '14px', color: '#666' }}>
          쉼표로 구분해서 입력하세요. 예: backend, auth, jwt
        </p>
      </div>

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중...' : submitLabel}
      </button>
    </form>
  )
}

export default PostForm