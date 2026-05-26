# InVEST WebGIS Workbench 原型系统分阶段开发计划

## 1. 项目定位

本原型系统定位为一个轻量级 WebGIS Workbench，用于管理地理数据图层、在地图中查看输入与输出，并在侧边栏中真实运行 InVEST 模型。

第一版不做完整项目管理、用户权限、多租户、复杂制图和 agent 自动决策，而是优先完成一条可信的 GIS 分析闭环：

```text
上传/选择空间数据
→ 在地图中查看输入图层
→ 选择 InVEST Carbon 模型
→ 从已有文件资产绑定模型参数
→ 后端真实运行 InVEST
→ 前端实时查看日志
→ 输出自动注册为文件资产和地图图层
→ 用户查看、叠加、下载结果
```

核心界面采用三栏 workbench：

```text
左侧：文件 / 图层管理
中间：地图视图
右侧：模型运行 / 任务状态 / 日志
```

## 2. 技术范围

### 2.1 前端建议

- Next.js
- TypeScript
- MapLibre GL JS
- Zustand 或 Jotai
- shadcn/ui
- react-hook-form
- zod

### 2.2 后端建议

- Python
- FastAPI
- natcap.invest
- rasterio
- geopandas
- rio-cogeo 或 TiTiler，按阶段引入
- SQLite
- 本地文件系统

### 2.3 第一版真实支持能力

- GeoTIFF 上传、metadata 识别、地图预览
- GeoJSON 上传、地图预览
- Shapefile zip 上传、转 GeoJSON 后预览
- CSV 上传、作为模型输入表
- Carbon Storage and Sequestration 模型真实运行
- 模型日志展示
- 模型输出注册、入库、入图层、可下载

## 3. 总体验收目标

MVP 完成时，应能演示以下用户路径：

1. 用户打开 WebGIS Workbench。
2. 用户加载示例 Carbon 数据或上传自己的 LULC raster 与 carbon pools CSV。
3. 左侧文件列表显示输入文件及 metadata。
4. 用户将 LULC raster 添加到地图。
5. 地图中显示 LULC 图层，支持显隐、透明度、缩放到图层。
6. 用户在右侧选择 Carbon Storage 模型。
7. 用户从已有资产中绑定 baseline LULC raster 与 carbon pools CSV。
8. 用户点击 Run。
9. 后端创建 job 并真实调用 `natcap.invest.carbon.carbon.execute(args)`。
10. 右侧日志持续展示任务状态。
11. 任务成功后，输出文件自动出现在左侧 outputs 中。
12. 主要输出 raster 自动加入地图。
13. 用户可调整输出图层透明度，对比输入与输出。
14. 用户可下载输出文件或整个 job workspace。

## 4. 阶段 0：需求冻结与原型边界确认

### 4.1 目标

明确第一版必须交付什么、不交付什么，避免把原型扩展成完整平台。

### 4.2 开发内容

- 确认系统名称：InVEST WebGIS Workbench。
- 确认第一版只支持单默认 project。
- 确认第一版只真实运行 Carbon 模型。
- 确认文件资产、地图图层、模型任务三个核心对象。
- 确认本地文件系统作为数据存储。
- 确认 SQLite 作为 metadata 存储。
- 确认第一版不做用户系统、权限系统、云存储和 agent。

### 4.3 产出物

- MVP 范围说明。
- 数据对象草案。
- API 草案。
- Demo 用户路径。

### 4.4 验收标准

- 有一份明确的 MVP scope 文档。
- 明确列出必须做和暂不做的功能。
- 团队能用 5 分钟讲清楚 demo 路径。
- 所有后续开发任务都能映射到文件资产、地图图层、模型任务三类对象之一。

## 5. 阶段 1：Workbench 静态壳子与前端基础状态

### 5.1 目标

先把产品形态做出来，让系统从第一天开始就是 WebGIS workbench，而不是普通模型表单。

### 5.2 开发内容

