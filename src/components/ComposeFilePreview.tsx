import React, { useState } from 'react';
import { validateComposeFile } from '../utils/composeFileGenerator';

interface ComposeFilePreviewProps {
  yamlContent: string;
  onDownload: () => void;
}

export default function ComposeFilePreview({ yamlContent, onDownload }: ComposeFilePreviewProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  
  const validation = validateComposeFile(yamlContent);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlContent).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        console.error('Failed to copy');
      }
    );
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Generated YAML</h2>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onDownload}
            disabled={!validation.valid}
            className={`px-3 py-1.5 text-sm font-medium text-white rounded transition-colors ${
              validation.valid
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Download
          </button>
        </div>
      </div>
      
      {validation.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400 text-sm">
          <p className="font-semibold">Invalid YAML:</p>
          <ul className="list-disc list-inside">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <pre className="p-4 overflow-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-300 text-sm font-mono h-[500px] rounded-b-lg">
        {yamlContent || 'No services selected'}
      </pre>
    </div>
  );
}