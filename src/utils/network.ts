/** Cloudflare zone/account IDs are 32-character hex strings */
export function isValidCfId(value: string): boolean {
  return /^[0-9a-f]{32}$/i.test(value)
}

export const network = {
  /**
   * Cleans a domain string by removing protocol (http/https),
   * credentials, and any trailing paths or query parameters.
   */
  cleanDomain(input: string): string {
    let cleaned = input.trim().toLowerCase()

    // Remove protocol
    cleaned = cleaned.replace(/^(https?:\/\/)/, '')

    // Remove credentials (user:pass@)
    cleaned = cleaned.replace(/^.*@/, '')

    // Remove path and trailing slash
    cleaned = cleaned.split('/')[0]

    // Remove port
    cleaned = cleaned.split(':')[0]

    return cleaned
  },

  /**
   * Validates if a string is a valid domain name.
   */
  validateDomain(domain: string): boolean {
    if (!domain) return false

    // Basic domain regex
    // - Letters, numbers, hyphens
    // - Must have at least one dot
    // - TLD must be at least 2 characters
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i

    return domainRegex.test(domain)
  },
}
