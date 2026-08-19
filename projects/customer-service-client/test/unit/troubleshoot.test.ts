import { describe, it, expect } from 'vitest';
import { extractTroubleshootSteps, formatStepsForHandoff } from '../../src/utils/troubleshoot';

describe('Troubleshoot Steps Extractor', () => {
  it('should extract numbered steps from standard markdown', () => {
    const markdown = `
您好！针对卡纸问题，请按以下步骤排查：
1. 切断电源并拔掉插头
2. 打开前仓门取出卡阻的相纸
3. 检查滚轮是否有纸屑并重新开机测试
    `;
    const steps = extractTroubleshootSteps(markdown);
    expect(steps.length).toBe(3);
    expect(steps[0].title).toBe('切断电源并拔掉插头');
    expect(steps[0].isDanger).toBe(true);
    expect(steps[1].title).toBe('打开前仓门取出卡阻的相纸');
    expect(steps[2].title).toBe('检查滚轮是否有纸屑并重新开机测试');
  });

  it('should extract chinese format numbered steps and sub-step details', () => {
    const markdown = `
排查指南：
步骤 1: 检查高压电源供电
  - 确认插座指示灯点亮
步骤 2: 重新插拔控制板 HDMI 视频线
  - 确保接头无松动
步骤 3: 重启主机观察 BIOS 自检
    `;
    const steps = extractTroubleshootSteps(markdown);
    expect(steps.length).toBe(3);
    expect(steps[0].title).toBe('检查高压电源供电');
    expect(steps[0].isDanger).toBe(true);
    expect(steps[0].detail).toContain('确认插座指示灯点亮');
    expect(steps[1].detail).toContain('确保接头无松动');
  });

  it('should extract checkbox list syntax', () => {
    const markdown = `
- [ ] 切断电源与机身断电
- [ ] 清理出纸口残留卡纸
- [ ] 盖上仓门重启
    `;
    const steps = extractTroubleshootSteps(markdown);
    expect(steps.length).toBe(3);
    expect(steps[0].title).toBe('切断电源与机身断电');
    expect(steps[0].isDanger).toBe(true);
  });

  it('should return empty array if less than 2 steps are identified', () => {
    const singleStep = '1. 仅有这一步描述';
    expect(extractTroubleshootSteps(singleStep)).toEqual([]);

    const plainText = '请直接联系管理员，无需自行排查。';
    expect(extractTroubleshootSteps(plainText)).toEqual([]);
  });

  it('should strip bold markdown formatting from step titles', () => {
    const markdown = `
1. **切断电源并拔下插头**
2. **打开前仓门检查切刀**
    `;
    const steps = extractTroubleshootSteps(markdown);
    expect(steps.length).toBe(2);
    expect(steps[0].title).toBe('切断电源并拔下插头');
    expect(steps[1].title).toBe('打开前仓门检查切刀');
  });

  it('should format steps correctly for human handoff ticket', () => {
    const steps = [
      { id: '1', index: 1, title: '断开市电电源', completed: true, isDanger: true },
      { id: '2', index: 2, title: '检查切刀导轨', completed: false, isDanger: false }
    ];
    const handoffSteps = formatStepsForHandoff(steps);
    expect(handoffSteps).toEqual([
      { title: '断开市电电源', completed: true },
      { title: '检查切刀导轨', completed: false }
    ]);
  });
});
