# FastGPT 原生化架构重构 Trellis 实施规范与执行流程

- **项目名称**：智能客服能力解耦与 FastGPT 原生体系深度融合 (Native First)
- **文档版本**：Trellis V1.0
- **编制日期**：2026-08-18
- **执行模式**：Trellis 阶段化多子代理协同执行

---

## 🎯 一、 核心目标与需求边界 (Scope & Boundaries)

### 1.1 核心目标
1. **彻底拆解孤岛外挂系统**：
   - 彻底废除 `/customer-service` 内部独立嵌套的控制台、大厅和人员中心，将所有核心业务能力解耦并沉淀为 FastGPT 原生的基础能力。
2. **账号与团队管理原生统一 (`/account/team`)**：
   - 管理员在原生「团队管理」页面即可一键输入用户名、初始密码直接创建成员，并赋予客服岗位与品类管辖权限。
   - 在原生成员列表中直观呈现角色 Tag，并支持一键修改权限、重置密码。
3. **知识生产与审核流无缝融入知识库 (`/dataset`)**：
   - 在知识库根模块提供【知识库总览 (`/dataset/list`)】、【知识采编台 (`/dataset/editor`)】、【知识审核台 (`/dataset/reviewer`)】的直达通道。
   - 采编员、审核员登录后直达对应生产工作台，杜绝无意义的多层页面寻找。
4. **全局导航精简**：
   - 左侧全局主导航恢复标准的 4 项原生导航（💬 对话、🛠️ 工作区、📚 知识库、👤 账号），保持工业级干净体验。

### 1.2 边界与约束 (Constraints & Boundary Matrix)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Trellis 实施边界界定                           │
├─────────────────────────────────────┬────────────────────────────────────┤
│         ✅ 包含范围 (In Scope)       │        ❌ 排除范围 (Out of Scope)  │
├─────────────────────────────────────┼────────────────────────────────────┤
│ 1. 原生 /account/team 直接建号与岗位│ 1. 不修改 FastGPT 底层通用向量计算 │
│    展示、品类权限分配与维护         │ 2. 不破坏原生邀请链接加入机制      │
│ 2. /dataset/editor 知识采编台原生接入│ 3. 不改动独立客户端 Widget 嵌入逻辑│
│ 3. /dataset/reviewer 审核台原生接入 │ 4. 不引入第三方未授权的外部依赖库  │
│ 4. 侧边栏与全局路由平滑重定向       │                                    │
│ 5. 自动化测试用例覆盖与回归验收     │                                    │
└─────────────────────────────────────┴────────────────────────────────────┘
```

---

## 🔄 二、 Trellis 任务流程与阶段划分 (Workflow Phases)

```mermaid
graph TD
    subgraph Phase 1 [阶段 1: 原生团队与权限管理深度打通]
        P1_1[1.1 原生成员列表增强: 展示客服角色与品类Tag]
        P1_2[1.2 直接建号弹窗: 支持品类多选与初始密码]
        P1_3[1.3 成员行操作: 支持一键编辑岗位与品类权限]
    end

    subgraph Phase 2 [阶段 2: 知识库采编与审核流原生对齐]
        P2_1[2.1 知识库列表顶部 Tab 与快捷直达按钮]
        P2_2[2.2 采编台 /dataset/editor 视觉与交互原生化]
        P2_3[2.3 审核台 /dataset/reviewer 视觉与交互原生化]
    end

    subgraph Phase 3 [阶段 3: 路由兼容与全局侧边栏清理]
        P3_1[3.1 全局侧边栏清理: navbar.tsx & navbarPhone.tsx]
        P3_2[3.2 历史路由 301/302 优雅跳转与兼容]
    end

    subgraph Phase 4 [阶段 4: 自动化测试与全量验收]
        P4_1[4.1 运行直接建号与权限绑定测试]
        P4_2[4.2 运行采编提审与审核发布流测试]
        P4_3[4.3 前端编译与 TypeScript 检查]
    end

    Phase 1 --> Phase 2 --> Phase 3 --> Phase 4
```

---

## 📋 三、 细分子任务与执行派发矩阵 (Subagent Dispatch Matrix)

| 阶段 | 子任务编号 | 任务描述 | 涉及文件 | 派发代理角色 |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Task-1.1** | 原生团队管理直接建号弹窗 (`DirectAddMemberModal`) 支持品类与模型权限多选 | [`projects/app/src/pageComponents/account/team/DirectAddMemberModal.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/account/team/DirectAddMemberModal.tsx) | `TeamAccountAgent` |
| **Phase 1** | **Task-1.2** | 原生成员表格 (`MemberTable.tsx`) 增加客服角色与品类展示，并支持行内修改权限 | [`projects/app/src/pageComponents/account/team/MemberTable.tsx`](file:///root/FastGPT-source/projects/app/src/pageComponents/account/team/MemberTable.tsx) | `TeamAccountAgent` |
| **Phase 2** | **Task-2.1** | 知识采编台与审核台原生布局强化，顶部导航与 FastGPT 知识库风格对齐 | [`projects/app/src/pages/dataset/editor/index.tsx`](file:///root/FastGPT-source/projects/app/src/pages/dataset/editor/index.tsx)<br>[`projects/app/src/pages/dataset/reviewer/index.tsx`](file:///root/FastGPT-source/projects/app/src/pages/dataset/reviewer/index.tsx) | `DatasetWorkflowAgent` |
| **Phase 3** | **Task-3.1** | 侧边栏与全局布局确保 4 级原生导航，路由重定向覆盖无死链 | [`projects/app/src/components/Layout/navbar.tsx`](file:///root/FastGPT-source/projects/app/src/components/Layout/navbar.tsx) | `LayoutRouteAgent` |
| **Phase 4** | **Task-4.1** | 自动化测试与全链路回归验收 | [`projects/app/test/api/customerService/admin/role/createMember.test.ts`](file:///root/FastGPT-source/projects/app/test/api/customerService/admin/role/createMember.test.ts) | `QAAgent` |

---

## 🎯 四、 验收标准 (Acceptance Criteria)

1. **功能闭环**：
   - 管理员在 `/account/team` 点击「直接添加成员」，输入用户名、密码、角色与品类，提交后账号即可成功登录；
   - 采编员登录后可直接进入 `/dataset/editor` 进行结构化模板编写与提审；
   - 审核员登录后可直接进入 `/dataset/reviewer` 进行版本 Diff 对比与一键发布；
2. **UI 与交互规范**：
   - 彻底移除了原 `/customer-service` 侧边栏，没有多层嵌套的 console 大厅；
   - 访问 `/customer-service/roles` 与 `/customer-service/console` 能无缝跳转至对应原生页面；
3. **测试覆盖**：
   - 所有相关单元测试 100% 通过。
