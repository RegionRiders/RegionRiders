export interface OpenOAuthPopupOptions {
  authUrl: string;
  windowName: string;
  width?: number;
  height?: number;
  onCode: (code: string) => void;
  onClose?: () => void;
}

/**
 * Opens an OAuth popup window and polls for the authorization code.
 * Calls onCode when the code parameter is detected in the redirect URL.
 * Calls onClose when the user closes the popup without completing authorization.
 */
export function openOAuthPopup({
  authUrl,
  windowName,
  width = 600,
  height = 700,
  onCode,
  onClose,
}: OpenOAuthPopupOptions): void {
  const left = Math.round(window.screenLeft + (screen.availWidth - width) / 2);
  const top = Math.round(window.screenTop + (screen.availHeight - height) / 2);
  const features = `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`;

  const popup = window.open(authUrl, windowName, features);

  if (!popup) {
    return;
  }

  const interval = setInterval(() => {
    if (popup.closed) {
      clearInterval(interval);
      onClose?.();
      return;
    }

    try {
      const href = popup.location.href;
      const url = new URL(href);
      const code = url.searchParams.get('code');

      if (code) {
        clearInterval(interval);
        popup.close();
        onCode(code);
      }
    } catch {
      // Cross-origin access – popup is still on the provider's domain, ignore
    }
  }, 500);
}
