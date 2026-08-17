# Workflow template classification contracts

## 1. Scope / Trigger

Read this contract when a stored workflow template configures
`FlowNodeTypeEnum.classifyQuestion` or changes its `NodeInputKeyEnum.agents` list.

## 2. Signatures

```ts
type ClassifyQuestionAgent = {
  key: string;
  value: string;
};

type ClassifyQuestionInput = ClassifyQuestionAgent[];
```

The runtime matches the model output to an agent and falls back to the final item:

```ts
const result = agents.find((item) => item.key === returnedType) ?? agents.at(-1);
```

## 3. Contracts

- Every `key` is unique and has a source edge whose handle is generated from that exact key.
- Descriptions tell the model when to select the category; the model is expected to return a key.
- The final agent is the unknown-output fallback. It must be a safe recoverable path, normally
  retrieval or clarification, rather than an irreversible rejection or destructive action.
- A customer-service template lets retrieval decide whether an unfamiliar product has documents;
  unfamiliar product names alone are not an out-of-scope signal.

## 4. Validation & Error Matrix

| Condition | Runtime result |
| --- | --- |
| Model output contains a configured key | Select that agent |
| Model output contains a configured full description | Select that agent |
| Model output matches neither | Select the final agent |
| Edge source handle does not match an agent key | Workflow validation fails or branch is unreachable |
| Reject/refuse category is final | Unknown model formats become uniform refusals |

## 5. Good / Base / Bad Cases

- Good: an unknown format falls back to product retrieval; empty retrieval then asks for details.
- Base: weather selects out-of-scope, greeting selects greeting, and a product parameter question
  selects a knowledge branch.
- Bad: out-of-scope is last, so any model formatting variance incorrectly refuses product questions.

## 6. Tests Required

- Assert agent keys are unique and every key has the expected source edge.
- Assert the final agent is the intended safe fallback.
- Assert the prompt does not treat unknown product names as out-of-scope.
- For customer-service templates, run a real topic-switch smoke test: unrelated question followed by
  a product question in the same chat must leave the out-of-scope branch.

## 7. Wrong vs Correct

```ts
// Wrong: unknown model output becomes a refusal.
agents = [productConsultation, greeting, outOfScope];

// Correct: an explicit out-of-scope result still works, while unknown output remains recoverable.
agents = [greeting, outOfScope, productConsultation];
```
