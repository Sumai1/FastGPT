# Customer Service RAG Trust Boundaries

## Scenario: trusted retrieval scope and idempotent chat

### 1. Scope / Trigger

Apply this contract whenever customer-service chat, project/Key binding, product scope,
knowledge publication, dataset search propagation, or request replay is changed. The
purpose is to prevent browser-supplied filters from widening retrieval and to prevent a
retried request from creating a second FastGPT message or charge.

### 2. Signatures

- Public API: `POST /api/customer-service/v1/chat` with
  `CustomerServiceChatBodySchema`; response is parsed by
  `CustomerServiceChatResponseSchema`.
- Retrieval scope:
  `getCustomerServiceCollectionIds({ teamId, projectId, maxAudience,
  requestAudience?, modelId?, hardwareVersionId?, softwareVersionId?, now? }) ->
  Promise<string[]>`.
- Internal search option: `collectionIdWhitelist?: string[]`. It is propagated only
  through the in-process customer-service request context.
- Idempotency:
  `acquireCustomerServiceRequest({ teamId, projectId, openApiKeyId, requestId,
  externalSessionId, internalChatId, responseChatItemId, audience,
  processingStaleMs? })`.
- Mongo uniqueness is scoped by
  `{ teamId, projectId, openApiKeyId, requestId }`; indexes must use `defineIndex`.

### 3. Contracts

- `requestId` is optional, trimmed, 1-128 characters. The server generates one when
  omitted.
- `audience` may request a lower access level, but the effective level is always the
  minimum of the request and the Key binding maximum.
- Model/version codes are hints to the server-side resolver. They never become direct
  Mongo filters supplied by the client.
- A whitelist is derived from active project, active allowed model, model-bound
  datasets, published knowledge, effective time, versions, and effective audience.
- The whitelist must reach embedding and full-text recall and continue through Rerank.
- `[]` means search nothing. `undefined` means ordinary FastGPT behavior; never
  translate one into the other.
- The trusted context uses an in-process `WeakMap<NextApiRequest, ...>`, not headers,
  body fields, or query fields.
- Raw `externalUserId` is not persisted; metadata stores an HMAC derived with
  `FASTGPT_AES256_SECRET_KEY` through `serviceEnv.AES256_SECRET_KEY`.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Inactive/missing project or Key binding | Reject before chat execution |
| Origin outside binding allow-list | Reject before chat execution |
| Requested audience above Key maximum | Clamp to Key maximum |
| Model outside project or inactive | `UserError`; do not search |
| Selected model has no dataset bindings | Return `[]`; low-confidence/handoff path |
| Knowledge query fails or team mismatch is found | Propagate failure; never search all |
| Same idempotency key, different session/chat/message/audience | Conflict error |
| Same key still processing and not stale | Processing conflict |
| Same key processing beyond stale threshold | Atomic reclaim by status and update time |
| Same key completed | Replay saved business result without rerunning the LLM |
| Same key failed | Atomic retry; clear stale result fields |

### 5. Good / Base / Bad Cases

- Good: a dealer Key asks for `public`; only active, effective public knowledge in the
  selected model's bound datasets is searched.
- Base: a normal non-customer-service workflow omits `collectionIdWhitelist`; existing
  dataset search remains unchanged.
- Bad: customer-service scope resolution returns no collections and the caller removes
  the option. This widens the query to the whole dataset and is forbidden.
- Bad: a caller reuses `requestId` with a different `sessionId`; this must be rejected,
  not replayed.

### 6. Tests Required

- Search tests assert allowed collection inclusion, disallowed exclusion, `[]`
  fail-closed behavior, and unchanged behavior when the option is omitted.
- Whitelist tests assert audience ordering, time window, project/model/team ownership,
  version scope, and model dataset intersection.
- Chat authorization tests assert bound Keys cannot call generic v1/v2 completions.
- Request tests assert first acquisition, completed replay, context conflict, fresh
  processing conflict, stale processing reclaim, and failed retry.
- API tests assert request parsing and response schema parsing for streaming and
  non-streaming branches.

### 7. Wrong vs Correct

#### Wrong

```ts
const whitelist = body.collectionIds;
await search({ collectionIdWhitelist: whitelist.length ? whitelist : undefined });
```

The browser controls the trust boundary, and an empty result widens access.

#### Correct

```ts
const whitelist = await getCustomerServiceCollectionIds(serverResolvedScope);
setCustomerServiceRequestContext({
  req,
  context: { ...trustedContext, collectionIdWhitelist: whitelist }
});
await chatCompletionHandler(req, res);
```

The server derives the scope, preserves an empty array, and injects it only into the
current in-process request.
