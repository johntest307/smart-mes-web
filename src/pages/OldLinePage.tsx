import { useEffect, useRef } from 'react'

export default function OldLinePage() {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const resize = () => {
      if (ref.current) {
        ref.current.style.height = window.innerHeight - 64 + 'px'
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <iframe
      ref={ref}
      src="/old/line.html"
      style={{ width: '100%', border: 'none', display: 'block' }}
      title="人機料法環管理"
    />
  )
}
