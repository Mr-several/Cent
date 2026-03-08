# components

## 目录职责
- 通用组件目录，沉淀可复用 UI 组件与交互容器。
- 页面与容器组件通常直接组合本目录能力。
- 路径：`src/components/`

## 文件说明
- `animated-number.tsx`：animated number 组件文件，承载界面展示与交互逻辑。
- `clearable.tsx`：clearable 组件文件，承载界面展示与交互逻辑。
- `date-picker.tsx`：date picker 组件文件，承载界面展示与交互逻辑。
- `deletable.tsx`：deletable 组件文件，承载界面展示与交互逻辑。
- `file-picker.ts`：file picker 逻辑文件，封装该模块通用处理逻辑。
- `image.tsx`：image 组件文件，承载界面展示与交互逻辑。
- `indicator.tsx`：indicator 组件文件，承载界面展示与交互逻辑。
- `input.tsx`：input 组件文件，承载界面展示与交互逻辑。
- `keyboard.tsx`：keyboard 组件文件，承载界面展示与交互逻辑。
- `loading.tsx`：loading 组件文件，承载界面展示与交互逻辑。
- `navigation.tsx`：navigation 组件文件，承载界面展示与交互逻辑。
- `simple-location.tsx`：simple location 组件文件，承载界面展示与交互逻辑。
- `tag.tsx`：tag 组件文件，承载界面展示与交互逻辑。

## 子目录说明
- `add-button/`：新增入口按钮组件目录，聚合创建动作入口与交互反馈。
- `assistant/`：AI 助手组件目录，承载会话入口与辅助交互 UI。
- `bill-editor/`：账单编辑组件目录，负责账单创建与编辑表单交互。
- `bill-filter/`：账单筛选组件目录，提供条件筛选与结果收敛交互。
- `bill-info/`：账单信息组件目录，负责账单详情字段展示。
- `bill-tag/`：账单标签组件目录，负责标签展示与编辑入口。
- `book/`：账本组件目录，负责账本切换与账本信息展示。
- `budget/`：预算组件目录，负责预算配置与预算状态展示。
- `cascade/`：级联选择组件目录，处理层级数据选择交互。
- `category/`：分类组件目录，负责分类选择、展示与维护。
- `chart/`：图表组件目录，封装统计图表展示能力。
- `confirm/`：确认组件目录，统一确认弹窗与确认流程。
- `currency/`：币种组件目录，负责币种展示、选择与输入。
- `data-manager/`：数据管理组件目录，承载导入导出与同步管理入口。
- `hint/`：提示组件目录，提供提示信息与轻量引导。
- `ledger/`：账本视图组件目录，组织账单列表与账本视图单元。
- `loading/`：加载组件目录，统一骨架屏与加载态表现。
- `login/`：登录组件目录，承载鉴权入口与登录流程 UI。
- `map/`：地图组件目录，处理地理位置展示相关交互。
- `modal/`：模态组件目录，统一模态弹窗容器与生命周期。
- `money/`：金额组件目录，负责金额输入、格式化与展示。
- `promotion/`：推广组件目录，承载推广位与活动引导 UI。
- `receipt-recognition/`：小票识别组件目录，负责识别结果确认与修正交互。
- `scheduled/`：计划任务组件目录，承载计划项配置与展示。
- `settings/`：设置组件目录，承载偏好配置与系统设置入口。
- `sortable/`：拖拽排序组件目录，封装排序交互与重排逻辑。
- `stat/`：统计组件目录，封装统计卡片、趋势图和统计明细相关 UI 能力。
- `ui/`：基础 UI 组件目录，提供通用原子组件与基础交互。

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
