interface TypingIndicatorProps {
  username: string;
}

export default function TypingIndicator({ username }: TypingIndicatorProps) {
  return (
    <div className="flex items-center space-x-2 px-4 py-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-sm text-gray-400">{username} is typing...</span>
    </div>
  );
}
