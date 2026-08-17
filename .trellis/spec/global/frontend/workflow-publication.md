# Workflow editing and publication contracts

## 1. Scope / Trigger

Read this contract when code, scripts, or deployment operations synchronize an existing workflow
App. FastGPT keeps editable App data and published version data separately; changing only one side
can make the workbench and runtime show different configurations.

## 2. Signatures

```http
GET /api/core/app/version/latest?appId=<ObjectId>
PUT /api/core/app/update?appId=<ObjectId>
POST /api/core/app/version/publish?appId=<ObjectId>
```

```ts
type WorkflowSnapshot = {
  nodes: StoreNodeItemType[];
  edges: StoreEdgeItemType[];
  chatConfig: AppChatConfigType;
};

type PublishWorkflowBody = WorkflowSnapshot & {
  isPublish: true;
  versionName: string;
  autoSave: false;
};
```

## 3. Contracts

- Treat `GET version/latest` as the source snapshot for a production workflow that has already been
  published. Preserve its node IDs, dataset bindings, model choices, edges, and chat configuration.
- Apply intended changes to that snapshot, then send the same `nodes`, `edges`, and `chatConfig` to
  both `PUT app/update` and `POST version/publish`.
- `PUT app/update` synchronizes the workbench editing state. It does not create a published version.
- `POST version/publish` with `isPublish: true` creates the runtime version and updates the App's
  published node version. A save or `autoSave: true` is not a production publish.
- Verify the published result by reading `GET version/latest` and checking business-critical inputs,
  not only the version name or HTTP status.

## 4. Validation & Error Matrix

| Condition | Expected handling |
| --- | --- |
| App ID is invalid or caller lacks write permission | API rejects; do not retry with direct DB writes |
| Only `PUT app/update` succeeds | Workbench changes, production runtime may stay on the old version |
| Only publish succeeds | Runtime changes, but a later workbench save may restore stale editing data |
| `nodes` or `edges` are omitted | The publication schema defaults them to empty; reject the deployment payload |
| Publish returns 200 but critical inputs differ | Treat deployment as failed and restore the previous snapshot/version |

## 5. Good / Base / Bad Cases

- Good: load the published snapshot, change only the intended prompt/input, update editing state,
  publish the identical snapshot, then verify node ID and input values.
- Base: a new unpublished App can use its current App modules as the initial snapshot.
- Bad: mutate `MongoApp.modules` directly or publish the stale workbench detail after production has
  newer settings; either path causes silent configuration drift.

## 6. Tests Required

- Unit-test stable node IDs and intended template input values.
- Integration-test that publish persists `nodes`, `edges`, `chatConfig`, `isPublish`, and version name.
- Deployment smoke-test at least one fixed workflow branch and one retrieval branch.
- Assert production-critical values such as Rerank enablement, retrieval token limit, answer token
  limit, dataset binding, and system prompt after publication.

## 7. Wrong vs Correct

```ts
// Wrong: editing state changes, but runtime may continue using the old published version.
await putAppById(appId, changedWorkflow);

// Correct: the same snapshot is written to both states and verified from the published endpoint.
await putAppById(appId, changedWorkflow);
await postPublishApp(appId, {
  ...changedWorkflow,
  isPublish: true,
  versionName: '客服工作流 V1.3.1',
  autoSave: false
});
await assertLatestPublishedWorkflow(appId);
```
