import { getAccessToken } from './authApi'

const API_BASE_URL = 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = getAccessToken()

  if (!token) {
    throw new Error('로그인이 필요합니다.')
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

async function postJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  })

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`)
  }

  return response.json()
}

export async function createTodayBriefing() {
  return postJson('/ai/today-briefing')
}

export async function createTeamSummary() {
  return postJson('/ai/team-summary')
}