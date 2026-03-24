import { useEffect } from 'react'
import { useNavigate } from 'react-router'

export function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Will check OPFS consent record once OPFS layer is implemented (T6)
    // For now, redirect to setup directly
    navigate('/setup', { replace: true })
  }, [navigate])

  return null
}
