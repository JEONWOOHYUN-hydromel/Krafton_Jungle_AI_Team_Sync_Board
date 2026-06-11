import { useEffect, useState } from 'react'
import AuthNav from '../components/AuthNav'
import { getNotionDoc, getNotionDocs } from '../api/notionApi'

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
    loadDocs()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Notion 문서</h1>

      <AuthNav />

      <p>
        Notion에 정리된 기획서, 회의록, API 명세, ERD 같은 공식 문서를
        확인하는 화면입니다.
      </p>

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>문서 목록</h2>

          {isListLoading && docs.length === 0 ? (
            <p>문서 목록을 불러오는 중...</p>
          ) : docs.length === 0 ? (
            <p>문서가 없습니다.</p>
          ) : (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {docs.map((doc) => (
                <li key={doc.page_id} style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectDoc(doc.page_id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <strong>{doc.title}</strong>
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {doc.last_edited_time}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => loadDocs(nextCursor)}
              disabled={isListLoading}
            >
              {isListLoading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </section>

        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            minHeight: '400px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>문서 상세</h2>

          {isDetailLoading ? (
            <p>문서 내용을 불러오는 중...</p>
          ) : selectedDoc ? (
            <article>
              <h3>{selectedDoc.title}</h3>

              {selectedDoc.url && (
                <p>
                  <a href={selectedDoc.url} target="_blank" rel="noreferrer">
                    Notion에서 열기
                  </a>
                </p>
              )}

              <p style={{ fontSize: '14px', color: '#666' }}>
                last edited: {selectedDoc.last_edited_time}
              </p>

              <hr />

              {selectedDoc.content ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                  }}
                >
                  {selectedDoc.content}
                </pre>
              ) : (
                <p>본문 텍스트가 없거나 아직 지원하지 않는 block 형식입니다.</p>
              )}
            </article>
          ) : (
            <p>왼쪽 목록에서 문서를 선택하세요.</p>
          )}
        </section>
      </div>
    </main>
  )
}

export default NotionDocsPage