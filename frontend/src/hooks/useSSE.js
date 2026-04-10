import { useEffect, useRef } from 'react'

export function useSSE(handlers) {
  const srcRef = useRef(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    let retryTimer = null

    const connect = () => {
      if (srcRef.current) srcRef.current.close()
      const src = new EventSource('/api/stream')
      srcRef.current = src

      Object.entries(handlersRef.current).forEach(([event, handler]) => {
        src.addEventListener(event, e => {
          try { handler(JSON.parse(e.data)) } catch (_) {}
        })
      })

      src.onerror = () => {
        src.close()
        retryTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      srcRef.current?.close()
      clearTimeout(retryTimer)
    }
  }, [])
}
