import type { TroubleshootStep } from '../types';

/**
 * 高危断电/拆机安全关键词匹配正则
 */
export const DANGER_STEP_REGEX =
  /高压|断电|触电|插头|切断.*电源|关闭.*电源|断开.*电源|220V|严禁带电|危险|开箱|拆机|拆卸|强电|制冷剂|冷媒|电容放电|变压器/i;

/**
 * 匹配 Markdown 编号排查步骤开头的正则模式
 * 1. "1. 步骤名称" / "1、步骤名称" / "1) 步骤名称"
 * 2. "步骤 1: 步骤名称" / "步骤一：步骤名称" / "第 1 步：步骤名称" / "第1步: 步骤名称"
 * 3. "- [ ] 步骤名称" / "- [x] 步骤名称"
 * 4. "Step 1: 步骤名称" / "STEP 1 - 步骤名称"
 */
export const STEP_HEADER_REGEX =
  /^(?:(?:步骤|第|step)\s*(\d+|[一二三四五六七八九十])\s*[\.、:：\-\s]\s*|\d+[\.、\)]\s+|- \[\s*[xX ]?\s*\]\s+)(.+)$/i;

/**
 * 从 Markdown 文本中智能提取结构化排查步骤清单
 * @param content 助手输出的 Markdown 文本
 * @returns 提取到的步骤数组，少于 2 步时返回空数组
 */
export const extractTroubleshootSteps = (content: string): TroubleshootStep[] => {
  if (!content) return [];

  const lines = content.split('\n');
  const steps: TroubleshootStep[] = [];
  let currentStep: TroubleshootStep | null = null;
  let stepCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(STEP_HEADER_REGEX);
    if (match) {
      if (currentStep) {
        steps.push(currentStep);
      }

      // 清洗步骤标题，移除加粗、反引号等 Markdown 语法标记
      const rawTitle = (match[2] || match[1] || '').trim();
      const cleanTitle = rawTitle
        .replace(/^\*\*(.*?)\*\*$/, '$1')
        .replace(/^`+(.*?)`+$/, '$1')
        .trim();

      // 长度在合理范围内 (4 ~ 180 字符)
      if (cleanTitle.length >= 3 && cleanTitle.length <= 200) {
        const isDanger = DANGER_STEP_REGEX.test(cleanTitle);

        currentStep = {
          id: `step-${stepCounter}`,
          index: stepCounter,
          title: cleanTitle,
          completed: false,
          isDanger
        };
        stepCounter++;
      } else {
        currentStep = null;
      }
    } else if (
      currentStep &&
      (rawLine.startsWith('  ') ||
        rawLine.startsWith('\t') ||
        trimmed.startsWith('- ') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('> '))
    ) {
      // 捕获步骤下方的缩进说明或引用要领 (detail)
      const cleanSubLine = trimmed.replace(/^[-*>\s]+/, '').trim();
      if (cleanSubLine) {
        currentStep.detail = currentStep.detail
          ? `${currentStep.detail}；${cleanSubLine}`
          : cleanSubLine;
        // 如果补充说明中也包含高危词，也标为危险
        if (DANGER_STEP_REGEX.test(cleanSubLine)) {
          currentStep.isDanger = true;
        }
      }
    }
  }

  if (currentStep) {
    steps.push(currentStep);
  }

  // 门限判定：至少提取到 2 个连续有效排查步骤才激活交互式排查卡片
  return steps.length >= 2 ? steps : [];
};

/**
 * 将排查步骤格式化为转人工工单所需的步骤结构
 */
export const formatStepsForHandoff = (
  steps: TroubleshootStep[]
): { title: string; completed: boolean }[] => {
  return steps.map((step) => ({
    title: step.title,
    completed: !!step.completed
  }));
};
