import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import ChattingPage from './pages/ChattingPage/ChattingPage.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChattingPage/>
  </StrictMode>,
)
