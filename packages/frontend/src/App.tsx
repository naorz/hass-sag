import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import { LandingPage } from './routes/landing'
import { TermsPage } from './routes/terms'
import { SetupPage } from './routes/setup'

const router = createBrowserRouter(
  [
    { path: '/', element: <LandingPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/setup', element: <SetupPage /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL },
)

export function App() {
  return <RouterProvider router={router} />
}
