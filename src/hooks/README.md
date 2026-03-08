# hooks

## 目录职责
- 复用 Hook 目录，封装跨页面共享的状态与副作用逻辑。
- 上层模块会按目录职责组合使用本目录能力。
- 路径：`src/hooks/`

## 文件说明
- `use-budget.ts`：use budget 逻辑文件，封装该模块通用处理逻辑。
- `use-category.ts`：分类文件，处理分类数据结构与交互逻辑。
- `use-creator.tsx`：use creator 组件文件，承载界面展示与交互逻辑。
- `use-currency.ts`：币种文件，处理币种数据、换算或格式化逻辑。
- `use-custom-filters.ts`：use custom filters 逻辑文件，封装该模块通用处理逻辑。
- `use-long-press.ts`：use long press 逻辑文件，封装该模块通用处理逻辑。
- `use-media-query.ts`：use media query 逻辑文件，封装该模块通用处理逻辑。
- `use-page-visibility.tsx`：use page visibility 组件文件，承载界面展示与交互逻辑。
- `use-preset.ts`：use preset 逻辑文件，封装该模块通用处理逻辑。
- `use-quick-entry.tsx`：use quick entry 组件文件，承载界面展示与交互逻辑。
- `use-reduce-motion.ts`：use reduce motion 逻辑文件，封装该模块通用处理逻辑。
- `use-resize.tsx`：use resize 组件文件，承载界面展示与交互逻辑。
- `use-scheduled.ts`：调度文件，管理计划任务执行时序与触发逻辑。
- `use-snap.tsx`：use snap 组件文件，承载界面展示与交互逻辑。
- `use-tag.ts`：use tag 逻辑文件，封装该模块通用处理逻辑。
- `use-teleport.tsx`：use teleport 组件文件，承载界面展示与交互逻辑。
- `use-theme.tsx`：use theme 组件文件，承载界面展示与交互逻辑。
- `use-url-handler.tsx`：use url handler 组件文件，承载界面展示与交互逻辑。

## 子目录说明
- （暂无一级子目录）

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
