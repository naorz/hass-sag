export class SagError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'SagError'
  }
}

export class ConfigValidationError extends SagError {
  constructor(message: string) {
    super(message, 'CONFIG_VALIDATION')
    this.name = 'ConfigValidationError'
  }
}

export class CertificateError extends SagError {
  constructor(message: string) {
    super(message, 'CERTIFICATE')
    this.name = 'CertificateError'
  }
}

export class CloudflareApiError extends SagError {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message, 'CLOUDFLARE_API')
    this.name = 'CloudflareApiError'
  }
}

export class PlatformNotSupportedError extends SagError {
  constructor(platform: string, feature: string) {
    super(`${feature} is not supported on ${platform}`, 'PLATFORM_NOT_SUPPORTED')
    this.name = 'PlatformNotSupportedError'
  }
}
