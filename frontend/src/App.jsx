import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function App() {
  const [health, setHealth] = useState('loading...')
  const [dbHealth, setDbHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchServerStatus() {
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`)

        if (!healthResponse.ok) {
          throw new Error(`GET /health failed: ${healthResponse.status}`)
        }

        const healthData = await healthResponse.json()
        setHealth(healthData)

        const dbResponse = await fetch(`${API_BASE_URL}/db-health`)

        if (!dbResponse.ok) {
          throw new Error(`GET /db-health failed: ${dbResponse.status}`)
        }

        const dbData = await dbResponse.json()
        setDbHealth(dbData)
      } catch (err) {
        setError(err.message)
      }
    }

    fetchServerStatus()
  }, [])

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Jungle Day 1</h1>

      <section>
        <h2>FastAPI Health Check</h2>
        <p>
          GET /health: <strong>{health}</strong>
        </p>
      </section>

      <section>
        <h2>PostgreSQL Connection</h2>
        {dbHealth ? (
          <pre>{JSON.stringify(dbHealth, null, 2)}</pre>
        ) : (
          <p>DB checking...</p>
        )}
      </section>

      {error && (
        <section>
          <h2>Error</h2>
          <p style={{ color: 'red' }}>{error}</p>
        </section>
      )}
    </main>
  )
}

export default App