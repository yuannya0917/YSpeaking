import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ChattingPage from './pages/ChattingPage.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChattingPage/>
  </StrictMode>,
)
