import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauri } from './tauri-native';

/**
 * Checks the releases endpoint for a newer version. If found, prompts the
 * user, downloads + installs, then relaunches. Never throws — a failed or
 * offline check must not block app startup.
 */
export async function checkForAppUpdate(): Promise<void> {
  if (!isTauri()) return;
  try {
    const update = await check();
    if (!update) return;

    const yes = window.confirm(
      `Azzay Pharmacy ${update.version} is available (installed: ${update.currentVersion}).\n\n` +
        `${update.body ? update.body + '\n\n' : ''}Update now? The app will restart.`,
    );
    if (!yes) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (err) {
    console.warn('[updater] check failed:', err);
  }
}
