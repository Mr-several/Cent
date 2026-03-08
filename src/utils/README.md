# utils

## 目录职责
- 工具目录，沉淀跨模块复用的纯函数与运行时工具。
- 多模块会复用本目录工具函数，需保持接口稳定。
- 路径：`src/utils/`

## 文件说明
- `api-key.ts`：api key 逻辑文件，封装该模块通用处理逻辑。
- `async.ts`：async 逻辑文件，封装该模块通用处理逻辑。
- `cache.ts`：cache 逻辑文件，封装该模块通用处理逻辑。
- `charts.ts`：图表文件，负责统计数据可视化渲染。
- `clipboard.ts`：clipboard 逻辑文件，封装该模块通用处理逻辑。
- `color.ts`：color 逻辑文件，封装该模块通用处理逻辑。
- `constant.ts`：constant 逻辑文件，封装该模块通用处理逻辑。
- `download.ts`：download 逻辑文件，封装该模块通用处理逻辑。
- `encrypt.ts`：encrypt 逻辑文件，封装该模块通用处理逻辑。
- `fast-entry.ts`：fast entry 逻辑文件，封装该模块通用处理逻辑。
- `fetch-proxy.ts`：fetch proxy 逻辑文件，封装该模块通用处理逻辑。
- `file.ts`：file 逻辑文件，封装该模块通用处理逻辑。
- `filter.ts`：filter 逻辑文件，封装该模块通用处理逻辑。
- `index.ts`：模块入口文件，负责对外导出公共能力。
- `launch-queue.ts`：launch queue 逻辑文件，封装该模块通用处理逻辑。
- `lazy.ts`：lazy 逻辑文件，封装该模块通用处理逻辑。
- `number.ts`：number 逻辑文件，封装该模块通用处理逻辑。
- `predict.ts`：预测文件，提供预测算法或推断逻辑实现。
- `preset.ts`：preset 逻辑文件，封装该模块通用处理逻辑。
- `relayr-middleware.ts`：relayr middleware 逻辑文件，封装该模块通用处理逻辑。
- `shim.ts`：shim 逻辑文件，封装该模块通用处理逻辑。
- `time.ts`：time 逻辑文件，封装该模块通用处理逻辑。
- `word.ts`：word 逻辑文件，封装该模块通用处理逻辑。

## 子目录说明
- （暂无一级子目录）

## 维护约束
- 保持文档紧凑：优先写职责、调用关系和边界，不贴实现细节。
- 新增、删除、重命名文件或目录后，必须同步更新本 README。
- 接口、依赖、数据流变化时，补充影响面说明并更新上层目录 README。
