interface OAuthPopupOptions {
  authUrl: string;
  windowName: string;
  width?: number;
  height?: number;
  onCode: (code: string) => void;
  onClose?: () => void;
}

/**
 * Opens a centered OAuth popup window and polls for the authorization code
 *
 * This function creates a popup window for OAuth authentication, automatically
 * centers it on the screen with a margin, and polls the popup's URL every
 * 500ms to detect when the OAuth provider redirects back with an authorization code.
 *
 * @param options - Configuration options for the popup
 * @param options.authUrl - The OAuth authorization URL to open
 * @param options.windowName - The name/target for the popup window
 * @param options.width - Width of the popup in pixels (default: 600)
 * @param options.height - Height of the popup in pixels (default: 850)
 * @param options.onCode - Callback invoked with the authorization code when received
 * @param options.onClose - Optional callback invoked when popup closes without a code
 */
export function openOAuthPopup({
  authUrl,
  windowName,
  width = 600,
  height = 850,
  onCode,
  onClose,
}: OAuthPopupOptions): void {
  const screenLeft = window.screenLeft;
  const screenTop = window.screenTop;
  const screenWidth = screen.availWidth;
  const screenHeight = screen.availHeight;

  const left =
    screenLeft + Math.max(10, Math.min(screenWidth - width - 10, (screenWidth - width) / 2));
  const top =
    screenTop + Math.max(10, Math.min(screenHeight - height - 10, (screenHeight - height) / 2));

  const popup = window.open(
    authUrl,
    windowName,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
  );

  if (!popup) {
    return;
  }

  const interval = setInterval(() => {
    try {
      if (!popup || popup.closed) {
        clearInterval(interval);
        onClose?.();
        return;
      }

      const url = new URL(popup.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        clearInterval(interval);
        popup.close();
        onCode(code);
      }
    } catch (err) {
      // Ignore cross-origin errors until OAuth redirects back
    }
  }, 500);
}
