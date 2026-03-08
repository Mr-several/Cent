# stat

## 目录职责
- 统计组件目录，封装统计卡片、趋势图和统计明细相关 UI 能力。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/stat/`

## 文件说明
- `analysic-cloud.tsx`：analysic cloud 组件文件，承载界面展示与交互逻辑。
- `analysis-detail.tsx`：分析文件，负责数据分析或统计预处理逻辑。
- `analysis-map.tsx`：分析文件，负责数据分析或统计预处理逻辑。
- `calendar-detail.tsx`：calendar detail 组件文件，承载界面展示与交互逻辑。
- `chart-part.tsx`：图表文件，负责统计数据可视化渲染。
- `date-slice.tsx`：date slice 组件文件，承载界面展示与交互逻辑。
- `focus-type.tsx`：类型定义文件，约束模块输入输出数据结构。
- `quick-metrics.tsx`：关键指标卡片网格组件，展示日均、周均、预计总额等核心分析数据。
- `static-item.tsx`：条目组件文件，渲染单项数据并提供局部交互。

## 子目录说明
- （暂无一级子目录）

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
