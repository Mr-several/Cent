# data-manager

## 目录职责
- 数据管理组件目录，承载导入导出与同步管理入口。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/data-manager/`

## 文件说明
- `index.tsx`：模块入口文件，负责对外导出公共能力。
- `llm-prompt.ts`：提示词文件，维护模型提示词与模板内容。
- `oncent.tsx`：oncent 组件文件，承载界面展示与交互逻辑。
- `preview-form.tsx`：表单文件，处理输入校验与提交流程。
- `preview.tsx`：preview 组件文件，承载界面展示与交互逻辑。
- `smart-import.tsx`：smart import 组件文件，承载界面展示与交互逻辑。
- `type-code.ts`：类型定义文件，约束模块输入输出数据结构。

## 子目录说明
- `schemas/`：Schema 目录，维护数据结构约束定义。

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
