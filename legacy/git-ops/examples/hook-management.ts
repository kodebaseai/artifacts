/**
 * Hook Management Example
 *
 * This example demonstrates how to manage git hooks:
 * installation, status checking, and uninstallation.
 */

import { HookInstaller } from '@kodebase/git-ops';

async function hookManagement() {
  const installer = new HookInstaller();
  const repoPath = process.cwd();

  // Check current hook status
  console.log('Checking hook status...');
  const currentStatus = await installer.status(repoPath);

  console.table(
    currentStatus.map((hook) => ({
      Hook: hook.name,
      Installed: hook.installed ? '✓' : '✗',
      'Kodebase Managed': hook.isKodebase ? '✓' : '✗',
    })),
  );

  // Install specific hooks
  console.log('\nInstalling specific hooks...');
  const installResult = await installer.install({
    repoPath,
    hooks: ['post-checkout', 'pre-commit'], // Only install these two
  });

  if (installResult.success) {
    console.log('Successfully installed:', installResult.installed);
    console.log('Backups created:', installResult.backups);
  } else {
    console.error('Installation failed:', installResult.error);
    return;
  }

  // Check status again
  console.log('\nChecking status after installation...');
  const afterInstall = await installer.status(repoPath);

  console.table(
    afterInstall.map((hook) => ({
      Hook: hook.name,
      Installed: hook.installed ? '✓' : '✗',
      'Kodebase Managed': hook.isKodebase ? '✓' : '✗',
    })),
  );

  // Uninstall hooks (with backup restoration)
  console.log('\nUninstalling hooks...');
  const uninstallResult = await installer.uninstall({
    repoPath,
    restoreBackups: true, // Restore original hooks if any
  });

  if (uninstallResult.success) {
    console.log('Successfully uninstalled:', uninstallResult.uninstalled);
    console.log('Restored from backup:', uninstallResult.restored);
  } else {
    console.error('Uninstallation failed:', uninstallResult.error);
  }
}

// Run the example
hookManagement().catch(console.error);