- 搭建 Next.js + TypeScript 前端项目。
- 集成 shadcn/ui 基础组件。
- 实现固定三栏布局：
  - 顶部 Top Bar
  - 左侧 Left Panel
  - 中间 Map Canvas
  - 右侧 Right Panel
- 左侧实现 Files / Layers tabs。
- 右侧实现 Models / Run / Logs 区域。
- 建立前端状态 store：
  - `useAssetsStore`
  - `useLayersStore`
  - `useJobsStore`
  - `useMapStore`
- 使用 mock 数据展示文件列表、图层列表、模型列表和日志。

### 5.3 产出物

- 可运行的前端 workbench 页面。
- 静态文件树。
- 静态图层列表。
- 静态模型表单。
- 静态日志面板。

### 5.4 验收标准

- 打开页面后可看到三栏 workbench 布局。
- 左侧可以在 Files 和 Layers 之间切换。
- 中间地图区域占据主要空间，不被侧边栏遮挡。
- 右侧可以看到 Carbon 模型入口、Run 按钮和日志区域。
- 页面在 1366x768 和 1920x1080 下无明显遮挡、溢出和错位。
- 所有 mock 数据都来自前端 store，而不是散落在组件内部。

## 6. 阶段 2：地图基础能力与示例图层

### 6.1 目标

让中间地图区域具备基本 WebGIS 体验，在还没有上传和后端 tile 服务前，先完成图层显示与交互形态。

### 6.2 开发内容

- 集成 MapLibre GL JS。
- 配置默认底图。
- 实现地图初始化、缩放、拖拽。
- 加载一个示例 GeoJSON 图层。
- 加载一个示例 raster tile 图层。
- 实现图层显隐控制。
- 实现图层透明度控制。
- 实现 zoom to layer。
- 显示鼠标坐标。
- 显示比例尺。

### 6.3 产出物

- `MapCanvas` 组件。
- `LayerRenderer` 组件。
- `MapControls` 组件。
- 示例 GeoJSON 和 raster tile 配置。
- 图层列表与地图渲染联动。

### 6.4 验收标准

- 地图可以正常加载底图。
- 示例 GeoJSON 能在地图中显示。
- 示例 raster tile 能在地图中显示。
- 在左侧关闭图层后，地图中对应图层消失。
- 调整 opacity slider 后，地图图层透明度即时变化。
- 点击 zoom to layer 后，地图视野移动到图层范围。
- 鼠标移动时能看到经纬度坐标。
- 浏览器控制台无关键运行错误。

## 7. 阶段 3：后端基础工程与文件资产管理

### 7.1 目标

建立后端工程骨架，实现文件上传、资产注册和 metadata 识别，为地图和模型输入绑定提供基础。

### 7.2 开发内容

- 搭建 FastAPI 后端项目。
- 建立本地数据目录结构：

```text
backend/data/projects/default/
├── inputs/
├── outputs/
├── jobs/
└── assets/
```

- 建立 SQLite metadata 数据库。
- 实现资产数据模型：
  - id
  - name
  - path
  - type
  - format
  - size
  - crs
  - bounds
  - width
  - height
  - createdAt
- 实现上传 API：
  - `POST /api/assets/upload`
  - `GET /api/assets`
  - `GET /api/assets/{asset_id}`
  - `DELETE /api/assets/{asset_id}`
  - `GET /api/assets/{asset_id}/metadata`
- 使用 rasterio 识别 GeoTIFF metadata。
- 使用 geopandas 识别 GeoJSON 和 shapefile zip metadata。
- 识别 CSV 基础信息。
- 前端接入资产列表 API。
- 前端实现上传文件、查看 metadata、删除文件。

### 7.3 产出物

- FastAPI 后端服务。
- SQLite asset metadata 表。
- 文件上传能力。
- 文件 metadata 识别能力。
- 前端文件列表接入真实后端。

### 7.4 验收标准

