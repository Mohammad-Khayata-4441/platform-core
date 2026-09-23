
export function extractSubdomain(host: string, baseDomain: string): string {
    // Strip the port from the host
    const cleanHost = host.split(':')[0] || host;

    let subDomain = '';

    // Extract subdomain: check if host ends with .baseDomain
    if (cleanHost.endsWith(`.${baseDomain}`)) {
        subDomain = cleanHost.replace(`.${baseDomain}`, '');
    } else if (cleanHost.includes('.') && !cleanHost.endsWith(baseDomain)) {
        // Fallback: if host has dots and doesn't end with baseDomain, 
        // try to extract subdomain by splitting on the first dot
        const parts = cleanHost.split('.');
        if (parts.length > 1 && parts[0]) {
            // For localhost subdomains like "merchant-default-store.localhost"
            subDomain = parts[0];
        }
    }

    // Return empty string if host is exactly the base domain
    if (!subDomain || cleanHost === baseDomain) {
        return '';
    }

    return subDomain;
}

