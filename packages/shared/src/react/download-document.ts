/**
 * Downloads a file from a same-origin URL without opening a new tab or navigating.
 *
 * The invoicing API's `?format=pdf&download=true` endpoint responds with a
 * `Content-Disposition: attachment` header, so a programmatic click on a hidden
 * anchor pointing at it triggers the browser's download manager in place — unlike
 * `window.open`, which navigates a fresh tab to the URL and leaves it blank once the
 * download starts.
 *
 * Must be called from a browser context (e.g. a client-component click handler).
 */
export function downloadDocumentUrl(url: string, filename?: string): void {
    if (typeof document === "undefined") return

    const anchor = document.createElement("a")
    anchor.href = url
    // When omitted, the server's Content-Disposition filename is used.
    if (filename) anchor.download = filename
    anchor.rel = "noopener"
    anchor.style.display = "none"

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
}
