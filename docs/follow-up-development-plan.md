# InVEST WebGIS Workbench 后续开发计划

## 1. 当前基线

截至当前提交，系统已经具备可演示的 MVP 骨架：

- 前端三栏 workbench：左侧 Files/Layers，中间 MapLibre 地图，右侧 Carbon 模型运行、日志与输出。
- 后端 FastAPI 桩：资产上传、资产 metadata、GeoJSON 读取、job 创建、日志读取、输出下载。
- Carbon runner stub：可以创建任务、写入日志、生成 `dummy_output.txt` 和 `carbon_preview.geojson`。
- 前端基础闭环：加载样例数据、添加图层、运行 Carbon stub、轮询日志、将 GeoJSON 输出加入地图。

后续开发目标是把当前“可演示骨架”逐步升级为“真实 WebGIS + 真实 InVEST Carbon 运行闭环”。

## 2. Phase 1：资产与图层能力补强

### 开发内容

- 完善资产 metadata 识别：
  - GeoTIFF：CRS、bounds、width、height、band count、nodata、dtype。
  - GeoJSON：feature count、bounds、CRS 默认值。
  - CSV：columns、row count、sample rows。
- 左侧 Files 支持更清晰的 metadata 展示。
- 左侧 Layers 支持：
  - zoom to layer。
  - opacity。
  - visible / hidden。
  - remove from map。
- 为真实上传的 GeoJSON 建立稳定地图渲染链路。

### 验收标准

- 上传 `.geojson` 后，文件出现在 Files 列表。
- 点击 metadata 可看到 feature count 和 bounds。
- 点击 Add to map 后，GeoJSON 在地图上真实渲染。
- 点击 Zoom to layer 后，地图定位到该图层范围。
- 图层显隐、透明度、删除操作均能即时反映到地图。

## 3. Phase 2：Raster 预览与 tile 服务

### 开发内容

- 后端实现 GeoTIFF 预览能力。
- 推荐路线：
  - 初期：后端读取 GeoTIFF 并生成 PNG preview / 简化 tile。
  - 稳定后：引入 COG + TiTiler 或等价 tile endpoint。
- 前端 MapLibre 接入真实 raster tile source。
- 支持 raster 的 min/max、nodata、opacity 基础样式。

### 验收标准

- 上传 `.tif` / `.tiff` 后，metadata 中能看到 CRS、bounds、width、height。
- 点击 Add to map 后，不再显示占位 OSM tile，而是显示真实 raster 预览。
- raster 图层透明度可调。
- raster 图层可以 zoom to layer。
- 大于普通浏览器可直接加载能力的 GeoTIFF 不会被前端整文件读取。

## 4. Phase 3：Job 与输出资产注册

### 开发内容

- 建立 job 输出索引：
  - `outputs_index.json` 或 SQLite 表。
  - 记录 output name、type、path、size、bounds、download URL、map eligibility。
- job 成功后自动扫描 workspace。
- 输出文件注册为 FileAsset。
- 输出列表支持：
  - 下载单个文件。
  - 打开 HTML/text 报告。
  - 添加可地图化输出到地图。
  - 下载整个 job workspace。
- 左侧 Files 增加 outputs 分组或 job output section。

### 验收标准

- 运行 Carbon stub 后，右侧 Outputs 自动展示所有输出。
- `carbon_preview.geojson` 可一键加入地图。
- `dummy_output.txt` 可下载。
- 同一模型连续运行多次，输出图层不会 ID 冲突。
- 刷新页面后，最近 job 输出仍可通过后端索引恢复。

## 5. Phase 4：真实 InVEST Carbon 接入

### 开发内容

- 安装并验证 `natcap.invest` 后端环境。
- 将 Carbon stub 替换为真实调用：
  - `natcap.invest.carbon.carbon.execute(args)`。
- 将前端输入绑定转换为真实文件路径：
  - `lulc_bas_asset_id` -> `lulc_bas_path`
  - `carbon_pools_asset_id` -> `carbon_pools_path`
  - `results_suffix`
  - `calc_sequestration`
  - 后续支持 `lulc_alt_path`
