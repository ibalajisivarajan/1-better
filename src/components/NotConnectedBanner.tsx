export function NotConnectedBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2"
      style={{ backgroundColor: 'rgba(242, 236, 224, 0.95)', borderBottom: '1px solid rgba(154, 143, 126, 0.3)' }}
      role="banner"
      aria-label="Configuration notice"
    >
      <p className="font-body text-xs text-center" style={{ color: '#9A8F7E' }}>
        Connect Supabase to activate — see{' '}
        <code className="font-mono bg-black/5 px-1 rounded">.env.example</code>
      </p>
    </div>
  )
}
