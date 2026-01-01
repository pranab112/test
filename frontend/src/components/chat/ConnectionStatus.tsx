import { useWebSocket } from '@/contexts/WebSocketContext';

export default function ConnectionStatus() {
  const { connectionStatus, isConnected } = useWebSocket();

  if (isConnected) {
    return null; // Don't show when connected
  }

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50 ${
        connectionStatus === 'connecting'
          ? 'bg-yellow-500 text-gray-900'
          : 'bg-red-500 text-white'
      }`}
    >
      {connectionStatus === 'connecting' ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent"></div>
          <span className="text-sm font-medium">Connecting...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm font-medium">Disconnected</span>
        </>
      )}
    </div>
  );
}