- 可上传 `.tif` / `.tiff` 文件。
- 可上传 `.geojson` 文件。
- 可上传 `.zip` shapefile 文件。
- 可上传 `.csv` 文件。
- 上传后文件保存到默认 project 目录。
- 上传后数据库中生成 FileAsset 记录。
- GeoTIFF asset 能显示 CRS、bounds、width、height、nodata 或 band 基础信息。
- GeoJSON 或 shapefile asset 能显示 CRS、bounds、feature count。
- CSV asset 能显示文件大小和列名预览。
- 前端刷新后仍能从后端加载已上传资产。
- 删除 asset 后，前端列表和后端 metadata 同步更新。

## 8. 阶段 4：Vector 图层入图与 Shapefile 预览

### 8.1 目标

完成矢量数据从文件资产到地图图层的闭环。

### 8.2 开发内容

- 后端实现 GeoJSON 读取 endpoint：
  - `GET /api/assets/{asset_id}/geojson`
- Shapefile zip 上传后，后端解压到安全目录。
- 使用 geopandas 读取 shapefile。
- 将矢量数据重投影为 EPSG:4326。
- 转换为 GeoJSON 返回给前端。
- 前端实现“添加到地图”。
- 创建 MapLayer 记录。
- MapLibre 添加 geojson source 和 vector layer。
- 支持矢量样式：
  - fill color
  - stroke color
  - opacity
- 支持 remove from map。

### 8.3 产出物

- 矢量 asset 到地图 layer 的完整流程。
- 矢量图层样式控制。
- 矢量图层 zoom to layer。

### 8.4 验收标准

- GeoJSON asset 可以添加到地图。
- Shapefile zip asset 可以添加到地图。
- 添加到地图后 Layers tab 中出现对应图层。
- 图层显隐、透明度、缩放到图层、移除均可用。
- 后端返回的 GeoJSON 坐标为 EPSG:4326。
- 对缺少 `.shp`、`.dbf` 或 `.shx` 的 shapefile zip，后端返回可读错误。
- 大于约定大小的矢量文件有明确限制或提示，不能导致前端卡死无响应。

## 9. 阶段 5：Raster tile endpoint 与 GeoTIFF 地图预览

### 9.1 目标

完成栅格数据从 GeoTIFF asset 到 MapLibre raster layer 的显示链路，这是 WebGIS workbench 的关键技术阶段。

### 9.2 开发内容

- 设计 raster 预览策略。
- 第一版可选择两种实现路径之一：
  - 简化自研 tile endpoint。
  - 接入 TiTiler 读取 COG。
- 上传 GeoTIFF 后可选转换为 COG。
- 实现 tile endpoint：
  - `GET /api/tiles/{asset_id}/{z}/{x}/{y}.png`
- 实现 raster metadata endpoint：
  - bounds
  - CRS
  - min/max
  - nodata
  - band count
- 前端将 raster asset 添加为 MapLibre raster source。
- 支持 raster opacity。
- 支持默认 color ramp。
- 支持 min/max 拉伸配置，第一版可只做固定默认值。

### 9.3 产出物

- GeoTIFF 栅格地图预览能力。
- Raster tile API。
- Raster layer 添加、显隐、透明度、zoom to layer。

### 9.4 验收标准

- 上传的 GeoTIFF 可以添加到地图。
- 地图请求 tile endpoint 后能显示 raster 图层。
- 图层透明度调整生效。
- zoom to layer 能定位到 raster bounds。
- 对非 EPSG:3857 或非 EPSG:4326 的数据，有明确重投影或预处理策略。
- 对 nodata 区域有透明或可接受的显示效果。
- 中等大小示例 GeoTIFF 加载时页面不崩溃。
- tile endpoint 对不存在的 asset 返回 404。
- tile endpoint 对非 raster asset 返回 400。

## 10. 阶段 6：模型注册表与 Carbon 参数表单

### 10.1 目标

把右侧模型面板从静态 UI 变成由后端 schema 驱动的模型运行入口，并先支持 Carbon 模型的参数绑定。

