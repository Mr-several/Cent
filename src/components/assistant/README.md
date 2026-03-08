# assistant

## 目录职责
- AI 助手组件目录，承载会话入口与辅助交互 UI。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/assistant/`

## 文件说明
- `chat-card.tsx`：chat card 组件文件，承载界面展示与交互逻辑。
- `chat.ts`：chat 逻辑文件，封装该模块通用处理逻辑。
- `env.ts`：env 逻辑文件，封装该模块通用处理逻辑。
- `functions.ts`：functions 逻辑文件，封装该模块通用处理逻辑。
- `index.tsx`：模块入口文件，负责对外导出公共能力。
- `request.ts`：request 逻辑文件，封装该模块通用处理逻辑。
- `style.css`：style 样式文件，定义该模块对应的样式规则。
- `system-prompt.ts`：提示词文件，维护模型提示词与模板内容。
- `text-to-bill.ts`：账单文件，处理账单相关数据或交互逻辑。

## 子目录说明
- （暂无一级子目录）

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
