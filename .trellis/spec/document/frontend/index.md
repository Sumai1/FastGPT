# @fastgpt/document

The documentation site uses Next.js App Router and Fumadocs. Routes are under
`document/app`, content under `document/content`, and generated metadata under
`document/document/data`.

- Preserve language routing and update the corresponding translated content
  when a documentation task requires it.
- Use `format-doc`, `checkDocRefs` and a site build for changed documentation.