### 10.2 开发内容

- 后端实现模型注册表：
  - model id
  - model name
  - description
  - input schema
  - output hints
- 实现 API：
  - `GET /api/models`
  - `GET /api/models/{model_id}/schema`
- 注册 Carbon Storage and Sequestration 模型。
- 定义 Carbon schema：
  - `lulc_bas_path`
  - `carbon_pools_path`
  - `calc_sequestration`
  - `lulc_alt_path`
  - `results_suffix`
  - `n_workers`
- 前端模型选择器接入 API。
- 前端 Carbon 表单根据 schema 渲染。
- 输入控件从已有 FileAsset 中选择：
  - raster 参数只能选择 raster asset
  - CSV 参数只能选择 table asset
- 使用 zod 或后端 schema 做前端校验。

### 10.3 产出物

- 后端模型注册表。
- Carbon 模型 schema。
- 前端模型选择器。
- 前端 Carbon 参数绑定表单。

### 10.4 验收标准

- 前端可以从后端加载模型列表。
- 选择 Carbon 模型后显示正确参数表单。
- Baseline LULC 下拉框只显示 raster asset。
- Carbon pools 下拉框只显示 CSV asset。
- 勾选 calculate sequestration 后才要求 alternate LULC。
- 未选择必填输入时，Run 按钮不可提交或提交时显示明确错误。
- 表单提交 payload 中传递的是 asset id，而不是前端本地文件路径。

## 11. 阶段 7：Job Runner 与日志系统

### 11.1 目标

建立模型任务运行机制，让 InVEST 任务脱离 FastAPI 主请求执行，并能向前端提供稳定的状态与日志。

### 11.2 开发内容

- 设计 job 数据模型：
  - id
  - modelId
  - status
  - inputs
  - workspaceDir
  - logsUrl
  - outputs
  - createdAt
  - completedAt
- 实现 API：
  - `POST /api/jobs`
  - `GET /api/jobs/{job_id}`
  - `GET /api/jobs/{job_id}/logs`
  - `GET /api/jobs/{job_id}/outputs`
- `POST /api/jobs` 创建 job folder：

```text
backend/data/projects/default/jobs/{job_id}/
├── job.json
├── run.log
├── workspace/
└── outputs_index.json
```

- 使用 subprocess 启动独立 job runner：
  - `python run_job.py --job-id {job_id}`
- job runner 写入日志文件。
- 前端 Run 按钮创建 job。
- 前端轮询 job 状态。
- 前端轮询 logs 并显示在 LogConsole 中。
- 第二版再升级 WebSocket，第一版允许 polling。

### 11.3 产出物

- 可创建 job 的后端 API。
- 独立 job runner。
- job 状态查询。
- 日志查询。
- 前端任务状态和日志面板。

### 11.4 验收标准

- 点击 Run 后，后端生成唯一 job id。
- 每个 job 有独立目录。
- job 状态至少包括 pending、validating、running、succeeded、failed。
- 前端能显示当前 job 状态。
- 前端能看到 run.log 中新增日志。
- job 失败时状态变为 failed，并保留错误日志。
- FastAPI 主进程不会因为 InVEST 长任务阻塞。
- 刷新页面后仍可通过 job id 查询状态和日志。

## 12. 阶段 8：真实接入 InVEST Carbon

### 12.1 目标

完成第一条真实模型运行闭环，用 Carbon Storage and Sequestration 证明系统不是表单 demo，而是实际可运行的 InVEST WebGIS workbench。

### 12.2 开发内容

- 安装并验证 `natcap.invest`。
- 实现 `invest_models/carbon.py`。
- 将 asset id 转换为后端真实文件路径。
- 构造 Carbon args：

```python
args = {
    "workspace_dir": workspace_dir,
    "lulc_bas_path": lulc_bas_path,
    "carbon_pools_path": carbon_pools_path,
    "calc_sequestration": calc_sequestration,
    "results_suffix": results_suffix,
    "n_workers": -1,
}

if calc_sequestration:
    args["lulc_alt_path"] = lulc_alt_path
```

