# ui

## 目录职责
- 基础 UI 组件目录，提供通用原子组件与基础交互。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/ui/`

## 文件说明
- `button.tsx`：按钮组件文件，封装按钮样式与触发行为。
- `calendar.tsx`：calendar 组件文件，承载界面展示与交互逻辑。
- `checkbox.tsx`：checkbox 组件文件，承载界面展示与交互逻辑。
- `dropdown-menu.tsx`：dropdown menu 组件文件，承载界面展示与交互逻辑。
- `form.tsx`：表单文件，处理输入校验与提交流程。
- `input.tsx`：input 组件文件，承载界面展示与交互逻辑。
- `label.tsx`：label 组件文件，承载界面展示与交互逻辑。
- `popover.tsx`：popover 组件文件，承载界面展示与交互逻辑。
- `progress.tsx`：progress 组件文件，承载界面展示与交互逻辑。
- `radio-group.tsx`：radio group 组件文件，承载界面展示与交互逻辑。
- `select.tsx`：select 组件文件，承载界面展示与交互逻辑。
- `skeleton.tsx`：skeleton 组件文件，承载界面展示与交互逻辑。
- `sonner.tsx`：sonner 组件文件，承载界面展示与交互逻辑。
- `switch.tsx`：switch 组件文件，承载界面展示与交互逻辑。
- `tabs.tsx`：tabs 组件文件，承载界面展示与交互逻辑。
- `tooltip.tsx`：tooltip 组件文件，承载界面展示与交互逻辑。

## 子目录说明
- `dialog/`：对话框基础组件目录，封装 dialog 原子实现。

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
