import React, { useState } from 'react';
import { validateComposeFile } from '../utils/composeFileGenerator';
import { SaveIcon, Download, ClipboardCopy, Check, XCircle, AlertTriangle } from 'lucide-react';
import { loadConfig } from '../config';

interface ComposeFilePreviewProps {
  yamlContent: string;
  onDownload: () => void;
}

export default function ComposeFilePreview({ yamlContent, onDownload }: ComposeFilePreviewProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const validation = validateComposeFile(yamlContent);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlContent).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      () => {
        console.error('[ERROR] Failed to copy');
      }
    );
  };

  const handleSaveToFile = async () => {
    try {
      setSaveStatus('saving');
      setSaveError(null);
      console.log(`[DEBUG] Saving compose file, length: ${yamlContent.length} bytes`);
      
      const config = await loadConfig();
      
      // Adjust API URL for Docker if needed
      const apiUrl = window.location.hostname === 'localhost'
        ? `${config.apiBaseUrl}/api/save-compose`
        : `${config.apiBaseUrl.replace('localhost', window.location.hostname)}/api/save-compose`;
      
      console.log(`[DEBUG] Using API URL for saving compose: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: yamlContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[ERROR] Failed to save compose file (${response.status}):`, errorData);
        throw new Error(errorData.message || 'Failed to save compose file');
      }

      const result = await response.json();
      console.log('[DEBUG] Save compose response:', result);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('[ERROR] Error saving compose file:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Generated YAML</h2>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onDownload}
            disabled={!validation.valid}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded transition-colors ${
              validation.valid
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleSaveToFile}
            disabled={!validation.valid || saveStatus === 'saving'}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded transition-colors ${
              validation.valid && saveStatus !== 'saving'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {saveStatus === 'saving' ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : saveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : saveStatus === 'error' ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <SaveIcon className="w-4 h-4" />
            )}
            {saveStatus === 'saving' ? 'Saving...' : 
             saveStatus === 'success' ? 'Saved!' :
             saveStatus === 'error' ? 'Error!' : 'Save to Disk'}
          </button>
        </div>
      </div>
      
      {saveStatus === 'error' && saveError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400 text-sm">
          <p className="font-semibold flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            Error saving file:
          </p>
          <p className="ml-5">{saveError}</p>
        </div>
      )}
      
      {validation.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400 text-sm">
          <p className="font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Invalid YAML:
          </p>
          <ul className="list-disc list-inside ml-2 mt-1">
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