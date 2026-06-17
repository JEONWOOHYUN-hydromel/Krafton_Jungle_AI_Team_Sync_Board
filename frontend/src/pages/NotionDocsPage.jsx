import { useEffect, useState } from 'react'
import AppLayout from '../components/AppLayout'
import { Badge, Button, Card, EmptyState, ErrorMessage, Loading } from '../components/ui'
import { getNotionDoc, getNotionDocs } from '../api/notionApi'
import { formatDateTime } from '../utils/display'

function RichText({ items = [] }) {
  if (items.length === 0) {
    return null
  }

  return items.map((item, index) => {
    const annotations = item.annotations ?? {}
    const color = annotations.color && annotations.color !== 'default'
      ? ` notion-color-${annotations.color.replaceAll('_', '-')}`
      : ''
    const className = [
      annotations.bold ? 'notion-bold' : '',
      annotations.italic ? 'notion-italic' : '',
      annotations.underline ? 'notion-underline' : '',
      annotations.strikethrough ? 'notion-strike' : '',
      annotations.code ? 'notion-inline-code' : '',
      color,
    ]
      .filter(Boolean)
      .join(' ')

    const content = (
      <span className={className} key={`${item.text}-${index}`}>
        {item.text}
      </span>
    )

    if (item.href) {
      return (
        <a
          href={item.href}
          key={`${item.href}-${index}`}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      )
    }

    return content
  })
}

