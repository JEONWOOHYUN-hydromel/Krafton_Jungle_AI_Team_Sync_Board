import { useState } from 'react'
import { Button, Card, ErrorMessage, Input, Select } from './ui'
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  formatFriendlyError,
} from '../utils/display'

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

  const canSubmit =
    formData.title.trim().length > 0 &&
    formData.content.trim().length > 0 &&
    !isSubmitting

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      setError('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        title: formData.title.trim(),
        content: formData.content.trim(),
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
      setError(formatFriendlyError(err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card as="form" className="worklog-form" onSubmit={handleSubmit}>
      <div className="form-layout">
        <section className="form-primary">
          <Input
            hint="목록에서 바로 이해할 수 있게 액션 중심으로 적어주세요."
            id="title"
            label="Title"
            name="title"
            onChange={handleChange}
            placeholder="예: RAG 문서 동기화 안정화"
            required
            value={formData.title}
          />

          <label className="field">
            <span>Content</span>
            <textarea
              id="content"
              name="content"
              onChange={handleChange}
              placeholder="현재 상태, 결정이 필요한 점, 다음 액션을 남겨주세요."
              required
              rows={13}
              value={formData.content}
            />
            <small>AI 요약과 문서 검색의 근거가 되므로 맥락을 함께 남기는 것이 좋습니다.</small>
          </label>
        </section>

        <aside className="form-sidebar">
          <Select id="type" label="Type" name="type" onChange={handleChange} value={formData.type}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            id="status"
            label="Status"
            name="status"
            onChange={handleChange}
            value={formData.status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            id="priority"
            label="Priority"
            name="priority"
            onChange={handleChange}
            value={formData.priority}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            id="due_date"
            label="Due date"
            name="due_date"
            onChange={handleChange}
            type="date"
            value={formData.due_date}
          />

          <Input
            hint="쉼표로 구분합니다."
            id="tagsText"
            label="Tags"
            name="tagsText"
            onChange={handleChange}
            placeholder="backend, rag, qa"
            value={formData.tagsText}
          />
        </aside>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="form-actions">
        <Button tone="primary" type="submit" disabled={!canSubmit}>
          {isSubmitting ? '저장 중' : submitLabel}
        </Button>
        {!canSubmit && !isSubmitting && (
          <span className="subtle">제목과 내용을 입력하면 저장할 수 있습니다.</span>
        )}
      </div>
    </Card>
  )
}

export default PostForm
