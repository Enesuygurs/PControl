import fs from 'fs';
import path from 'path';

const CONFIG_FILENAME = 'pcontrol-config.json';

function getConfigPath() {
  const userDataPath = process.env.USER_DATA_PATH || process.cwd();
  return path.join(userDataPath, CONFIG_FILENAME);
}

export function getConfig() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse config', e);
      return {};
    }
  }
  return {};
}

export function setConfig(config: any) {
  const configPath = getConfigPath();
  const currentConfig = getConfig();
  const newConfig = { ...currentConfig, ...config };
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
  return newConfig;
}