- 调用：

```python
natcap.invest.carbon.carbon.execute(args)
```

- 捕获 Python logging 输出并写入 run.log。
- 实现输入校验：
  - LULC asset 必须是 raster。
  - carbon pools asset 必须是 CSV。
  - calc_sequestration 为 true 时必须提供 alternate LULC。
  - 文件路径必须存在。
- 使用 InVEST 官方示例数据或准备本地 sample Carbon 数据。
- 前端提供“Use sample Carbon data”入口。

### 12.3 产出物

- Carbon 模型后端执行器。
- 可运行的 sample Carbon demo。
- Carbon job 的真实输出目录。
- Carbon 运行日志。

### 12.4 验收标准

- 使用 sample data 可以成功运行 Carbon 模型。
- 后端真实调用 `natcap.invest.carbon.carbon.execute(args)`。
- 成功运行后 workspace 中生成 Carbon 输出文件。
- 日志中能看到模型开始、执行中、完成或失败信息。
- 缺少 baseline LULC 时不能启动任务，并返回明确错误。
- 缺少 carbon pools CSV 时不能启动任务，并返回明确错误。
- 启用 sequestration 但缺少 alternate LULC 时不能启动任务，并返回明确错误。
- 模型异常不会导致后端服务崩溃。

## 13. 阶段 9：输出注册、自动入图与下载

### 13.1 目标

让模型输出回流到 workbench，形成“运行结果就是新的 GIS 数据资产”的闭环。

### 13.2 开发内容

- 实现 `output_indexer.py`。
- 扫描 job workspace。
- 识别输出文件类型：
  - GeoTIFF
  - CSV
  - HTML
  - TXT
- 将输出文件注册为 FileAsset。
- 对主要 GeoTIFF 输出生成 raster preview 能力。
- 自动创建 MapLayer。
- 将输出 asset 关联到 job。
- 前端 OutputList 展示输出。
- 前端任务成功后刷新 assets 和 layers。
- 主要 raster output 自动加入地图。
- 实现下载单个文件。
- 实现下载整个 job workspace zip。

### 13.3 产出物

- 输出扫描和注册模块。
- Job outputs API。
- 输出文件下载 API。
- 前端输出列表。
- 输出 raster 自动入图。

### 13.4 验收标准

- Carbon 运行成功后，outputs 中出现生成文件。
- 主要 GeoTIFF 输出被注册为 raster asset。
- 主要 GeoTIFF 输出自动出现在 Layers tab。
- 地图自动显示输出 raster。
- 用户可以隐藏、调整透明度、缩放到输出图层。
- 用户可以下载单个输出文件。
- 用户可以下载整个 job workspace zip。
- HTML report 可以打开或下载。
- 输出注册重复执行时不会生成重复 asset。

## 14. 阶段 10：前端体验打磨与错误处理

### 14.1 目标

让原型具备可演示、可试用、可排错的基本质量。

### 14.2 开发内容

- 增加全局 loading 和 error toast。
- 上传失败时显示原因。
- 模型校验失败时定位到具体字段。
- job 失败时保留日志和错误摘要。
- 文件 metadata 面板增加可读信息。
- 图层列表增加图例、类型标识、输出标识。
- Run 按钮增加运行中禁用状态。
- 日志面板自动滚动到底部。
- 输出完成后显示提示：

```text
Model completed. Outputs generated.
```

- 增加 empty state：
  - 没有文件
  - 没有图层
  - 没有运行任务
- 增加基础响应式约束，确保三栏在常见桌面尺寸可用。

### 14.3 产出物

- 可演示的完整前端交互。
- 统一错误提示。
- 更清晰的 metadata、图层、日志和输出展示。

### 14.4 验收标准

