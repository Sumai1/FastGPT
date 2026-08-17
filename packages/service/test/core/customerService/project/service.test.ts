import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoCustomerServiceKeyBinding } from '@fastgpt/service/core/customerService/project/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';
import {
  findActiveCustomerServiceProjectByPublicId,
  updateCustomerServiceProjectWorkflowSyncState
} from '@fastgpt/service/core/customerService/project/entity';
import {
  updateCustomerServiceKeyBindingStatus,
  updateCustomerServiceProjectConfig,
  bindCustomerServiceOpenApiKey
} from '@fastgpt/service/core/customerService/project/service';

const id = () => new Types.ObjectId();

describe('customer service project key binding', () => {
  beforeAll(async () => {
    await MongoCustomerServiceKeyBinding.syncIndexes();
    await MongoCustomerServiceProject.syncIndexes();
  });

  it('requires a reason when disabling a binding and clears it after enabling', async () => {
    const teamId = id();
    const tmbId = id();
    const binding = await MongoCustomerServiceKeyBinding.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      projectId: id(),
      openApiKeyId: id(),
      maxAudience: CustomerServiceAudienceEnum.public,
      status: CustomerServiceResourceStatusEnum.active
    });

    expect(() =>
      updateCustomerServiceKeyBindingStatus({
        teamId: String(teamId),
        tmbId: String(tmbId),
        bindingId: String(binding._id),
        status: CustomerServiceResourceStatusEnum.inactive,
        reason: '  '
      })
    ).toThrow('Customer service key disable reason is required');

    const disabled = await updateCustomerServiceKeyBindingStatus({
      teamId: String(teamId),
      tmbId: String(tmbId),
      bindingId: String(binding._id),
      status: CustomerServiceResourceStatusEnum.inactive,
      reason: '  Key 已轮换  '
    });
    expect(disabled).toEqual(
      expect.objectContaining({
        status: CustomerServiceResourceStatusEnum.inactive,
        disabledReason: 'Key 已轮换'
      })
    );

    const enabled = await updateCustomerServiceKeyBindingStatus({
      teamId: String(teamId),
      tmbId: String(tmbId),
      bindingId: String(binding._id),
      status: CustomerServiceResourceStatusEnum.active,
      reason: ''
    });
    expect(enabled).toEqual(
      expect.objectContaining({
        status: CustomerServiceResourceStatusEnum.active,
        disabledReason: ''
      })
    );
  });

  it('rejects project model references outside the current team', async () => {
    await expect(
      updateCustomerServiceProjectConfig({
        teamId: String(id()),
        tmbId: String(id()),
        projectId: String(id()),
        modelIds: [String(id())]
      })
    ).rejects.toThrow('Customer service project product models are invalid');
  });

  it('allows only the native OpenAPI key owner to create a customer-service binding', async () => {
    const teamId = id();
    const ownerTmbId = id();
    const strangerTmbId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      appId: id(),
      projectCode: `KEY_OWNER_${id()}`,
      publicId: `cs_${id()}`,
      name: 'Key owner test',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: '人工客服' },
      ruleConfig: {},
      tmbId: ownerTmbId,
      updateTmbId: ownerTmbId
    });
    const openApiKey = await MongoOpenApi.create({
      teamId,
      tmbId: ownerTmbId,
      apiKey: `sk-owner-${id()}`
    });

    await expect(
      bindCustomerServiceOpenApiKey({
        teamId: String(teamId),
        tmbId: String(strangerTmbId),
        projectId: String(project._id),
        openApiKeyId: String(openApiKey._id),
        maxAudience: CustomerServiceAudienceEnum.public
      })
    ).rejects.toThrow('Only the OpenAPI key owner can bind this key');
    expect(
      await MongoCustomerServiceKeyBinding.countDocuments({ openApiKeyId: openApiKey._id })
    ).toBe(0);

    const binding = await bindCustomerServiceOpenApiKey({
      teamId: String(teamId),
      tmbId: String(ownerTmbId),
      projectId: String(project._id),
      openApiKeyId: String(openApiKey._id),
      maxAudience: CustomerServiceAudienceEnum.public
    });
    expect(String(binding.projectId)).toBe(String(project._id));
    expect(String(binding.openApiKeyId)).toBe(String(openApiKey._id));
    expect(String(binding.tmbId)).toBe(String(ownerTmbId));
  });

  it('resolves by a globally unique public id rather than a team-scoped project code', async () => {
    const createProject = (
      teamId: ReturnType<typeof id>,
      projectCode: string,
      publicId: string,
      status = CustomerServiceProjectStatusEnum.active
    ) =>
      MongoCustomerServiceProject.create({
        teamId,
        appId: id(),
        projectCode,
        publicId,
        name: projectCode,
        status,
        modelIds: [],
        defaultAudience: CustomerServiceAudienceEnum.public,
        humanContact: { name: '人工客服' },
        ruleConfig: {},
        tmbId: id(),
        updateTmbId: id()
      });

    const firstTeamId = id();
    const firstPublicId = 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8';
    await createProject(firstTeamId, 'PUBLIC_UNIQUE', firstPublicId);
    const firstProject = await findActiveCustomerServiceProjectByPublicId({
      publicId: firstPublicId
    });
    expect(firstProject?.projectCode).toBe('PUBLIC_UNIQUE');
    expect(String(firstProject?.teamId)).toBe(String(firstTeamId));

    // projectCode 仍允许跨团队重名，但公开入口不能重名；Mongo 全局索引必须拒绝第二条。
    const secondTeamId = id();
    await createProject(secondTeamId, 'PUBLIC_UNIQUE', 'cs_zY8xW7vU6tS5rQ4pN3mL2kJ1');
    const firstProjectAgain = await findActiveCustomerServiceProjectByPublicId({
      publicId: firstPublicId
    });
    expect(String(firstProjectAgain?.teamId)).toBe(String(firstTeamId));
    await expect(createProject(id(), 'OTHER_CODE', firstPublicId)).rejects.toMatchObject({
      code: 11000
    });

    const inactivePublicId = 'cs_inactiveAb3dE5fG7hJ9kL2mN4pQ6';
    await createProject(
      id(),
      'INACTIVE',
      inactivePublicId,
      CustomerServiceProjectStatusEnum.inactive
    );
    expect(
      await findActiveCustomerServiceProjectByPublicId({
        publicId: inactivePublicId
      })
    ).toBeNull();
  });

  it('persists workflow sync failures and clears them after a successful retry', async () => {
    const teamId = id();
    const tmbId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      appId: id(),
      projectCode: `SYNC_STATE_${id()}`,
      name: 'Workflow sync state test',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: '人工客服' },
      ruleConfig: {},
      tmbId,
      updateTmbId: tmbId
    });

    const failed = await updateCustomerServiceProjectWorkflowSyncState({
      teamId: String(teamId),
      projectId: String(project._id),
      status: CustomerServiceWorkflowSyncStatusEnum.failed,
      failureReason: '知识库向量模型不一致'
    });
    expect(failed).toEqual(
      expect.objectContaining({
        workflowSyncStatus: CustomerServiceWorkflowSyncStatusEnum.failed,
        workflowSyncFailureReason: '知识库向量模型不一致',
        workflowSyncFailureTime: expect.any(Date),
        workflowSyncLastAttemptTime: expect.any(Date)
      })
    );

    const succeeded = await updateCustomerServiceProjectWorkflowSyncState({
      teamId: String(teamId),
      projectId: String(project._id),
      status: CustomerServiceWorkflowSyncStatusEnum.succeeded
    });
    expect(succeeded).toEqual(
      expect.objectContaining({
        workflowSyncStatus: CustomerServiceWorkflowSyncStatusEnum.succeeded,
        workflowSyncSuccessTime: expect.any(Date),
        workflowSyncLastAttemptTime: expect.any(Date)
      })
    );
    expect(succeeded?.workflowSyncFailureReason).toBeUndefined();
    expect(succeeded?.workflowSyncFailureTime).toBeUndefined();
  });

  it('does not let an older workflow sync attempt overwrite a newer attempt', async () => {
    const teamId = id();
    const tmbId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      appId: id(),
      projectCode: `SYNC_CAS_${id()}`,
      name: 'Workflow sync CAS test',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: '人工客服' },
      ruleConfig: {},
      tmbId,
      updateTmbId: tmbId
    });
    const firstAttempt = await updateCustomerServiceProjectWorkflowSyncState({
      teamId: String(teamId),
      projectId: String(project._id),
      status: CustomerServiceWorkflowSyncStatusEnum.syncing
    });
    const firstAttemptTime = firstAttempt?.workflowSyncLastAttemptTime;
    expect(firstAttemptTime).toBeInstanceOf(Date);
    const newerAttemptTime = new Date((firstAttemptTime?.getTime() ?? 0) + 1000);
    await MongoCustomerServiceProject.updateOne(
      { _id: project._id },
      { $set: { workflowSyncLastAttemptTime: newerAttemptTime } }
    );

    const staleResult = await updateCustomerServiceProjectWorkflowSyncState({
      teamId: String(teamId),
      projectId: String(project._id),
      status: CustomerServiceWorkflowSyncStatusEnum.failed,
      failureReason: '旧请求失败',
      expectedLastAttemptTime: firstAttemptTime
    });
    expect(staleResult).toBeNull();
    const stored = await MongoCustomerServiceProject.findById(project._id).lean();
    expect(stored?.workflowSyncStatus).toBe(CustomerServiceWorkflowSyncStatusEnum.syncing);
    expect(stored?.workflowSyncLastAttemptTime).toEqual(newerAttemptTime);
    expect(stored?.workflowSyncFailureReason).toBe('');
  });
});
