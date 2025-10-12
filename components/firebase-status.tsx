"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react'

export function FirebaseStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'offline'>('connecting')

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple connection test
        const response = await fetch('https://www.google.com', { 
          mode: 'no-cors',
          cache: 'no-cache'
        })
        setStatus('connected')
      } catch (error) {
        setStatus('error')
      }
    }

    const handleOnline = () => {
      setStatus('connecting')
      checkConnection()
    }

    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800'
        }
      case 'connected':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Online',
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800'
        }
      case 'error':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800'
        }
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          variant: 'destructive' as const,
          className: 'bg-gray-100 text-gray-800'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant={config.variant} className={config.className}>
        {config.icon}
        <span className="ml-1 text-xs">{config.text}</span>
      </Badge>
    </div>
  )
}
