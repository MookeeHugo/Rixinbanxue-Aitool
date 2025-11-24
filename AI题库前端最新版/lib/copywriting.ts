// 集中管理所有中文文案
export const copywriting = {
  // 通用
  common: {
    confirm: "确认",
    cancel: "取消",
    save: "保存",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    back: "返回",
    continue: "继续",
    retry: "重试",
    loading: "加载中...",
    success: "操作成功",
    error: "操作失败",
    submit: "提交",
    reset: "重置",
  },

  // 上传页面
  upload: {
    title: "上传试卷",
    description: "支持 PDF、图片等多种格式",
    dragText: "拖拽文件到此处，或点击选择文件",
    supportedFormats: "支持 PDF、JPG、PNG 格式",
    maxSize: "单个文件不超过 50MB",
    uploading: "上传中...",
    uploadSuccess: "上传成功",
    uploadFailed: "上传失败",
    startParsing: "开始解析",
  },

  // 解析页面
  parse: {
    title: "解析题目",
    description: "AI智能解析题目内容和结构",
    parsing: "正在解析",
    parseComplete: "解析完成",
    reparseAll: "全部重新解析",
    reparseQuestion: "重新解析此题",
    parsedCount: (count: number) => `已解析 ${count} 道题目...`,
    selectedCount: (parsed: number, selected: number) => `共识别 ${parsed} 道题目，已选择 ${selected} 道`,
    checkContent: "请检查题目内容是否正确，可以编辑或取消选择不需要的题目",
    continueEdit: (count: number) => `继续编辑标签 (${count})`,
    backToUpload: "返回上传",
    noTask: "暂无解析任务",
    noTaskDesc: "请先上传文件开始解析",
    goUpload: "去上传",
    parsingInProgress: "当前有解析任务正在进行，请等待完成后再操作",
    reparsingInProgress: "当前有题目正在重新解析，请等待完成后再操作",
  },

  // 编辑页面
  edit: {
    title: "编辑标签",
    description: "为题目添加分类标签",
    editingQuestion: (index: number) => `正在编辑第 ${index} 题`,
    addTagHint: "请点击下方标签添加",
    customTag: "自定义编辑",
    searchPlaceholder: "输入自定义标签或搜索...",
    addButton: "添加",
    submitQuestion: "提交当前题目",
    saveToLibrary: "保存到题库",
    noQuestions: "暂无待编辑题目",
    noQuestionsDesc: "请先完成题目解析",
    goParse: "去解析",
  },

  // 题库页面
  library: {
    title: "题库管理",
    description: "查看和管理已保存的题目",
    searchPlaceholder: "搜索题目内容、知识点...",
    filterAll: "全部",
    filterBySource: "按来源筛选",
    filterByDifficulty: "按难度筛选",
    batchOperation: "批量操作",
    exportSelected: "导出选中",
    deleteSelected: "删除选中",
    noQuestions: "暂无题目",
    noQuestionsDesc: "还没有保存任何题目到题库",
    startRecord: "开始录题",
    questionCount: (count: number) => `共 ${count} 道题目`,
  },

  // 高级编辑器
  advancedEditor: {
    title: "编辑题目",
    contentTab: "题目内容",
    tagsTab: "标签分类",
    materialsTab: "素材面板",
    ocrReference: "OCR 原文对照",
    lowConfidence: "低置信度区域",
    insertImage: "插入图片",
    imageWidth: "图片宽度",
    imageAlign: "对齐方式",
    imageCaption: "图片说明",
    alignLeft: "左对齐",
    alignCenter: "居中",
    alignRight: "右对齐",
    unusedImages: "未使用的图片",
    usedImages: "已插入图片",
    aiSuggestions: "AI 建议标签",
    dragHint: "拖拽图片到左侧编辑器插入",
    noUnusedImages: "暂无未使用的图片",
    saveChanges: "保存修改",
  },

  // 管理后台
  admin: {
    dashboard: "仪表盘",
    uploadMonitor: "上传监控",
    questionBank: "题库管理",
    tagSystem: "标签体系",
    providerManagement: "供应商管理",
    aiPipeline: "AI 流水线",
    membership: "会员套餐",
    inviteCode: "邀请码",
    usageDashboard: "用量统计",
    branding: "品牌定制",
    auditLog: "审计日志",
    alerts: "告警通知",
  },

  // 错误提示
  errors: {
    uploadFailed: "文件上传失败，请重试",
    parseFailed: "解析失败，请检查文件格式",
    networkError: "网络错误，请检查网络连接",
    fileTypeNotSupported: "不支持的文件类型",
    fileTooLarge: "文件过大",
    saveFailed: "保存失败，请重试",
    loadFailed: "加载失败，请刷新页面",
  },

  // 成功提示
  success: {
    uploadSuccess: "上传成功",
    parseSuccess: "解析成功",
    saveSuccess: "保存成功",
    deleteSuccess: "删除成功",
    exportSuccess: "导出成功",
  },
}
