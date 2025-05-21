import React from 'react';
import { ComposeIncludes } from '../types';
import { Twitch as Switch } from 'lucide-react';

interface IncludeSelectorProps {
  includes: ComposeIncludes;
  onChange: (includes: ComposeIncludes) => void;
}

export default function IncludeSelector({ includes, onChange }: IncludeSelectorProps) {
  const handleToggle = (path: string) => {
    onChange({
      ...includes,
      [path]: !includes[path]
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 mb-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">External Configurations</h2>
      <div className="space-y-3">
        {Object.entries(includes).map(([path, enabled]) => (
          <div key={path} className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{path}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Include external Docker Compose configuration</p>
            </div>
            <button
              onClick={() => handleToggle(path)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}