function NotionBlock({ block, index = 0 }) {
  const children = block.children ?? []
  const richText = <RichText items={block.rich_text} />

  function renderChildren() {
    if (children.length === 0) {
      return null
    }

    return (
      <div className="notion-children">
        {children.map((child, childIndex) => (
          <NotionBlock
            block={child}
            index={childIndex}
            key={child.id ?? `${child.type}-${childIndex}`}
          />
        ))}
      </div>
    )
  }

  if (block.type === 'heading_1') {
    return (
      <section className="notion-block">
        <h2 className="notion-heading-1">{richText}</h2>
        {renderChildren()}
      </section>
    )
  }

  if (block.type === 'heading_2') {
    return (
      <section className="notion-block">
        <h3 className="notion-heading-2">{richText}</h3>
        {renderChildren()}
      </section>
    )
  }

  if (block.type === 'heading_3') {
    return (
      <section className="notion-block">
        <h4 className="notion-heading-3">{richText}</h4>
        {renderChildren()}
      </section>
    )
  }

  if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
    return (
      <div className="notion-block notion-list-item">
        <span className="notion-list-marker">
          {block.type === 'numbered_list_item' ? `${index + 1}.` : '-'}
        </span>
        <div>
          <p>{richText}</p>
          {renderChildren()}
        </div>
      </div>
    )
  }

  if (block.type === 'to_do') {
    return (
      <div className="notion-block notion-todo">
        <input checked={Boolean(block.checked)} readOnly type="checkbox" />
        <p>{richText}</p>
      </div>
    )
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="notion-block notion-quote">
        {richText}
        {renderChildren()}
      </blockquote>
    )
  }

  if (block.type === 'callout') {
    return (
      <div className="notion-block notion-callout">
        <span className="notion-callout-icon">i</span>
        <div>
          <p>{richText}</p>
          {renderChildren()}
        </div>
      </div>
    )
  }

  if (block.type === 'code') {
    return (
      <div className="notion-block notion-code-block">
        <div className="notion-code-label">{block.language}</div>
        <pre>
          <code>{block.text}</code>
        </pre>
      </div>
    )
  }

  if (block.type === 'divider') {
    return <hr className="notion-divider" />
  }

  if (block.type === 'toggle') {
    return (
      <details className="notion-block notion-toggle">
        <summary>{richText}</summary>
        {renderChildren()}
      </details>
    )
  }

  if (block.type === 'child_page') {
    return (
      <div className="notion-block notion-child-page">
        <span className="notion-page-icon">doc</span>
        <strong>{block.text}</strong>
      </div>
    )
  }

  if (block.type === 'image' && block.url) {
    return (
      <figure className="notion-block notion-image">
        <img alt={block.text || 'Notion image'} src={block.url} />
        {block.caption?.length > 0 && (
          <figcaption>
            <RichText items={block.caption} />
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <div className="notion-block notion-paragraph">
      <p>{richText}</p>
      {renderChildren()}
    </div>
  )
}

function NotionDocsPage() {
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [error, setError] = useState(null)

  async function loadDocs(startCursor = '') {
    try {
      setIsListLoading(true)
      setError(null)

      const data = await getNotionDocs({
        page_size: 20,
        start_cursor: startCursor,
      })

      if (startCursor) {
        setDocs((prev) => [...prev, ...data.items])
      } else {
        setDocs(data.items)
      }

      setNextCursor(data.next_cursor)
      setHasMore(data.has_more)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsListLoading(false)
    }
  }

  async function handleSelectDoc(pageId) {
    try {
      setIsDetailLoading(true)
      setError(null)

      const data = await getNotionDoc(pageId)
      setSelectedDoc(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDetailLoading(false)
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadDocs()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [])

  return (
    <AppLayout
      description="기획, 회의록, API 명세, ERD 같은 공식 문서를 앱 안에서 확인합니다."
      eyebrow="Knowledge base"
      title="Notion Docs"
    >
      {error && <ErrorMessage error={error} />}

      <div className="split-layout notion-layout">
        <Card className="doc-list-card">
            <div className="section-title">
              <h2>문서 목록</h2>
              <Badge>{docs.length}</Badge>
            </div>

            {isListLoading && docs.length === 0 ? (
              <Loading message="문서 목록을 불러오는 중입니다." />
            ) : docs.length === 0 ? (
              <EmptyState title="문서가 없습니다." />
            ) : (
              <ul className="list">
                {docs.map((doc) => (
                  <li key={doc.page_id}>
                    <button
                      className="doc-button"
                      type="button"
                      onClick={() => handleSelectDoc(doc.page_id)}
                    >
                      <strong>{doc.title}</strong>
                      <span className="subtle">
                        {formatDateTime(doc.last_edited_time)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="form-actions">
                <Button onClick={() => loadDocs(nextCursor)} disabled={isListLoading}>
                  {isListLoading ? '불러오는 중...' : '더 보기'}
                </Button>
              </div>
            )}
        </Card>

        <Card className="doc-detail-card">
            <div className="section-title">
              <h2>문서 상세</h2>
              {selectedDoc && <Badge>selected</Badge>}
            </div>

            {isDetailLoading ? (
              <Loading message="문서 내용을 불러오는 중입니다." />
            ) : selectedDoc ? (
              <article className="notion-document">
                <div className="notion-document-header">
                  <h2>{selectedDoc.title}</h2>

                  <div className="meta-row">
                    {selectedDoc.url && (
                      <Button href={selectedDoc.url}>
                        Notion에서 열기
                      </Button>
                    )}
                    <Badge>
                      수정 {formatDateTime(selectedDoc.last_edited_time)}
                    </Badge>
                  </div>
                </div>

                {selectedDoc.blocks?.length > 0 ? (
                  <div className="notion-blocks">
                    {selectedDoc.blocks.map((block, index) => (
                      <NotionBlock
                        block={block}
                        index={index}
                        key={block.id ?? `${block.type}-${index}`}
                      />
                    ))}
                  </div>
                ) : selectedDoc.content ? (
                  <pre className="article-body">{selectedDoc.content}</pre>
                ) : (
                  <EmptyState title="표시할 수 있는 본문 블록이 없습니다." />
                )}
              </article>
            ) : (
              <EmptyState
                description="문서를 선택하면 오른쪽에 Notion 형식에 가깝게 표시됩니다."
                title="왼쪽 목록에서 문서를 선택하세요."
              />
            )}
        </Card>
      </div>
    </AppLayout>
  )
}

export default NotionDocsPage
