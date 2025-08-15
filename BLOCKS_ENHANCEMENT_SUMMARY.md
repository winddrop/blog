# Notion blocksToMarkdown 方法增强总结

## 修改概述

本次修改扩展了 `scripts/notion-client.js` 中的 `blocksToMarkdown` 方法，新增了对多种 Notion block 类型的支持，并增强了列表的嵌套处理能力。

## 新增支持的 Block 类型

### 1. Callout 块
**功能**: 将 Notion 的 callout 块转换为 Markdown 引用格式
**特性**:
- 支持图标显示（emoji）
- 支持嵌套子内容
- 使用引用格式（`>`）来表示

**输出示例**:
```markdown
> 💡 **注意**
> 
> 这是一个重要提示
```

### 2. Embed 块
**功能**: 处理各种嵌入内容
**支持的平台**:
- YouTube 视频：显示为 📺 **视频**
- CodePen：显示为 💻 **CodePen**
- 其他平台：显示为 🔗 **嵌入内容**

**输出示例**:
```markdown
📺 **视频**: [视频标题](https://youtube.com/watch?v=...)
💻 **CodePen**: [演示标题](https://codepen.io/...)
🔗 **嵌入内容**: [查看内容](https://example.com)
```

### 3. Bookmark 块
**功能**: 将书签转换为链接格式
**特性**:
- 使用书签图标 🔖
- 支持自定义标题

**输出示例**:
```markdown
🔖 **书签**: [GitHub 官网](https://github.com)
```

### 4. Table 块
**功能**: 将 Notion 表格转换为标准 Markdown 表格
**特性**:
- 自动处理表头和数据行
- 支持特殊字符转义（如 `|` 字符）
- 自动对齐列数

**输出示例**:
```markdown
| 姓名 | 年龄 | 职业 |
| --- | --- | --- |
| 张三 | 25 | 工程师 |
| 李四 | 30 | 设计师 |
```

## 增强的列表嵌套支持

### Bulleted List Item（无序列表）
**改进**: 新增对 `has_children` 的处理
**特性**:
- 支持多级嵌套
- 子项目自动添加 2 个空格缩进
- 递归处理所有层级

**输出示例**:
```markdown
- 主项目
  - 子项目 1
  - 子项目 2
    - 更深层的子项目
```

### Numbered List Item（有序列表）
**改进**: 新增对 `has_children` 的处理
**特性**:
- 支持多级嵌套
- 子项目自动添加 3 个空格缩进
- 递归处理所有层级

**输出示例**:
```markdown
1. 主项目
   1. 子项目 1
   2. 子项目 2
      1. 更深层的子项目
```

## 技术实现细节

### 错误处理
- 每种新的 block 类型都包含完整的错误处理
- 失败时会输出警告信息并插入注释
- 不会中断整个转换过程

### 参数修复
- 修复了所有 `getPageContent` 调用的参数问题
- 统一传递空对象 `{}` 作为第二个参数

### 递归处理
- 所有支持子内容的 block 类型都正确实现了递归处理
- 子内容会根据父级类型添加适当的格式化

## 测试验证

✅ **Callout 测试**: 成功转换为引用格式，支持图标和嵌套内容
✅ **Embed 测试**: 正确识别 YouTube 链接并添加相应图标
✅ **Bookmark 测试**: 成功转换为书签格式
✅ **Table 测试**: 正确生成 Markdown 表格格式
✅ **嵌套列表测试**: 子项目正确缩进和格式化

## 使用方法

运行同步命令即可使用所有新功能：
```bash
npm run sync
```

现在 `blocksToMarkdown` 方法支持的完整 block 类型列表：
- ✅ paragraph
- ✅ heading_1, heading_2, heading_3
- ✅ bulleted_list_item（增强：支持嵌套）
- ✅ numbered_list_item（增强：支持嵌套）
- ✅ code
- ✅ quote
- ✅ divider
- ✅ image（已集成图片转存功能）
- ✅ callout（新增）
- ✅ embed（新增）
- ✅ bookmark（新增）
- ✅ table（新增）

## 向后兼容性

所有修改都保持向后兼容，原有的 block 类型处理逻辑未受影响。
