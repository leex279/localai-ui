import { EnvVariable } from '../types';
import { loadConfig } from '../config';

export async function loadEnvFile(path: string): Promise<EnvVariable[]> {
  try {
    console.log(`[DEBUG] Loading env file from: ${path}`);
    
    // Get the API base URL from config
    const config = await loadConfig();
    
    // Construct the full API URL
    const apiUrl = `${config.apiBaseUrl}${path}`;
    
    console.log(`[DEBUG] Actual env file fetch URL: ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to load .env file (${response.status}): ${errorText}`);
      throw new Error(`Failed to load .env file: ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log(`[DEBUG] Loaded env file content length: ${content.length} bytes`);
    console.log(`[DEBUG] First 100 chars: ${content.substring(0, 100)}...`);
    return parseEnvFile(content);
  } catch (error) {
    console.error('[ERROR] Failed to load .env file:', error);
    throw error;
  }
}

export function parseEnvFile(content: string): EnvVariable[] {
  const lines = content.split('\n');
  const variables: EnvVariable[] = [];
  let currentDescription = '';
  let currentCategory = '';
  let isRequired = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }

    // Handle comments and categories
    if (trimmedLine.startsWith('#')) {
      // Check for required tag
      if (trimmedLine.toLowerCase().includes('[required]')) {
        isRequired = true;
      }
      
      // Check for category headers
      if (trimmedLine.includes('####')) {
        currentCategory = 'Other';
        // Look for category in the next few lines
        for (let i = lines.indexOf(line); i < lines.indexOf(line) + 3; i++) {
          if (lines[i] && lines[i].includes('[required]')) {
            currentCategory = 'Required Configuration';
            break;
          }
        }
      } else {
        // Regular comment - add to current description
        const comment = trimmedLine.substring(1).trim();
        if (comment) {
          currentDescription = currentDescription ? `${currentDescription}\n${comment}` : comment;
        }
      }
      continue;
    }

    // Parse variable declaration
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      
      variables.push({
        key,
        value,
        description: currentCategory ? `[${currentCategory}] ${currentDescription}` : currentDescription,
        required: isRequired
      });
      
      // Reset for next variable
      currentDescription = '';
      isRequired = false;
    }
  }

  return variables;
}

export function generateEnvFile(variables: EnvVariable[]): string {
  let output = '';
  let currentCategory = '';

  for (const variable of variables) {
    // Handle category changes
    if (variable.description?.includes('[')) {
      const categoryMatch = variable.description.match(/\[(.*?)\]/);
      if (categoryMatch && categoryMatch[1] !== currentCategory) {
        currentCategory = categoryMatch[1];
        output += `\n############\n# ${currentCategory}\n############\n\n`;
      }
    }

    // Add description as comment if present
    if (variable.description) {
      const description = variable.description
        .replace(/\[.*?\]\s*/, '') // Remove category marker
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => `# ${line}`)
        .join('\n');
      
      if (description) {
        output += `${description}\n`;
      }
    }

    // Add the variable declaration
    output += `${variable.key}=${variable.value}\n`;
  }

  return output.trim();
}

export async function saveEnvFile(variables: EnvVariable[], outputPath: string): Promise<void> {
  const content = generateEnvFile(variables);
  
  try {
    console.log(`[DEBUG] Saving env file, length: ${content.length} bytes`);
    
    const config = await loadConfig();
    const apiUrl = `${config.apiBaseUrl}/api/save-env`;
    
    console.log(`[DEBUG] Using API URL for saving env: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        path: `${outputPath}/.env`
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Failed to save .env file (${response.status}): ${errorText}`);
      throw new Error('Failed to save .env file');
    }
    
    console.log('[DEBUG] Env file saved successfully');
  } catch (error) {
    console.error('[ERROR] Error saving .env file:', error);
    throw error;
  }
}