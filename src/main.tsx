import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import outputs from '../amplify_outputs.json'
import './index.css'
import App from './App.tsx'
import { stockingTheme } from './theme/amplifyTheme'
import { AuthHeader } from './theme/AuthHeader'

Amplify.configure(outputs)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={stockingTheme}>
      <Authenticator components={{ Header: AuthHeader }}>
        <App />
      </Authenticator>
    </ThemeProvider>
  </StrictMode>,
)
