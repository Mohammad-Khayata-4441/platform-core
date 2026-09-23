/**
 * Prints a document from a same-origin URL without navigating the current page.
 *
 * Creates an off-screen iframe pointed at `url` (e.g. the invoicing API's
 * `?format=html` endpoint, served same-origin through the /backend proxy), waits
 * for it to load, then prints just that frame. Because the invoice HTML is its own
 * document with its own embedded CSS, the host app's styles never leak in — and the
 * user stays on the current page. The iframe removes itself once printing finishes.
 *
 * Must be called from a browser context (e.g. a client-component click handler).
 */
export function printDocumentUrl(url: string): void {
    if (typeof document === "undefined") return

    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.position = "fixed"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.right = "0"
    iframe.style.bottom = "0"

    let cleaned = false
    const cleanup = () => {
        if (cleaned) return
        cleaned = true
        // Defer removal so an in-progress print dialog isn't torn down under it.
        setTimeout(() => iframe.remove(), 1000)
    }

    iframe.onload = () => {
        const win = iframe.contentWindow
        if (!win) {
            cleanup()
            return
        }
        win.addEventListener("afterprint", cleanup)
        win.focus()
        win.print()
        // Safety net for browsers that never fire `afterprint`.
        setTimeout(cleanup, 60000)
    }

    iframe.src = url
    document.body.appendChild(iframe)
}
