import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  loading,
  emptyMessage = 'No data available',
  onRowClick
}: DataTableProps<T>) {
  return (
    <div className="bg-dark-200 border border-gold-700 rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-300 border-b border-gold-700">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key) + index}
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gold-500 uppercase tracking-wider whitespace-nowrap"
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-400">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                    <span className="ml-3 text-gray-400">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={item.id || rowIndex}
                  onClick={() => onRowClick?.(item)}
                  className={`hover:bg-dark-300 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((column, colIndex) => (
                    <td key={String(column.key) + colIndex} className="px-3 sm:px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                      {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
            <span className="ml-3 text-gray-400">Loading...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-dark-400">
            {data.map((item, rowIndex) => (
              <div
                key={item.id || rowIndex}
                onClick={() => onRowClick?.(item)}
                className={`p-4 space-y-2 hover:bg-dark-300 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column, colIndex) => (
                  <div key={String(column.key) + colIndex} className="flex justify-between items-start">
                    <span className="text-xs font-medium text-gold-500 uppercase">{column.label}:</span>
                    <span className="text-sm text-gray-300 text-right ml-2">
                      {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
