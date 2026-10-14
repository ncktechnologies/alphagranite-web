import '@/lib/install-app-clock'; // must stay first: locks the app clock to America/Chicago
import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import { App} from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
