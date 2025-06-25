'use client'

import Script from 'next/script'
import { useEffect } from 'react'

interface UnicornStudioProps {
  projectId: string
  className?: string
  asBackground?: boolean
}

export function UnicornStudio({ projectId, className = '', asBackground = false }: UnicornStudioProps) {
  const backgroundStyles = asBackground ? {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
    pointerEvents: 'none' as const
  } : {
    width: '800px',
    height: '600px'
  }

  useEffect(() => {
    const removeUnicornStudioLink = () => {
      const links = document.querySelectorAll('a[href*="unicorn.studio"]')
      links.forEach(link => link.remove())
    }

    // Initial check
    removeUnicornStudioLink()

    // Set up observer to watch for DOM changes
    const observer = new MutationObserver(removeUnicornStudioLink)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Cleanup
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.25/dist/unicornStudio.umd.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== 'undefined') {
            const unicornStudio = (window as any).UnicornStudio;
            if (unicornStudio && !unicornStudio.isInitialized) {
              unicornStudio.init();
              unicornStudio.isInitialized = true;
            }
          }
        }}
      />
      
      <div 
        data-us-project={projectId}
        className={className}
        style={backgroundStyles}
      />
    </>
  )
}