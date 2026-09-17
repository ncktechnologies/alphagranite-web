import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import './index.css'
import { App} from './App.tsx'
import '@google/model-viewer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
