import React from 'react';
import { SaveIcon, AlertCircleIcon, EyeIcon, EyeOffIcon, UploadIcon } from 'lucide-react';

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
    } else if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      variables.push({
        key: key.trim(),
        value: rest.join('=').trim(),
        description,
        required,
      });
      description = '';
      required = false;
    }
  }
  return variables;
}

export default function EnvConfigurator({ onSave }: EnvConfiguratorProps) {
  const [variables, setVariables] = React.useState<EnvVariable[]>([]);
  const [showSecrets, setShowSecrets] = React.useState<Record<string, boolean>>({});
  const [fileName, setFileName] = React.useState<string>('');

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

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Group variables by category in [category] in description
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
            <label className="flex items-center cursor-pointer gap-2 bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              <UploadIcon className="w-4 h-4" />
              <span className="text-sm">Load .env File</span>
              <input
                type="file"
                accept=".env,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              onClick={() => onSave(variables)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <SaveIcon className="w-4 h-4" />
              Save Configuration
            </button>
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
                const isSecret = variable.key.toLowerCase().includes('password') ||
                  variable.key.toLowerCase().includes('secret') ||
                  variable.key.toLowerCase().includes('key');
                // Remove category from description
                const description = variable.description?.replace(/\[.*?\]\s*/, '');
                return (
                  <div key={variable.key} className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {variable.key}
                      </label>
                    </div>
                    <div className="col-span-4 relative">
                      <input
                        type={isSecret && !showSecrets[variable.key] ? "password" : "text"}
                        value={variable.value}
                        onChange={(e) => handleVariableChange(originalIndex, 'value', e.target.value)}
                        placeholder={variable.required ? "Required" : "Optional"}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          variable.required
                            ? 'border-amber-300 dark:border-amber-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(variable.key)}
                          className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showSecrets[variable.key] ? (
                            <EyeOffIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      {variable.required && (
                        <div className="flex items-center text-amber-600 dark:text-amber-400">
                          <AlertCircleIcon className="w-4 h-4 mr-1" />
                          <span className="text-sm">Required</span>
                        </div>
                      )}
                      {description && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {description}
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
