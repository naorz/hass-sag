/**
 * All OPFS paths used by SAG, relative to the /sag/ root.
 * Use these constants instead of bare strings to prevent typos.
 */
export const PATHS = {
  /** Partial GeneratorConfig: domain, subdomains, certStrategy, family members */
  config: 'config.json',

  /** Flow state: step statuses, current step index, timestamps */
  state: 'state.json',

  /** Consent record: { version, acceptedAt } */
  consent: 'consent.json',

  /** AES-GCM encrypted CF credentials (serialised EncryptedPayload JSON) */
  credentials: 'credentials.enc',

  certs: {
    /** RSA private key PEM */
    key: 'certs/client.key',
    /** Certificate Signing Request PEM */
    csr: 'certs/client.csr',
    /** Signed certificate PEM (returned by Cloudflare) */
    pem: 'certs/client.pem',
    /** PKCS#12 bundle (binary) */
    p12: 'certs/device-cert.p12',
  },
} as const
