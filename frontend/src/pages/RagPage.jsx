import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorMessage,
  Loading,
  Select,
} from '../components/ui'
import { askDocs, syncDocuments } from '../api/ragApi'
import { isLoggedIn } from '../api/authApi'

const syncDetailLabels = {
  notion: 'Notion',
  posts: 'Work Logs',
  github: 'GitHub',
  git: 'Git Status',
}

function RagPage() {
  const loggedIn = isLoggedIn()

  const [syncResult, setSyncResult] = useState(null)
  const [question, setQuestion] = useState('')
  const [topK, setTopK] = useState(5)
  const [answerResult, setAnswerResult] = useState(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState(null)

  const canAsk = loggedIn && question.trim().length > 0 && !isAsking
  const syncDetails = syncResult?.details
    ? Object.entries(syncResult.details).filter(([, detail]) => detail)
    : []

  async function handleSyncDocuments() {
    try {
      setIsSyncing(true)
      setError(null)
      setSyncResult(null)

      setSyncResult(
        await syncDocuments({
          notion_limit: 10,
          post_limit: 50,
          github_issue_limit: 20,
          github_pr_limit: 20,
          github_commit_limit: 20,
        }),
      )
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

      setAnswerResult(
        await askDocs({
          question: trimmedQuestion,
          top_k: topK,
        }),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <AppLayout
      description="Notion 문서, 작업 로그, GitHub 진행 상황과 현재 git 상태를 검색해 답변합니다."
      eyebrow="Document intelligence"
      title="Ask Docs"
    >
      {!loggedIn && (
        <ErrorMessage message="문서 동기화와 질문 기능은 로그인 후 사용할 수 있습니다." />
      )}

      {error && <ErrorMessage error={error} />}

      <section className="ask-layout">
        <Card className="sync-card">
          <CardHeader
            eyebrow="Index"
            title="검색 인덱스 동기화"
            description="문서와 작업 로그가 크게 바뀐 뒤 한 번 실행하면 최신 근거로 답변합니다."
          />

          <Button
            tone="primary"
            onClick={handleSyncDocuments}
            disabled={!loggedIn || isSyncing}
          >
            {isSyncing ? '동기화 중' : '문서 동기화'}
          </Button>

          {isSyncing && <Loading message="문서와 embedding을 준비하는 중입니다." />}

          {syncResult ? (
            <div className="sync-summary">
              <div className="meta-row">
                <Badge>{syncResult.synced_documents} docs</Badge>
                <Badge>{syncResult.synced_chunks} chunks</Badge>
              </div>

              {syncDetails.length > 0 && (
                <div className="sync-breakdown">
                  {syncDetails.map(([source, detail]) => (
                    <span className="sync-source" key={source}>
                      <strong>{syncDetailLabels[source] ?? source}</strong>
                      {detail.synced_documents}문서 · {detail.synced_chunks}chunk
                      {detail.warnings?.length > 0 && <em>경고 {detail.warnings.length}</em>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              description="아직 이 화면에서 동기화한 결과가 없습니다."
              title="동기화 결과가 없습니다."
            />
          )}
        </Card>

        <Card className="ask-card">
          <CardHeader
            eyebrow="Ask"
            title="문서에 질문"
            description="구체적으로 물을수록 더 좋은 근거 문서를 찾습니다."
          />

          <form className="rag-question-form" onSubmit={handleAskDocs}>
            <label className="field">
              <span>Question</span>
              <textarea
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={8}
                placeholder="예: 현재 blocker는 무엇이고 담당자는 누구야?"
              />
            </label>

            <div className="rag-options-row">
              <Select
                id="topK"
                label="References"
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
              >
                <option value={3}>3 chunks</option>
                <option value={5}>5 chunks</option>
                <option value={8}>8 chunks</option>
                <option value={10}>10 chunks</option>
              </Select>

              <Button tone="primary" type="submit" disabled={!canAsk}>
                {isAsking ? '답변 생성 중' : '질문하기'}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      {answerResult && (
        <section className="answer-layout">
          <Card className="answer-card">
            <CardHeader
              action={<Badge>신뢰도 {answerResult.confidence}</Badge>}
              eyebrow="Answer"
              title="AI 답변"
            />

            <p className="article-body answer-body">{answerResult.answer}</p>

            {answerResult.warnings?.length > 0 && (
              <ErrorMessage message={answerResult.warnings.join(' ')} />
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="References" title="참고 근거" />
            {answerResult.references?.length > 0 ? (
              <div className="reference-list">
                {answerResult.references.map((reference, index) => (
                  <article className="reference-card" key={`${reference.source_type}-${index}`}>
                    <div>
                      <Badge>{reference.source_type}</Badge>
                      <h3>{reference.source_title}</h3>
                      <p>{reference.reason}</p>
                    </div>
                    {reference.source_url && reference.source_url.startsWith('/posts/') ? (
                      <Button to={reference.source_url}>작업 로그 열기</Button>
                    ) : reference.source_url ? (
                      <Button href={reference.source_url}>원문 열기</Button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="참고 문서가 없습니다." />
            )}
          </Card>
        </section>
      )}
    </AppLayout>
  )
}

export default RagPage
