import { $, fs } from 'zx'
import { join as pathJoin } from 'node:path'

export const ssl = {
  async generateKey(outputPath: string): Promise<void> {
    await $`openssl genrsa -out ${outputPath} 2048`
  },

  async generateCsr(keyPath: string, outputPath: string, commonName: string): Promise<void> {
    await $`openssl req -new -key ${keyPath} -out ${outputPath} -subj "/CN=${commonName}"`
  },

  async generateP12(outputPath: string, keyPath: string, pemPath: string): Promise<void> {
    // -legacy: use algorithms compatible with macOS Keychain and older systems
    // Without this, OpenSSL 3.x uses new MAC/encryption that macOS security import rejects
    // with "MAC verification failed during PKCS12 import (wrong password?)"
    await $`openssl pkcs12 -export -out ${outputPath} -inkey ${keyPath} -in ${pemPath} -passout pass: -legacy`
  },

  async signMobileConfig(inputPath: string, outputPath: string, certName: string): Promise<void> {
    await $`security cms -S -N ${certName} -i ${inputPath} -o ${outputPath}`
  },

  async getIdentities(validOnly = true): Promise<{ hash: string; name: string }[]> {
    if (process.platform !== 'darwin') return []
    try {
      const args = ['find-identity', '-p', 'codesigning']
      if (validOnly) args.push('-v')
      const result = await $`security ${args}`

      const lines = result.toString().split('\n')
      const identities: { hash: string; name: string }[] = []

      // Regex to match "  1) HASH "Name""
      const regex = /\s+\d+\)\s+([A-Fa-f0-9]{40})\s+"([^"]+)"/

      for (const line of lines) {
        const match = line.match(regex)
        if (match) {
          identities.push({ hash: match[1], name: match[2] })
        }
      }
      return identities
    } catch {
      return []
    }
  },

  async createCodeSigningCert(name: string, tmpDir: string): Promise<void> {
    const keyPath = pathJoin(tmpDir, 'signing.key')
    const crtPath = pathJoin(tmpDir, 'signing.crt')
    const p12Path = pathJoin(tmpDir, 'signing.p12')
    const cnfPath = pathJoin(tmpDir, 'cert.cnf')

    const cnf = `
[ req ]
distinguished_name = req_distinguished_name
prompt = no
[ req_distinguished_name ]
CN = ${name}
[ v3_req ]
keyUsage = critical, digitalSignature
extendedKeyUsage = codeSigning
`
    await fs.writeFile(cnfPath, cnf)
    await $`openssl req -newkey rsa:2048 -nodes -keyout ${keyPath} -x509 -days 365 -out ${crtPath} -config ${cnfPath} -extensions v3_req`
    await $`openssl pkcs12 -export -out ${p12Path} -inkey ${keyPath} -in ${crtPath} -passout pass:sag`
    // Importing with -A allows all applications to access this item, reducing permission prompts
    await $`security import ${p12Path} -k ~/Library/Keychains/login.keychain-db -P sag -T /usr/bin/security -A`
  },

  async deleteIdentity(hash: string): Promise<void> {
    if (process.platform !== 'darwin') return
    try {
      // Delete the certificate by SHA-1 hash using -Z
      // -t: delete both certificate and private key
      await $`security delete-certificate -Z ${hash} -t`
    } catch {
      // Ignore if not found
    }
  },
}
