interface OAuthPopupOptions {
  authUrl: string;
  windowName: string;
  width?: number;
  height?: number;
  onCode: (code: string) => void;
  onClose?: () => void;
}

/**
 * Open a centered OAuth popup and invoke callbacks when authentication completes or the popup closes.
 *
 * Polls the popup's URL every 500ms and, when a `code` query parameter is detected, closes the popup and calls `onCode(code)`. If the popup is closed before a code is received, calls `onClose` if provided. Cross-origin access errors are ignored until the provider redirects back to a same-origin URL.
 *
 * @param onCode - Callback invoked with the authorization `code` when detected in the popup URL
 * @param onClose - Optional callback invoked if the popup is closed before an authorization code is received
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
