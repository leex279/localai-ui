import React, { useState } from 'react';
import { SaveIcon, AlertCircleIcon, EyeIcon, EyeOffIcon, UploadIcon, Download, ClipboardCopy, Check } from 'lucide-react';
import { loadConfig } from '../config';

export interface EnvVariable {
  key: string;
  value: string;
  description?: string;
  required?: boolean;
}

interface EnvConfiguratorProps {
  onSave: (variables: EnvVariable[]) => void;
}

function parseEnvFile(envText: string): EnvVariable[] {
  const lines = envText.split('\n');
  let description = '';
  let required = false;
  const variables: EnvVariable[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      description = trimmed.replace(/^#\s?/, '');
      required = /\[required\]/i.test(trimmed);
      continue;
    }

    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      variables.push({
        key: key.trim(),
        value: rest.join('=').trim(),
        description: description.replace(/\[.*?\]\s*/, ''), // Remove category markers
        required,
      });
      description = '';
      required = false;
    }
  }
  return variables;
}

function generateEnvContent(variables: EnvVariable[]): string {
  return variables
    .map(variable => {
      const lines = [];
      if (variable.description) {
        lines.push(`# ${variable.description}`);
      }
      lines.push(`${variable.key}=${variable.value}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export default function EnvConfigurator({ onSave }: EnvConfiguratorProps) {
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setVariables(parseEnvFile(text));
    };
    reader.readAsText(file);
  };

  const handleVariableChange = (index: number, field: keyof EnvVariable, value: string | boolean) => {
    const updatedVariables = [...variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setVariables(updatedVariables);
  };

  const handleCopyToClipboard = async () => {
    const content = generateEnvContent(variables);
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const content = generateEnvContent(variables);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToFile = async () => {
    try {
      setSaveStatus('saving');
      setSaveError(null);
      
      const content = generateEnvContent(variables);
      const config = await loadConfig();
      const apiUrl = `${config.apiBaseUrl}/api/save-env`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save env file');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving env file:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Group variables by category based on description
  const groupedVariables = variables.reduce((acc, variable) => {
    const category = variable.description?.match(/\[(.*?)\]/)
      ? variable.description.match(/\[(.*?)\]/)![1]
      : 'Other';

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(variable);
    return acc;
  }, {} as Record<string, EnvVariable[]>);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Environment Variables</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {copySuccess ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleSaveToFile}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded transition-colors ${
                saveStatus === 'saving'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {saveStatus === 'saving' ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : saveStatus === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <SaveIcon className="w-4 h-4" />
              )}
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'success' ? 'Saved!' : 'Save to Disk'}
            </button>
            <label className="flex items-center cursor-pointer gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <UploadIcon className="w-4 h-4" />
              <span className="text-sm">Load .env File</span>
              <input
                type="file"
                accept=".env,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
        {fileName && (
          <div className="mt-2 text-xs text-gray-400">Loaded: {fileName}</div>
        )}
      </div>

      <div className="p-4 space-y-8">
        {Object.entries(groupedVariables).map(([category, categoryVariables]) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              {category}
            </h3>
            <div className="space-y-4">
              {categoryVariables.map((variable, idx) => {
                const originalIndex = variables.findIndex(v => v.key === variable.key);
                return (
                  <div key={variable.key} className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {variable.key}
                      </label>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => handleVariableChange(originalIndex, 'value', e.target.value)}
                        placeholder={variable.required ? "Required" : "Optional"}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          variable.required
                            ? 'border-amber-300 dark:border-amber-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      {variable.required && (
                        <div className="flex items-center text-amber-600 dark:text-amber-400">
                          <AlertCircleIcon className="w-4 h-4 mr-1" />
                          <span className="text-sm">Required</span>
                        </div>
                      )}
                      {variable.description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {variable.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}