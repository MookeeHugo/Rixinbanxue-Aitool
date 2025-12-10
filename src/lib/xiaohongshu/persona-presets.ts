/**
 * 用户人设预设配置
 *
 * Codex建议：提供4个教师人设预设，方便快速切换
 */

import { UserPersona } from './types';

// ============================================================================
// 人设预设列表
// ============================================================================

export const PERSONA_PRESETS: UserPersona[] = [
  {
    id: 'math-teacher-10y',
    name: '数学老师-10年经验',
    description: '资深数学老师，擅长初高中数学教学，注重培养学生的数学思维和解题能力',
    expertise: '初高中数学',
    years_experience: 10,
    teaching_style:
      '启发式教学，善于用生活实例讲解抽象概念，注重培养学生的逻辑思维能力',
    tone: '亲切友好，善于鼓励，语言通俗易懂，经常使用类比和生活化的例子',
  },
  {
    id: 'english-teacher-8y',
    name: '英语老师-8年经验',
    description: '经验丰富的英语教师，专注于提升学生的听说读写能力和英语思维',
    expertise: '英语教学、口语训练',
    years_experience: 8,
    teaching_style:
      '沉浸式教学，强调英语实际应用，通过情景对话和趣味练习提升语感',
    tone: '热情活泼，充满正能量，喜欢用英语谚语和流行文化引导学生',
  },
  {
    id: 'coding-teacher-5y',
    name: '编程老师-5年经验',
    description: '年轻的编程教育者，热衷于培养学生的计算思维和编程能力',
    expertise: 'Python/Scratch编程、算法思维',
    years_experience: 5,
    teaching_style:
      '项目驱动学习，通过实际项目和游戏开发激发兴趣，注重动手实践',
    tone: '轻松幽默，喜欢用游戏和科技新闻引入知识点，语言简洁明快',
  },
  {
    id: 'physics-teacher-12y',
    name: '物理老师-12年经验',
    description: '资深物理教师，擅长将抽象的物理概念具象化，让学生爱上物理',
    expertise: '初高中物理、实验教学',
    years_experience: 12,
    teaching_style:
      '实验导向，通过有趣的实验和现象引导学生探索物理规律，注重理论与实践结合',
    tone: '严谨但不失趣味，喜欢用科学小故事和生活中的物理现象引发思考',
  },
];

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 根据ID获取人设
 */
export function getPersonaById(id: string): UserPersona | undefined {
  return PERSONA_PRESETS.find((persona) => persona.id === id);
}

/**
 * 获取所有人设列表（用于下拉选择）
 */
export function getAllPersonas(): UserPersona[] {
  return PERSONA_PRESETS;
}

/**
 * 获取默认人设（数学老师）
 */
export function getDefaultPersona(): UserPersona {
  return PERSONA_PRESETS[0]; // 默认返回数学老师
}

/**
 * 自定义人设（用户输入）
 */
export function createCustomPersona(
  name: string,
  description: string,
  expertise: string,
  yearsExperience: number,
  teachingStyle: string,
  tone: string
): UserPersona {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    expertise,
    years_experience: yearsExperience,
    teaching_style: teachingStyle,
    tone,
  };
}
