# 知识采编台与 FastGPT 原生知识库深度融合设计方案

- **方案名称**：知识采编与 FastGPT 原生知识库一体化深度融合 (Native First Knowledge Fusion)
- **文档版本**：V1.0
- **编制日期**：2026-08-19
- **设计状态**：方案提报待评审

---

## 🎯 一、 现状分析与设计痛点

### 1.1 现状对比
| 维度 | FastGPT 原生知识库 (`/dataset/detail`) | 独立知识采编台 (`/dataset/editor`) |
|---|---|---|
| **核心优势** | • 强大的多格式解析（PDF/Word/Excel/Markdown/QA拆分/Web同步）<br>• 完善的数据块（Chunk）检索、切片微调与训练队列管理 | • 结构化设备参数表单（产品主档、故障卡、操作手册）<br>• 业务治理元数据（适用产品型号、三级受众白名单、知识分类、审核状态机） |
| **存在痛点** | • 缺少业务治理属性（无法给文件打上型号、受众、状态标记）<br>• 上传即生效，缺少双人复核审核机制 | • 与原生上传流程割裂，用户有“去哪里传文件”的认知困惑<br>• 无法直接享用原生高级切片、Web爬虫等全部导入源 |

### 1.2 核心融合目标
1. **统一入口心智 (Single Entry Point)**：彻底打通割裂入口，用户统一在熟悉的 FastGPT 知识库中进行所有文档上传与知识录入。
2. **能力全面继承 (Full Capability Inheritance)**：让 FastGPT 原生所有文件导入（PDF/Word/表格/QA）天然享有产品型号绑定、受众隔离与审核流。
3. **权责闭环明确 (Clear Role Workbenches)**：
   - **采编人员**：在知识库详情页自由上传、录入结构化表单、修改参数并一键提审；
   - **审核人员**：统一在 **【知识审核台 (`/dataset/reviewer`)】** 执行集中复核、Diff 对比、沙盒验证与一键发布；
   - **采编总览**：原 `/dataset/editor` 升级为 **“全局草稿与待办归集箱”**，聚合跨知识库的所有未发布草稿。

---

## 🏗️ 二、 详细融合架构设计

```
                         FastGPT 知识库详情页 (/dataset/detail?datasetId=xxx)
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
    【1. 新建与导入菜单 (Header.tsx)】                                 【2. 集合列表增强 (CollectionCard)】
 ┌──────────────────────────────────────┐                         ┌────────────────────────────────────────┐
 │ • 📄 文本/Markdown/PDF/Word 文件导入  │                         │ 集合名称  │ 训练状态 │ 客服治理  │ 行内操作      │
 │ • 📊 表格 / QA 批量导入               │                         ├──────────┼─────────┼──────────┼───────────────┤
 │ • 🌐 网站 / 外部文件同步               │                         │ 设备手册  │ 已就绪  │ 🟢已发布  │ [查看] [下架] │
 │ ──────────────────────────────────── │                         │ 故障排查  │ 已就绪  │ 🟠待审核  │ [审核中]      │
 │ 🛠️ 【企业产品结构化知识】             │                         │ 价格调整  │ 已就绪  │ ⚪草稿    │ [提审] [编辑] │
 │   ├─ 📋 产品主档表单 (MasterForm)    │                         └────────────────────────────────────────┘
 │   ├─ 📑 操作说明表单 (ManualForm)    │                                             │
 │   ├─ ⚠️ 故障排查卡 (FaultCardForm)  │                                             ▼
 │   └─ ❓ 批量 FAQ (FaqBatchEditor)   │                            【3. 独立集中审核台 (/dataset/reviewer)】
 └──────────────────────────────────────┘                             • 双人复核防自审、新旧版本 Diff
                │                                                     • 行内问答沙盒测试、一键发布生效
                ▼
    【文件上传/表单附带客服治理配置】
    • 适用型号：[ DT-2026A 拍照机 ▾ ]
    • 受众级别：[ 普通客户 (public) ▾ ]
    • 知识分类：[ 故障排查 / FAQ ▾ ]
```

---

## 📱 三、 具体交互改造方案

### 3.1 改造点 1：原生「新建与导入」菜单注入结构化模板