- 上传非法文件时，用户能看到明确错误。
- 运行非法参数时，用户能看到明确字段提示。
- job 运行中重复点击 Run 不会创建重复任务。
- 日志内容较多时可以滚动查看。
- job 失败后仍可查看日志。
- 左侧和右侧面板内容过多时有滚动区域，不挤压地图。
- 1366x768 下核心操作仍可完成。
- 浏览器控制台无关键错误。

## 15. 阶段 11：端到端验证与 Demo 数据包

### 15.1 目标

用固定 demo 数据验证完整路径，确保原型可以稳定展示。

### 15.2 开发内容

- 准备 sample Carbon 数据包。
- 增加一键加载示例数据功能。
- 编写端到端 demo 脚本。
- 编写手工验收清单。
- 增加基础自动化测试：
  - API smoke test
  - asset upload test
  - model schema test
  - job creation test
- 增加前端关键流程测试：
  - 打开 workbench
  - 加载示例数据
  - 添加图层
  - 运行 Carbon
  - 查看输出
- 编写本地启动说明。

### 15.3 产出物

- `sample_data/carbon/` 示例数据。
- Demo 操作脚本。
- 手工验收清单。
- 本地启动 README。
- 基础测试用例。

### 15.4 验收标准

- 新环境按 README 可以启动前后端。
- 一键加载示例数据成功。
- 按 demo 脚本操作可以完整跑通 Carbon。
- 从打开页面到看到输出图层，流程不需要手工改数据库或移动文件。
- API smoke test 通过。
- 前端关键流程测试通过，或有明确可复现的人工验收记录。
- Demo 失败时能通过 job 日志定位原因。

## 16. 阶段 12：可选增强，为下一轮迭代做准备

### 16.1 目标

在 MVP 成立后，补充更接近真实 WebGIS 分析平台的能力，但不阻塞第一版闭环。

### 16.2 可选开发内容

- WebSocket 实时日志，替代轮询。
- Raster 像元值查询。
- Vector 属性点击查询。
- 更完整的 raster color ramp。
- 栅格 min/max 动态统计。
- AOI 裁剪。
- 输入数据一致性检查。
- LULC 分类值与 carbon pools CSV lucode 匹配检查。
- Habitat Quality 模型注册与运行。
- Annual Water Yield 模型注册与运行。
- 多 project 管理。
- agent 辅助：
  - 推荐模型
  - 检查数据缺失
  - 自动绑定输入
  - 解释输出

### 16.3 验收标准

- 每个增强功能都有独立开关或独立任务，不破坏 MVP 主流程。
- Carbon demo 仍可稳定运行。
- 新模型接入复用模型注册表、job runner、output indexer，而不是另写一套流程。
- agent 只作为 workbench 辅助层，不绕过文件资产、图层和 job 机制。

## 17. 建议里程碑

### Milestone 1：可见的 Workbench

覆盖阶段：

- 阶段 1
- 阶段 2

验收结果：

- 用户能看到三栏 GIS workbench。
- 示例图层能在地图上显示。
- 左侧图层控制能影响地图。

### Milestone 2：真实数据进入地图

覆盖阶段：

- 阶段 3
- 阶段 4
- 阶段 5

验收结果：

- 用户能上传 GeoTIFF、GeoJSON、Shapefile zip、CSV。
- 空间数据能作为图层显示在地图上。
- 文件资产和地图图层概念打通。

### Milestone 3：真实模型能运行

覆盖阶段：

- 阶段 6
- 阶段 7
- 阶段 8

验收结果：

- 用户能从右侧选择 Carbon 模型。
- 用户能从已有资产绑定输入。
- 后端能创建 job 并真实运行 InVEST Carbon。
- 前端能查看日志和状态。

### Milestone 4：输出回流 WebGIS

覆盖阶段：

- 阶段 9
- 阶段 10

验收结果：

- Carbon 输出被注册为资产。
- 主要 raster 输出自动进入地图。
- 用户能查看、叠加、调整透明度和下载输出。

### Milestone 5：可演示 MVP

