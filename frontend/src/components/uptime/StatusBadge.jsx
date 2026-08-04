export default function StatusBadge({ status }) {
  const color = status === 'up' ? 'bg-green-500' : status === 'down' ? 'bg-red-500' : 'bg-gray-500';
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="capitalize text-sm">{status || 'unknown'}</span>
    </span>
  );
}