在知识库详情页头部（[`CollectionCard/Header.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/dataset/detail/CollectionCard/Header.tsx)）的「创建和导入」菜单中：
1. **保留原生选项**：文件导入、表格导入、QA导入、手动集合、文件夹；
2. **新增「企业产品模板」子分组**：
   - 📋 **录入产品主档** ➔ 点击打开 [`ProductMasterForm`](file:///root/FastGPT-source/projects/app/src/pageComponents/customerService/KnowledgeStudio/ProductMasterForm.tsx) 弹窗；
   - 📑 **录入操作手册** ➔ 点击打开 [`ManualForm`](file:///root/FastGPT-source/projects/app/src/pageComponents/customerService/KnowledgeStudio/ManualForm.tsx) 弹窗；
   - ⚠️ **录入故障排查卡** ➔ 点击打开 [`FaultCardForm`](file:///root/FastGPT-source/projects/app/src/pageComponents/customerService/KnowledgeStudio/FaultCardForm.tsx) 弹窗；
   - ❓ **批量 FAQ 编辑器** ➔ 点击打开 [`FaqBatchEditor`](file:///root/FastGPT-source/projects/app/src/pageComponents/customerService/KnowledgeStudio/FaqBatchEditor.tsx) 弹窗。

---

### 3.2 改造点 2：普通文件上传流程中增加【客服属性】选填配置

在原生文件/表格/QA 导入的设置步骤中（[`projects/app/src/pageComponents/dataset/detail/Import`](file:///root/FastGPT-source/projects/app/src/pageComponents/dataset/detail/Import)）：
- 增加一个轻量的 **【客服业务治理属性】** 折叠配置面板：
  1. **适用产品型号**：下拉选择（默认自动预选当前知识库绑定的型号）；
  2. **可见受众级别**：单选 `普通客户 (public)`、`经销商 (dealer)`、`内部售后 (internal)`（默认 public）；
  3. **知识类型**：下拉选择 12 种业务分类（默认自动按文件格式推断，如表格推断为 FAQ、文档推断为产品手册）；
- **行为约定**：
  - 点击“开始训练/保存”后，系统在创建 Collection 的同时，自动在 MongoDB 生成 `draft` 状态的治理记录；
  - 该 Collection 初始标记为 `forbid = true`（等待审核通过后才激活生效）。

---

### 3.3 改造点 3：原生集合列表增加【治理状态 & 一键提审】

在原生集合列表表格（[`CollectionCard/index.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/dataset/detail/CollectionCard/index.tsx)）中：
1. **增加「客服治理」列**：
   - 展示状态徽章：`草稿 (Draft)`、`待审核 (Pending)`、`已发布 (Published)`、`已驳回 (Rejected)`；
   - 展示关联型号 Tag 与受众 Tag（如 `DT-2026A` · `普通客户`）；
2. **增强行内操作菜单**：
   - **对于 `草稿` 或 `已驳回` 的集合**：
     - 若底层向量训练已就绪（`ready`），直接显示 **「提交审核」** 按钮；
     - 提供「编辑客服属性」按钮，可调整适用型号与受众；
   - **对于 `已发布` 的集合**：提供「下架」按钮；
   - **对于 `已驳回` 的集合**：悬浮展示驳回原因提示。

---

### 3.4 改造点 4：采编台定位升级为「全局草稿与待办归集箱」

- **采编人员日常**：直接在各个知识库详情页里上传文件或录入表单并点击提审；
- **采编台 ([`/dataset/editor`](file:///root/FastGPT-source/projects/app/src/pages/dataset/editor/index.tsx))**：升级为**跨知识库全局看板**，采编人员可在此统一查看自己名下所有被驳回的知识、待补充的草稿以及全库试问沙盒，无需逐个知识库翻找。
- **审核人员工作台 ([`/dataset/reviewer`](file:///root/FastGPT-source/projects/app/src/pages/dataset/reviewer/index.tsx))**：保持独立高效，集中进行跨知识库待审队列复核、Diff 对比与发布。

---

## 🔒 四、 安全与兼容性保障

1. **防自审硬约束不变**：无论从哪个入口提交，提审时均固化 `submitterTmbId`，审核员审核时严格执行 `submitterTmbId !== reviewerTmbId` 校验。
2. **检索白名单机制不变**：只有经过审核发布（`published`）的 Collection 才会解除 `forbid` 并进入客服检索白名单，草稿绝不污染线上问答。
3. **原生兼容性 100%**：对未配置客服属性的普通 FastGPT 数据集或原生 API，系统默认兼容处理，不产生任何副作用。

---

## 📋 五、 实施计划 (TODO)

- [ ] **Phase 1: Header 导入菜单增强**：在 `CollectionCard/Header.tsx` 接入 4 大结构化表单弹窗；
- [ ] **Phase 2: 导入向导扩展**：在原生 `Import` 流程中注入型号、受众、知识分类选择；
- [ ] **Phase 3: 集合列表治理列与操作**：在 `CollectionCard/index.tsx` 表格中接入客服状态 Tag、型号 Tag 及「一键提审」弹窗/接口；
- [ ] **Phase 4: 全量类型检查与构建验证**：运行 `typecheck`、单元测试与生产镜像打包验证。
