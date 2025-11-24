export const mockAdvancedQuestionData = [
  {
    id: "q1",
    type: "choice" as const,
    content: "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为",
    options: ["A. 1", "B. 2", "C. 3", "D. 4"],
    answer: "D",
    difficulty: "medium" as const,
    hasImage: false,

    // 高级编辑器数据
    ocrText:
      "若集合 A = {x | x² - 3x + 2 = 0}，B = {x | 0 < x < 5, x ∈ N}，则满足条件 A ⊆ C ⊆ B 的集合 C 的个数为\n\nA. 1\nB. 2\nC. 3\nD. 4",
    rawOcrText: "若集合 A = {x丨x2-3x+2=0}，B={x丨0<x<5，x∈N}，则满是条件A⊆C⊆B的集合C的个数为\n\nA.1\nB.2\nC.3\nD.4",
    confidence: 0.95,
    lowConfidenceRanges: [
      { start: 12, end: 14, text: "x²", originalText: "x2", confidence: 0.75 },
      { start: 45, end: 47, text: "满足", originalText: "满是", confidence: 0.72 },
    ],
    imageBlocks: [
      {
        id: "img1",
        url: "/set-theory-venn-diagram.jpg",
        width: 300,
        height: 200,
        caption: "集合关系维恩图",
        isUsed: false,
        suggestedPosition: 0,
      },
    ],
    aiSuggestions: {
      tags: {
        source: ["人教版"],
        textbook: ["高中数学必修一"],
        semester: ["高一上学期"],
        knowledgePoints: ["集合的基本关系", "子集的个数"],
        thinkingMethod: ["分类讨论", "枚举法"],
        difficulty: ["中等"],
      },
      confidence: 0.88,
    },
  },
  {
    id: "q2",
    type: "choice" as const,
    content: "已知函数 f(x) = sin(ωx + φ) (ω > 0, |φ| < π/2) 的最小正周期为 π，且其图象关于直线 x = π/3 对称，则",
    options: [
      "A. y = f(x) 的图象关于点 (π/4, 0) 对称",
      "B. y = f(x) 的图象关于点 (5π/12, 0) 对称",
      "C. y = f(x) 在区间 (0, π/6) 上单调递增",
      "D. y = f(x) 在区间 (π/6, π/3) 上单调递减",
    ],
    answer: "B",
    difficulty: "hard" as const,
    hasImage: true,

    // 高级编辑器数据
    ocrText:
      "已知函数 f(x) = sin(ωx + φ) (ω > 0, |φ| < π/2) 的最小正周期为 π，且其图象关于直线 x = π/3 对称，则\n\nA. y = f(x) 的图象关于点 (π/4, 0) 对称\nB. y = f(x) 的图象关于点 (5π/12, 0) 对称\nC. y = f(x) 在区间 (0, π/6) 上单调递增\nD. y = f(x) 在区间 (π/6, π/3) 上单调递减",
    rawOcrText:
      "已知函数f(x)=sin(ωx+φ)(ω>0，丨φ丨<π/2)的最小正周期为π，且其图象关于直线x=π/3对称，则\n\nA.y=f(x)的图象关于点(π/4，O)对称\nB.y=f(x)的图象关于点(5π/12，O)对称\nC.y=f(x)在区问(0，π/6)上单调递增\nD.y=f(x)在区问(π/6，π/3)上单调递减",
    confidence: 0.82,
    lowConfidenceRanges: [
      { start: 28, end: 31, text: "|φ|", originalText: "丨φ丨", confidence: 0.68 },
      { start: 95, end: 96, text: "0", originalText: "O", confidence: 0.65 },
      { start: 130, end: 131, text: "0", originalText: "O", confidence: 0.65 },
      { start: 155, end: 157, text: "区间", originalText: "区问", confidence: 0.7 },
      { start: 185, end: 187, text: "区间", originalText: "区问", confidence: 0.7 },
    ],
    imageBlocks: [
      {
        id: "img2",
        url: "/sine-function-graph-with-period-pi.jpg",
        width: 400,
        height: 200,
        caption: "正弦函数图象（周期为π）",
        isUsed: true,
        insertedAt: 85,
        alignment: "center",
      },
      {
        id: "img3",
        url: "/unit-circle-trigonometry.jpg",
        width: 350,
        height: 350,
        caption: "单位圆三角函数示意图",
        isUsed: false,
        suggestedPosition: 0,
      },
    ],
    aiSuggestions: {
      tags: {
        source: ["新课标全国卷"],
        textbook: ["高中数学必修四"],
        semester: ["高一下学期"],
        knowledgePoints: ["三角函数的图象与性质", "正弦函数", "函数的对称性", "函数的周期性"],
        thinkingMethod: ["数形结合", "特殊值法"],
        difficulty: ["较难"],
      },
      confidence: 0.92,
    },
  },
  {
    id: "q3",
    type: "fill" as const,
    content: "已知向量 a = (1, 2), b = (x, 1). 若 a // b, 则 x = ______.",
    answer: "1/2",
    difficulty: "easy" as const,
    hasImage: false,

    // 高级编辑器数据
    ocrText: "已知向量 a = (1, 2), b = (x, 1). 若 a // b, 则 x = ______.",
    rawOcrText: "已知向量a=(1，2)，b=(x，1).若a//b，则x=______.",
    confidence: 0.98,
    lowConfidenceRanges: [],
    imageBlocks: [],
    aiSuggestions: {
      tags: {
        source: ["基础练习"],
        textbook: ["高中数学必修二"],
        semester: ["高一上学期"],
        knowledgePoints: ["平面向量共线"],
        thinkingMethod: ["公式法"],
        difficulty: ["简单"],
      },
      confidence: 0.99,
    },
  },
]
