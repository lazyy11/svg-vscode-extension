# SVG Explorer & Outline (VSCode Extension)

轻量级 VSCode 扩展，为 `.svg` 文件提供：
1. **Explorer 文件标记**：在资源管理器中为 `.svg` 文件显示 `[]` 标记（不修改文件名与内容，自动排除目录与非 `.svg` 文件）。
2. **Outline 大纲导航**：在 VSCode 原生大纲视图中展示 SVG 元素嵌套层级，支持 `标签名#id` / `标签名` 展示、点击定位源码、编辑实时刷新及不完整 XML 容错。

## 文档

- 需求规格说明书：[docs/requirements.md](docs/requirements.md)
- 开发设计文档：[docs/design.md](docs/design.md)

## 目录结构

```text
├── .vscode/                             # F5 调试与编译任务配置
├── src/
│   ├── extension.ts                     # 扩展入口（activate / deactivate）
│   ├── core/                            # 纯领域层（零 vscode 依赖）
│   │   ├── svgFileRule.ts               # SVG 文件路径与类型判定规则
│   │   ├── svgOutlineNode.ts            # 大纲节点偏移量模型
│   │   └── svgOutlineParser.ts          # 轻量容错 SVG/XML 扫描与栈解析器
│   └── providers/                       # VSCode API 适配层
│       ├── svgFileDecorationProvider.ts # FileDecorationProvider 实现
│       └── svgDocumentSymbolProvider.ts # DocumentSymbolProvider 实现
├── test/                                # Vitest 单元测试
├── examples/                            # 示例 SVG 文件
└── docs/                                # 需求文档、设计文档与运行截图
```

## 快速开始

```bash
npm install
npm run compile
npm test
```

在 VSCode 中打开本仓库根目录后，按 `F5` 启动 **Extension Development Host** 进行调试。
