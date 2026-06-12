import { useState } from 'react'
import { Link } from 'react-router-dom'
import { askDocs, syncDocuments } from '../api/ragApi'
import { isLoggedIn } from '../api/authApi'
import AuthNav from '../components/AuthNav'

function RagPage() {
  const loggedIn = isLoggedIn()

  const [syncResult, setSyncResult] = useState(null)
  const [question, setQuestion] = useState('')
  const [topK, setTopK] = useState(5)
  const [answerResult, setAnswerResult] = useState(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState(null)

  async function handleSyncDocuments() {
    try {
      setIsSyncing(true)
      setError(null)
      setSyncResult(null)

      const data = await syncDocuments({
        notion_limit: 10,
        post_limit: 50,
      })

      setSyncResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleAskDocs(event) {
    event.preventDefault()

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setError('질문을 입력해주세요.')
      return
    }

    try {
      setIsAsking(true)
      setError(null)
      setAnswerResult(null)

      const data = await askDocs({
        question: trimmedQuestion,
        top_k: topK,
      })

      setAnswerResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>RAG 문서 질문</h1>

      <AuthNav />

      <p>
        Notion 공식 문서와 게시판 작업 로그를 embedding으로 저장한 뒤,
        질문과 유사한 문서 chunk를 찾아 답변합니다.
      </p>

      {!loggedIn && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <p>RAG 검색을 사용하려면 로그인이 필요합니다.</p>
          <Link to="/login">로그인하러 가기</Link>
        </section>
      )}

      {error && <p style={{ color: 'red' }}>에러: {error}</p>}

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>1. 문서 동기화</h2>

        <p>
          Notion 문서와 게시판 글을 가져와 chunk로 나누고 embedding을
          저장합니다. 질문하기 전에 한 번 실행해야 합니다.
        </p>

        <button
          type="button"
          onClick={handleSyncDocuments}
          disabled={!loggedIn || isSyncing}
        >
          {isSyncing ? '동기화 중...' : '문서 동기화 실행'}
        </button>

        {syncResult && (
          <div style={{ marginTop: '16px' }}>
            <h3>동기화 결과</h3>

            <p>동기화 문서 수: {syncResult.synced_documents}</p>
            <p>동기화 chunk 수: {syncResult.synced_chunks}</p>

            {syncResult.details && (
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#f7f7f7',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                {JSON.stringify(syncResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </section>

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>2. 문서에 질문하기</h2>

        <form onSubmit={handleAskDocs}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="question">질문</label>
            <br />
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="예: 로그인 기능 구현하려면 어떤 문서 봐야 해?"
              style={{
                width: '100%',
                padding: '8px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="topK">참고 chunk 개수 top_k</label>
            <br />
            <select
              id="topK"
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value))}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
            </select>
          </div>

          <button type="submit" disabled={!loggedIn || isAsking}>
            {isAsking ? '답변 생성 중...' : '질문하기'}
          </button>
        </form>
      </section>

      {answerResult && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>답변</h2>

          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {answerResult.answer}
          </p>

          <p>
            confidence: <strong>{answerResult.confidence}</strong>
          </p>

          {answerResult.warnings?.length > 0 && (
            <>
              <h3>경고</h3>
              <ul>
                {answerResult.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          <h3>References</h3>

          {answerResult.references?.length > 0 ? (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {answerResult.references.map((reference, index) => (
                <li
                  key={`${reference.source_type}-${reference.source_id}-${index}`}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <p style={{ marginTop: 0 }}>
                    <strong>
                      [{reference.source_type}] {reference.source_title}
                    </strong>
                  </p>

                  <p>source_id: {reference.source_id}</p>

                  <p>{reference.reason}</p>

                  {reference.source_url && (
                    <p>
                      {reference.source_url.startsWith('/posts/') ? (
                        <Link to={reference.source_url}>게시글 열기</Link>
                      ) : (
                        <a
                          href={reference.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          원문 열기
                        </a>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>참고 문서가 없습니다.</p>
          )}
        </section>
      )}
    </main>
  )
}

export default RagPage