覆盖阶段：

- 阶段 11

验收结果：

- 使用示例数据可以稳定完成完整 demo。
- 有 README、demo 脚本和验收清单。
- 原型可以向他人演示而不依赖开发者手工干预。

## 18. MVP 完成定义

MVP 只有在以下条件全部满足时才算完成：

- 前端是三栏 WebGIS workbench，而不是普通表单页面。
- 文件资产可以上传、识别 metadata、展示在左侧。
- 空间文件可以添加为地图图层。
- 地图图层支持显隐、透明度、zoom to layer。
- Carbon 模型表单从已有资产绑定输入。
- 后端真实执行 InVEST Carbon。
- 前端能查看 job 状态和日志。
- 模型输出被注册为新的文件资产。
- 主要输出 raster 自动进入地图。
- 用户可以下载输出。
- 使用 sample data 可以稳定跑通完整流程。

## 19. 暂不纳入 MVP 的内容

- 用户注册与登录。
- 权限系统。
- 多租户。
- 云存储。
- 在线矢量编辑。
- 完整地图制图系统。
- 复杂 tile cache。
- 所有 InVEST 模型一次性支持。
- agent 自动运行模型。
- 复杂项目协作。
- 大规模生产部署。

## 20. 风险与控制措施

### 20.1 Raster tile 服务复杂度风险

风险：

GeoTIFF 在 Web 地图中稳定显示比普通文件预览复杂，涉及 CRS、重投影、nodata、tile 生成和性能。

控制措施：

- 优先使用 COG + TiTiler 或成熟 rasterio 方案。
- MVP 限制支持的数据大小和 CRS。
- 先保证 sample data 稳定展示，再逐步扩大兼容范围。

### 20.2 InVEST 环境安装风险

风险：

`natcap.invest` 依赖较多，跨平台安装可能遇到 GDAL、rasterio、geopandas 兼容问题。

控制措施：

- 固定 Python 版本。
- 固定依赖版本。
- 提供后端环境安装脚本。
- 优先在一个标准开发环境中跑通 demo。

### 20.3 长任务阻塞风险

风险：

InVEST 模型运行时间较长，如果直接在 FastAPI 请求中执行，会导致接口阻塞和服务不稳定。

控制措施：

- 从第一版 job runner 开始就使用 subprocess。
- 每个 job 独立目录。
- 日志落盘。
- job 状态可恢复查询。

### 20.4 MVP 范围膨胀风险

风险：

WebGIS、模型平台和 agent 都容易扩展，导致原型迟迟无法闭环。

控制措施：

- 第一版只做 Carbon。
- 第一版只做默认 project。
- 第一版只做文件上传、图层查看、模型运行、输出回流。
- agent 放到 MVP 之后。

## 21. 推荐开发顺序摘要

```text
1. Workbench 静态壳子
2. 地图显示示例图层
3. 后端文件上传与 metadata
4. Vector 图层入图
5. Raster tile endpoint
6. Carbon 模型 schema 与参数表单
7. Job runner 与日志
8. 真实运行 InVEST Carbon
9. 输出注册并自动入图
10. 前端体验打磨
11. 示例数据与端到端验收
```

## 22. 最小 Demo 脚本

```text
1. 启动后端 FastAPI。
2. 启动前端 Next.js。
3. 打开 /workbench。
4. 点击 Use sample Carbon data。
5. 左侧 Files 中出现 baseline LULC、carbon pools CSV。
6. 点击 baseline LULC 的 Add to map。
7. 地图显示 LULC raster。
8. 右侧选择 Carbon Storage and Sequestration。
9. 表单自动或手动绑定 baseline LULC 和 carbon pools CSV。
10. 点击 Run。
11. 观察 Logs 面板。
12. 等待 job succeeded。
13. 左侧 outputs 出现 Carbon 输出。
14. 地图自动显示 total carbon raster。
15. 调整输出图层透明度，对比输入与输出。
16. 下载 job workspace。
```