- 增加运行前校验：
  - 必填输入是否存在。
  - 文件类型是否匹配。
  - CSV 是否包含 Carbon 模型需要的列。
  - raster 是否可读。
- 运行日志捕获 InVEST 输出。

### 验收标准

- 使用官方或自备 Carbon sample data 可以真实完成模型运行。
- job log 中能看到真实 InVEST 执行过程。
- workspace 中生成 InVEST Carbon 输出文件。
- 主要输出 raster 被识别并进入 Outputs。
- 失败输入会在运行前或运行中给出明确错误日志，而不是静默失败。

## 6. Phase 5：真实输出地图化

### 开发内容

- Carbon 输出 raster 自动注册为地图图层。
- 对输出 GeoTIFF 走 Phase 2 的 tile endpoint。
- 输出图层命名带 job id / suffix，避免多次运行混淆。
- 支持输出图层与输入 LULC 图层的透明度对比。
- 支持点击查询：
  - raster pixel value。
  - vector feature properties。

### 验收标准

- Carbon 运行成功后，主要 raster 输出自动出现在地图和 Layers 列表。
- 用户可以调节输出图层透明度并与输入图层对比。
- 点击输出 raster 可看到当前像元值。
- 点击 vector output 可看到属性表字段。

## 7. Phase 6：前端 UI 产品化

### 开发内容

- 扩展 shadcn 风格组件：
  - Select。
  - Dialog。
  - Tabs。
  - Tooltip。
  - Badge。
  - ScrollArea。
  - Form field。
- 优化左侧文件管理：
  - inputs / outputs / sample data 分组。
  - asset action menu。
  - metadata drawer。
- 优化右侧模型面板：
  - model schema 驱动表单。
  - required / optional 分区。
  - disabled / loading / error 状态。
- 优化日志体验：
  - auto-scroll。
  - error highlight。
  - copy logs。
- 响应式布局继续打磨。

### 验收标准

- 页面在 1440x900、1366x768、390x844 下无明显遮挡或文本溢出。
- 所有主要按钮都有可理解的 icon、label 或 aria-label。
- 长文件名不会破坏布局。
- 后端不可用时，页面能显示明确错误，而不是空白或崩溃。

## 8. Phase 7：持久化与项目结构

### 开发内容

- 引入 SQLite 存储：
  - projects。
  - assets。
  - map layers。
  - jobs。
  - job outputs。
- 保留默认单项目，但数据结构支持后续多项目。
- 启动时从 SQLite 恢复资产和 job 历史。
- 为本地数据目录建立迁移/初始化逻辑。

### 验收标准

- 重启后端后，已上传资产仍能显示在前端。
- 已完成 job 的 outputs 仍可查看和下载。
- map layer 状态可以恢复，或至少 assets 可以重新 add to map。
- 本地数据库不存在时，后端能自动初始化。

## 9. Phase 8：输入检查与分析辅助

### 开发内容

- Carbon 输入检查：
  - LULC raster code 是否能与 carbon pools CSV 的 `lucode` 对齐。
  - carbon pools CSV 必填列检查。
  - raster CRS / bounds / nodata 检查。
- 提供“检查输入”按钮。
- 在运行前展示 warning / error。
- 为后续 agent/skills 预留解释接口。

### 验收标准

- CSV 缺列时，前端显示明确错误并禁止运行。
- raster 无法读取时，前端显示明确错误。
- LULC code 与 CSV code 不匹配时，给出 warning。
- 检查结果可以被右侧模型面板展示。

## 10. 推荐近期迭代顺序

建议接下来按以下顺序推进：

1. 完成真实 GeoTIFF metadata 与 raster preview。
2. 完成 job output index 与输出恢复。
3. 接入真实 InVEST Carbon。
4. 将真实 Carbon raster 输出地图化。
5. 引入 SQLite 做持久化。
6. 做输入检查与更完整的模型 schema 驱动表单。

## 11. 下一次开发的最小目标

下一轮建议聚焦：

```text
上传 GeoTIFF
-> 后端读取真实 metadata
-> 前端显示 bounds/CRS/尺寸
-> Add to map 显示真实 raster preview
-> Zoom to layer 可用
```

这一步是从“前端/后端联动桩”走向“真正 WebGIS Workbench”的关键技术门槛。
