import { describe, expect, it } from 'vitest';
import {
  extractCustomerServiceCitations,
  getCustomerServiceAnswerText,
  resolveCustomerServiceWorkflowFixedBranchAction
} from '@/service/customerService/chatResult';

describe('customer service chat result adapter', () => {
  it('extracts nested citations, deduplicates them and calculates comparable confidence', () => {
    const result = extractCustomerServiceCitations([
      {
        childrenResponses: [
          {
            quoteList: [
              {
                id: 'chunk-1',
                datasetId: '68ad85a7463006c963799a01',
                collectionId: '68ad85a7463006c963799a02',
                sourceName: 'manual.pdf',
                q: '问题',
                a: '答案',
                score: [{ type: 'embedding', value: 0.82, index: 0 }]
              },
              {
                id: 'chunk-1',
                datasetId: '68ad85a7463006c963799a01',
                collectionId: '68ad85a7463006c963799a02',
                sourceName: 'manual.pdf',
                q: '问题',
                a: '答案',
                score: [{ type: 'reRank', value: 0.91, index: 0 }]
              }
            ]
          }
        ]
      }
    ]);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].sourceName).toBe('manual.pdf');
    expect(result.confidence).toBe(0.91);
    expect(result.workflowFixedBranch).toBeUndefined();
  });

  it('treats a valid full-text-only citation as usable', () => {
    const result = extractCustomerServiceCitations({
      quoteList: [
        {
          id: 'chunk-2',
          datasetId: '68ad85a7463006c963799a01',
          collectionId: '68ad85a7463006c963799a02',
          score: [{ type: 'fullText', value: 20, index: 0 }]
        }
      ]
    });
    expect(result.confidence).toBe(1);
  });

  it('joins only AI text segments into the public answer', () => {
    expect(
      getCustomerServiceAnswerText([
        { text: { content: '第一段' } },
        { reasoning: { content: '内部推理' } },
        { text: { content: '第二段' } }
      ])
    ).toBe('第一段\n第二段');
  });

  it.each([
    ['customer-service-greeting', 'greeting'],
    ['customer-service-human-safety', 'humanSafety'],
    ['customer-service-out-of-scope', 'outOfScope'],
    ['customer-service-no-data', 'noData']
  ])('recognizes standard workflow terminal node %s', (nodeId, expectedBranch) => {
    const result = extractCustomerServiceCitations({
      childrenResponses: [{ nodeId, moduleType: 'answerNode' }]
    });

    expect(result.citations).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.workflowFixedBranch).toBe(expectedBranch);
  });

  it('does not exempt an unknown fixed-answer node from the citation gate', () => {
    const result = extractCustomerServiceCitations({
      nodeId: 'custom-answer-node',
      moduleType: 'answerNode'
    });

    expect(result.workflowFixedBranch).toBeUndefined();
    expect(result.citations).toEqual([]);
  });

  it.each([
    ['greeting', 'answerWithoutCitations'],
    ['outOfScope', 'answerWithoutCitations'],
    ['humanSafety', 'humanRequired'],
    ['noData', 'lowConfidence'],
    [undefined, undefined]
  ] as const)('maps workflow branch %s to API action %s', (branch, action) => {
    expect(resolveCustomerServiceWorkflowFixedBranchAction(branch)).toBe(action);
  });
});
