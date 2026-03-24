import { type IAccessPolicyManager, type AccessPolicy } from '@sag/shared/core'
import { type CfApiClient, CloudflareApiError } from './client'

interface CfPolicy {
  id?: string
  name?: string
  decision?: string
  include?: unknown[]
}

function toAccessPolicy(cf: CfPolicy): AccessPolicy {
  return {
    id: cf.id ?? '',
    name: cf.name ?? '',
    decision: cf.decision ?? 'allow',
    include: (cf.include ?? []) as AccessPolicy['include'],
  }
}

export class BrowserAccessPolicyManager implements IAccessPolicyManager {
  constructor(private readonly client: CfApiClient) {}

  async listPolicies(applicationId: string): Promise<AccessPolicy[]> {
    try {
      const result = await this.client.get<CfPolicy[]>(
        `/accounts/${this.client.getAccountId()}/access/apps/${applicationId}/policies`,
      )
      return result.map(toAccessPolicy)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to list policies: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async createEmailOtpPolicy(
    applicationId: string,
    name: string,
    emails: string[],
  ): Promise<AccessPolicy> {
    try {
      const result = await this.client.post<CfPolicy>(
        `/accounts/${this.client.getAccountId()}/access/apps/${applicationId}/policies`,
        {
          name,
          decision: 'allow',
          include: emails.map((email) => ({ email: { email } })),
        },
      )
      return toAccessPolicy(result)
    } catch (err) {
      if (err instanceof CloudflareApiError) throw err
      throw new CloudflareApiError(
        `Failed to create email OTP policy: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }
}
