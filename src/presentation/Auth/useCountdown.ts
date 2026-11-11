import { useCallback, useEffect, useState } from 'react'

/** Segundos que faltam para liberar o reenvio, e como reiniciar a contagem. */
export function useCountdown(seconds: number): [number, () => void] {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) return
    const timer = window.setTimeout(() => setLeft((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [left])

  const restart = useCallback(() => setLeft(seconds), [seconds])
  return [left, restart]
}
