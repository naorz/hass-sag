import { type Menu } from '@sag/menu'
import { mtlsTopic } from './topic'
import { type GeneratorConfig, type Requirement } from '@sag/types'
import { fs } from 'zx'
import { join as pathJoin } from 'node:path'

const hasKeyAndPem = (config: GeneratorConfig) => {
  const dir = pathJoin(config.workDir, 'certs')
  return fs.existsSync(pathJoin(dir, 'client.key')) && fs.existsSync(pathJoin(dir, 'client.pem'))
}

const hasP12 = (config: GeneratorConfig) =>
  fs.existsSync(pathJoin(config.workDir, 'certs', 'device-cert.p12'))

const hasProfile = (config: GeneratorConfig) =>
  fs.existsSync(pathJoin(config.workDir, 'certs', 'apple-secure.mobileconfig'))

export const registerMtlsMenu = (
  menu: Menu,
  config: GeneratorConfig,
  requirements: Requirement[] = [],
) => {
  menu.addOption(
    'Generate Identity (Key + CSR)',
    'mtls-identity-gen',
    mtlsTopic.generateIdentity,
    config,
    requirements,
    'Create a private key and certificate signing request, then upload CSR to Cloudflare',
  )
  menu.addOption(
    'Generate PKCS#12 (.p12)',
    'mtls-p12',
    mtlsTopic.generateP12,
    config,
    requirements,
    'Bundle key + signed cert into a .p12 file for device import (Windows, Android, macOS)',
    () => (!hasKeyAndPem(config) ? 'Generate Identity first (Key + CSR)' : false),
  )
  menu.addOption(
    'Generate Apple Profile (.mobileconfig)',
    'mtls-profile',
    mtlsTopic.generateAppleProfile,
    config,
    requirements,
    'Create an Apple configuration profile with the cert embedded for iOS/macOS install',
    () => (!hasP12(config) ? 'Generate PKCS#12 first' : false),
  )
  menu.addOption(
    'Sign Apple Profile',
    'mtls-sign',
    mtlsTopic.signAppleProfile,
    config,
    requirements,
    'Code-sign the .mobileconfig so iOS shows "Verified" during install',
    () => (!hasProfile(config) ? 'Generate Apple Profile first' : false),
  )
  menu.addOption(
    'Create Signing Identity',
    'mtls-identity',
    mtlsTopic.createSigningIdentity,
    config,
    requirements,
    'Generate a self-signed cert in macOS Keychain for signing Apple profiles',
  )
  menu.addOption(
    'Delete Signing Identity',
    'mtls-delete-identity',
    mtlsTopic.deleteSigningIdentity,
    config,
    requirements,
    'Remove a signing identity from macOS Keychain',
  )
  menu.addOption(
    'Verify mTLS Connection',
    'mtls-verify',
    mtlsTopic.verifyMtlsConnection,
    config,
    requirements,
    'Test HTTPS with your client cert to confirm mTLS is accepted by the server',
    () => (!hasKeyAndPem(config) ? 'Generate Identity first (Key + CSR)' : false),
  )
}
