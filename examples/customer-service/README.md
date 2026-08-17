# 智能客服资料与评测模板

本目录不复制 FastGPT 的知识正文存储，只提供导入前的内容模板和回归评测工具。

- `templates/`：产品主档、FAQ、故障、保养和客服话术模板。填写后仍通过 FastGPT 原有导入功能进入 dataset/collection。
- `evaluation/evaluation-200.matrix.json`：10 个产品场景 × 20 类问题，共 200 个评测用例的矩阵定义。
- `evaluation/run.ts`：调用客服 API，检查回答状态、引用、转人工和 collection 隔离，并输出脱敏 JSON 报告。
- `privacy/sanitize.ts`：导入前检查或输出脱敏后的 UTF-8 文本副本，不覆盖原文件。

只校验 200 条矩阵结构，不调用模型：

```bash
pnpm --filter @fastgpt/app exec tsx ../../examples/customer-service/evaluation/run.ts --validate
```

运行示例：

```bash
CUSTOMER_SERVICE_BASE_URL=http://localhost:3000 \
CUSTOMER_SERVICE_API_KEY=fastgpt-xxxx \
pnpm --filter @fastgpt/app exec tsx ../../examples/customer-service/evaluation/run.ts
```

资料导入前检查和生成脱敏副本：

```bash
pnpm --filter @fastgpt/app exec tsx ../../examples/customer-service/privacy/sanitize.ts \
  --check ./incoming/*.md
pnpm --filter @fastgpt/app exec tsx ../../examples/customer-service/privacy/sanitize.ts \
  --output-dir /tmp/customer-service-sanitized ./incoming/*.md
```

矩阵中的型号和 collection ID 是演示值。上线验收前必须替换成三个试点产品的真实型号、版本、资料和人工标注答案。
