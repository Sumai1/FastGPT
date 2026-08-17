import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { AppToolSourceEnum } from '@fastgpt/global/core/app/tool/constants';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import {
  CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
  customerServiceStandardAppTemplate
} from '@fastgpt/global/core/customerService/workflowTemplate';

const mocks = vi.hoisted(() => ({
  listWorkflows: vi.fn(),
  findTemplates: vi.fn()
}));

vi.mock('@fastgpt/service/thirdProvider/fastgptPlugin', () => ({
  pluginClient: {
    listWorkflows: mocks.listWorkflows
  }
}));

vi.mock('@fastgpt/service/core/app/templates/templateSchema', () => ({
  MongoAppTemplate: {
    find: mocks.findTemplates
  }
}));

import { getAppTemplatesAndLoadThem } from '@fastgpt/service/core/app/templates/register';

beforeEach(() => {
  vi.clearAllMocks();
  global.appTemplates = [];
  global.templatesRefreshTime = 0;
});

describe('getAppTemplatesAndLoadThem', () => {
  it('keeps plugin workflow fields authoritative while applying editable database config', async () => {
    const pluginWorkflow = {
      nodes: [
        {
          nodeId: 'plugin-start',
          flowNodeType: FlowNodeTypeEnum.workflowStart,
          name: 'Plugin start',
          inputs: [],
          outputs: []
        }
      ],
      edges: [],
      chatConfig: {
        welcomeText: 'plugin welcome'
      }
    };
    const staleDbWorkflow = {
      nodes: [
        {
          nodeId: 'stale-db-node',
          flowNodeType: FlowNodeTypeEnum.workflowStart,
          name: 'Stale DB node',
          inputs: [
            {
              key: 'questionGuide',
              valueType: 'hidden',
              renderTypeList: ['hidden'],
              label: 'core.app.Question Guide'
            }
          ],
          outputs: []
        }
      ],
      edges: [],
      chatConfig: {
        welcomeText: 'stale db welcome'
      }
    };

    mocks.listWorkflows.mockResolvedValue([
      {
        templateId: 'githubIssue',
        name: 'Plugin name',
        intro: 'Plugin intro',
        avatar: 'core/app/templates/githubIssue',
        tags: ['plugin-tag'],
        type: AppTypeEnum.workflow,
        author: 'plugin author',
        userGuide: {
          type: 'link',
          content: 'https://plugin.example.com'
        },
        workflow: pluginWorkflow,
        order: 10
      }
    ]);
    mocks.findTemplates.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          templateId: `${AppToolSourceEnum.community}-githubIssue`,
          name: 'DB name',
          intro: 'DB intro',
          avatar: 'db-avatar',
          tags: ['db-tag'],
          type: AppTypeEnum.simple,
          isActive: false,
          isPromoted: true,
          recommendText: 'DB recommend',
          userGuide: {
            type: 'link',
            content: 'https://db.example.com'
          },
          workflow: staleDbWorkflow,
          order: 1
        }
      ])
    });

    const templates = await getAppTemplatesAndLoadThem(true);
    const template = templates.find(
      (item) => item.templateId === `${AppToolSourceEnum.community}-githubIssue`
    );

    expect(template).toMatchObject({
      templateId: `${AppToolSourceEnum.community}-githubIssue`,
      name: 'Plugin name',
      intro: 'Plugin intro',
      avatar: '/core/app/templates/githubIssue',
      tags: ['plugin-tag'],
      type: AppTypeEnum.workflow,
      isActive: false,
      isPromoted: true,
      recommendText: 'DB recommend',
      order: 1
    });
    expect(template?.workflow).toEqual(pluginWorkflow);
    expect(template?.userGuide).toEqual({
      type: 'link',
      content: 'https://plugin.example.com'
    });
  });

  it('keeps bundled customer service workflow authoritative without duplicating database config', async () => {
    const staleDbWorkflow = {
      nodes: [],
      edges: [],
      chatConfig: {
        welcomeText: 'stale bundled workflow'
      }
    };

    mocks.listWorkflows.mockResolvedValue([]);
    mocks.findTemplates.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          templateId: CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
          name: 'Old bundled name',
          intro: 'Old bundled intro',
          avatar: 'old-avatar',
          tags: ['old-tag'],
          type: AppTypeEnum.simple,
          isActive: false,
          order: -200,
          workflow: staleDbWorkflow
        },
        {
          templateId: `${AppToolSourceEnum.commercial}-custom-template`,
          name: 'Custom commercial template',
          intro: '',
          avatar: '',
          tags: [],
          type: AppTypeEnum.workflow,
          workflow: {
            nodes: [],
            edges: []
          }
        }
      ])
    });

    const templates = await getAppTemplatesAndLoadThem(true);
    const bundledTemplates = templates.filter(
      (template) => template.templateId === CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID
    );

    expect(bundledTemplates).toHaveLength(1);
    expect(bundledTemplates[0]).toMatchObject({
      name: customerServiceStandardAppTemplate.name,
      intro: customerServiceStandardAppTemplate.intro,
      avatar: customerServiceStandardAppTemplate.avatar,
      tags: customerServiceStandardAppTemplate.tags,
      type: AppTypeEnum.workflow,
      isActive: false,
      order: -200
    });
    expect(bundledTemplates[0]?.workflow).toEqual(customerServiceStandardAppTemplate.workflow);
    expect(
      templates.some(
        (template) => template.templateId === `${AppToolSourceEnum.commercial}-custom-template`
      )
    ).toBe(true);
  });
});
