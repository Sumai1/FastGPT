# @fastgpt/web

`packages/web` owns reusable Chakra UI components, hooks, contexts, stores,
styles and i18n helpers. Examples are `components/common/`,
`hooks/useRequest.tsx`, `store/useCommonStore.ts` and `styles/theme.ts`.

- Keep page-specific orchestration in `projects/app`.
- Import shared contracts from `@fastgpt/global`, never server services.
- Follow existing `useTranslation`, request hook, toast and Chakra theme
  patterns rather than adding a second UI abstraction.
- Prefer reusable components only when multiple screens need the behavior.
