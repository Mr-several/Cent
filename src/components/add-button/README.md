# add-button

## 目录职责
- 新增入口按钮组件目录，聚合创建动作入口与交互反馈。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/add-button/`

## 文件说明
- `base.tsx`：base 组件文件，承载界面展示与交互逻辑。
- `index.tsx`：模块入口文件，负责对外导出公共能力。
- `keyboard-add.tsx`：keyboard add 组件文件，承载界面展示与交互逻辑。
- `keyboard-form.tsx`：表单文件，处理输入校验与提交流程。
- `recognize.ts`：recognize 逻辑文件，封装该模块通用处理逻辑。
- `voice-add.tsx`：voice add 组件文件，承载界面展示与交互逻辑。
- `voice-form.tsx`：表单文件，处理输入校验与提交流程。

## 子目录说明
- （暂无一级子目录）

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
