import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './styles/index.css'
import ChatPage from './pages/ChatPage/ChatPage.tsx'

const prepareMocks = async () => {
  if (import.meta.env.DEV || import.meta.env.PROD) {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    })
  }
}

await prepareMocks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6FC2AE', // 主绿
          colorPrimaryHover: '#44A18A',
          colorPrimaryActive: '#44A18A',
          colorLink: '#44A18A',
          colorLinkHover: '#6FC2AE',
          colorLinkActive: '#44A18A',
          borderRadius: 10,
        },
      }}
    >
      <ChatPage />
    </ConfigProvider>
  </StrictMode>,
)
