import fs from 'fs';
import path from 'path';

/**
 * Force-loads an environment variable from .env.local if it exists,
 * bypassing potential system-level overrides.
 */
export function getEnvVar(name: string): string {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const fileContent = fs.readFileSync(envPath, 'utf-8');
      const lines = fileContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${name}=`)) {
          const value = trimmed.substring(name.length + 1);
          // Remove potential quotes and comments
          return value
            .replace(/#.*$/, '') // remove comments
            .trim()
            .replace(/^["']|["']$/g, ''); // remove wrapping quotes
        }
      }
    }
  } catch (error) {
    console.error(`Error reading .env.local for ${name}:`, error);
  }

  // Fallback to standard process.env if not found or error
  return process.env[name] || '';
}
