import { useEffect, useRef } from 'react'

export default function TempHumidityPage() {
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
      src="/temp-humidity/index.html"
      style={{ width: '100%', border: 'none', display: 'block' }}
      title="溫濕度監控儀錶板"
    />
  )
}
