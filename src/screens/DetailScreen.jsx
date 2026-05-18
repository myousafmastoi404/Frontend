import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { Download, Share2, AlertCircle, Loader } from 'lucide-react'
import { PropellerAd } from '../components/PropellerAd.jsx'
import { useAdSettings } from '../hooks/useAdSettings.js'

export function DetailScreen({ route, navigation }) {
  const { promptId } = route.params
  const [prompt, setPrompt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [showDownloadAd, setShowDownloadAd] = useState(false)
  const { adSettings } = useAdSettings()

  useEffect(() => {
    loadPrompt()
  }, [promptId])

  async function loadPrompt() {
    try {
      const data = await api.getPrompt(promptId)
      setPrompt(data)
    } catch (e) {
      alert('Error: ' + e.message)
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!prompt?.output_urls?.[0]) return

    // Show download ad immediately when user clicks Download
    if (adSettings.download_ad) setShowDownloadAd(true)

    const url = prompt.output_urls[0]
    const fileName = `autoflow-${promptId}${url.endsWith('.mp4') ? '.mp4' : '.jpg'}`

    // Supabase Storage supports ?download=filename parameter natively.
    // It adds Content-Disposition: attachment header to the response.
    // In Android WebView APK: this triggers DownloadListener → DownloadManager saves file
    // In web browser: this triggers a normal file download
    // No backend proxy, no token exposure, no corrupted files — direct from Supabase CDN
    const separator = url.includes('?') ? '&' : '?'
    const downloadUrl = url + separator + 'download=' + encodeURIComponent(fileName)
    window.open(downloadUrl, '_blank')
  }

  async function handleShare() {
    if (!prompt?.output_urls?.[0]) return
    const shareUrl = prompt.output_urls[0]
    try {
      // navigator.share works in browsers but NOT in Android WebView
      // So we try it, but fallback to clipboard copy
      if (navigator.share) {
        await navigator.share({
          title: 'AutoFlow Media',
          text: prompt.prompt,
          url: shareUrl
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (e) {
      // If share was cancelled or failed, try clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      } catch {
        // Final fallback: manual copy
        window.prompt('Copy this link:', shareUrl)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-dark-bg">
        <Loader className="w-8 h-8 text-primary spinner" />
      </div>
    )
  }

  if (!prompt) return null

  const imageUrl = prompt.output_urls?.[0]

  return (
    <div className="flex flex-col h-full bg-dark-bg overflow-y-auto">
      {/* Propeller Ad — fires on every Download button click */}
      <PropellerAd show={showDownloadAd} onAdShown={() => setShowDownloadAd(false)} />

      {/* Media Display */}
      <div className="w-full bg-dark-card border-b border-dark-border flex items-center justify-center" style={{ aspectRatio: '1' }}>
        {imageUrl ? (
          prompt.mode === 'VIDEO' ? (
            <video
              src={imageUrl}
              className="w-full h-full object-contain"
              autoPlay loop controls playsInline
            />
          ) : (
            <img src={imageUrl} alt={prompt.prompt} className="w-full h-full object-contain" />
          )
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-6xl">🖼️</div>
            <p className="text-dark-text-muted">
              {prompt.status === 'pending' || prompt.status === 'processing'
                ? 'Generating...'
                : 'No output yet'}
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 space-y-4">
        <div className="bg-dark-card rounded-2xl p-4 border border-dark-border space-y-3">
          <div className="flex justify-between items-center">
            <StatusBadge status={prompt.status} />
            <span className="text-xs text-dark-text-muted">{prompt.mode} · {prompt.ratio}</span>
          </div>

          <p className="text-sm text-white leading-relaxed">{prompt.prompt}</p>

          <p className="text-xs text-dark-text-muted">
            Created {new Date(prompt.created_at).toLocaleString()}
          </p>

          {prompt.failure_reason && (
            <div className="flex gap-2 bg-red-900/20 border border-red-900 rounded-lg p-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{prompt.failure_reason}</p>
            </div>
          )}
        </div>

        {imageUrl && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-light active:bg-primary-light transition-colors text-white font-semibold rounded-xl disabled:opacity-60"
            >
              {downloading ? <Loader size={18} className="spinner" /> : <Download size={18} />}
              Download
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-700 transition-colors text-white font-semibold rounded-xl"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
