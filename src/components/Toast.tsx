import { useStore } from '../store'

export function Toast() {
  const toast = useStore(s => s.toast)
  const dismissToast = useStore(s => s.dismissToast)
  if (!toast) return null
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in cursor-pointer"
      onClick={dismissToast}
    >
      {toast.message}
    </div>
  )
}
