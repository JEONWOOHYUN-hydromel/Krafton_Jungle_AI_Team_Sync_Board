import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/LoginPage'
import PostCreatePage from './pages/PostCreatePage'
import PostDetailPage from './pages/PostDetailPage'
import PostEditPage from './pages/PostEditPage'
import PostsPage from './pages/PostsPage'
import SignupPage from './pages/SignupPage'
import NotionDocsPage from './pages/NotionDocsPage'
import DashboardPage from './pages/DashboardPage'
import RagPage from './pages/RagPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/posts" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/notion-docs" element={<NotionDocsPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/rag" element={<RagPage />} />
      <Route path="/posts" element={<PostsPage />} />
      <Route path="/posts/new" element={<PostCreatePage />} />
      <Route path="/posts/:postId" element={<PostDetailPage />} />
      <Route path="/posts/:postId/edit" element={<PostEditPage />} />
    </Routes>
  )
}

export default App
