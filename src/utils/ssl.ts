import { $ } from 'zx';

export const ssl = {
  async generateKey(outputPath: string): Promise<void> {
    await $`openssl genrsa -out ${outputPath} 2048`;
  },

  async generateCsr(keyPath: string, outputPath: string, commonName: string): Promise<void> {
    await $`openssl req -new -key ${keyPath} -out ${outputPath} -subj "/CN=${commonName}"`;
  },

  async generateP12(outputPath: string, keyPath: string, pemPath: string): Promise<void> {
    await $`openssl pkcs12 -export -out ${outputPath} -inkey ${keyPath} -in ${pemPath} -passout pass:`;
  },
};
