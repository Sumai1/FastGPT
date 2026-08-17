import { describe, expect, it } from 'vitest';
import { Types } from '@fastgpt/service/common/mongo';
import type { listCustomerServiceKeyBindings } from '@fastgpt/service/core/customerService/project/entity';
import { formatCustomerServiceProjects } from '@/service/customerService/format';

const createKeyBinding = async () =>
  ({
    _id: new Types.ObjectId(),
    projectId: new Types.ObjectId(),
    openApiKeyId: new Types.ObjectId(),
    maxAudience: 'public',
    status: 'active',
    allowedOrigins: [],
    rateLimit: null,
    disabledReason: ''
  }) as unknown as Awaited<ReturnType<typeof listCustomerServiceKeyBindings>>[number];

describe('formatCustomerServiceProjects', () => {
  it('does not expose an OpenAPI Key id to a member who does not own it', async () => {
    const binding = await createKeyBinding();

    const result = formatCustomerServiceProjects({
      projects: [],
      keyBindings: [binding]
    });

    expect(result.keyBindings[0]).not.toHaveProperty('openApiKeyId');
  });

  it('exposes the OpenAPI Key id only when it is in the owned-key set', async () => {
    const binding = await createKeyBinding();
    const openApiKeyId = String(binding.openApiKeyId);

    const result = formatCustomerServiceProjects({
      projects: [],
      keyBindings: [binding],
      visibleOpenApiKeyIds: new Set([openApiKeyId])
    });

    expect(result.keyBindings[0].openApiKeyId).toBe(openApiKeyId);
  });
});
