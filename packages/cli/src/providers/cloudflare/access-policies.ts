import { type IAccessPolicyManager, type AccessPolicy, CloudflareApiError } from '@sag/shared/core'
import { cfApi } from './base'

export class CfAccessPolicyManager implements IAccessPolicyManager {
  async listPolicies(applicationId: string): Promise<AccessPolicy[]> {
    try {
      const policies: AccessPolicy[] = []
      for await (const policy of cfApi
        .get()
        .zeroTrust.access.applications.policies.list(applicationId, {
          account_id: cfApi.getAccountId(),
        })) {
        policies.push(this.toAccessPolicy(policy))
      }
      return policies
    } catch (err) {
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
      const result = await cfApi
        .get()
        .zeroTrust.access.applications.policies.create(applicationId, {
          account_id: cfApi.getAccountId(),
          name,
          decision: 'allow',
          include: emails.map((email) => ({ email: { email } })),
        })
      return this.toAccessPolicy(result)
    } catch (err) {
      throw new CloudflareApiError(
        `Failed to create email OTP policy: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  private toAccessPolicy(cf: {
    id?: string
    name?: string
    decision?: string
    include?: unknown[]
  }): AccessPolicy {
    return {
      id: cf.id ?? '',
      name: cf.name ?? '',
      decision: cf.decision ?? 'allow',
      include: (cf.include ?? []) as AccessPolicy['include'],
    }
  }
}
