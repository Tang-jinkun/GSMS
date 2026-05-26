# InVEST WebGIS Workbench MVP 骨架阶段工作总结

## 1. 阶段目标

本阶段目标是按开发计划先完成 MVP 骨架：

- 搭建前端三栏 WebGIS Workbench 静态壳子。
- 完成基础前端/后端联动桩。
- 建立后端 FastAPI、asset upload、job runner stub 和日志读取能力。
- 将界面从普通表单样式调整为更接近 GIS 分析工作台的产品形态。

## 2. 已完成内容

### 2.1 前端 Workbench 骨架

已完成固定三栏结构：

```text
顶部：项目与运行状态
左侧：Files / Layers
中间：MapLibre 地图画布
右侧：Carbon 模型运行、job 状态、日志
```

主要文件：

- `frontend/pages/workbench.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/LeftPanel.tsx`
- `frontend/src/components/MapCanvas.tsx`
- `frontend/src/components/RightPanel.tsx`
- `frontend/src/stores/useStores.tsx`

### 2.2 UI 方向优化

已将页面从早期简单面板改为更接近 shadcn 风格的工作台界面：

- 顶部状态栏展示 asset、layer、job 状态。
- 左侧采用 Files / Layers 分段切换。
- 文件资产以紧凑列表展示，带类型、大小和 Add to map 操作。
- 图层列表支持显隐、删除、透明度调整。
- 地图区增加浮动状态条、缩放控件、坐标/zoom/layer 状态。
- 右侧模型面板采用表单分组、状态 badge、日志控制台。
- 引入 `lucide-react` 图标，提升工具界面识别度。

### 2.3 前端状态与 API 联动

已实现基础 store：

- assets
- layers
- active job
- logs

已接入 API：

- `GET /api/assets`
- `POST /api/assets/upload`
- `POST /api/jobs`
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/logs`

当前行为：

- 页面加载时请求后端资产列表。
- 后端为空时显示本地 sample rows。
- 上传文件后更新前端资产列表。
- 点击 Add to map 后生成 MapLayer。
- 点击 Run Carbon 后创建后端 job。
- 前端轮询 job status 和 logs。
- job runner 完成后 UI 显示 `succeeded`。

### 2.4 MapLibre 地图

已完成：

- MapLibre 初始化。
- OSM raster basemap。
- 地图缩放控件。
- scale bar。
- 鼠标坐标显示。
- zoom 显示。
- store-driven layer sync。
- layer 显隐、透明度、移除。

已修复：

- MapLibre 容器高度塌陷导致 canvas 只有默认 300px 的问题。
- 远程 demo style 加载不稳定导致首屏地图空白的问题，改为内置 OSM raster style。

### 2.5 后端骨架

已完成：

- FastAPI app。
- CORS 配置。
- asset 上传。
- asset 类型推断。
- job 创建。
- job 状态查询。
- job 日志读取。
- subprocess 启动 job runner。

主要文件：

- `backend/app/main.py`
- `backend/run_job.py`
- `backend/invest_models/carbon.py`
- `backend/requirements.txt`

### 2.6 Job Runner Stub

已完成：

- 每次创建 job 后生成独立 job directory。
- 写入 `job.json`。
- 写入 `run.log`。
- 独立 runner 模拟 5 步执行。
- 生成 `outputs/dummy_output.txt`。
- 前端可轮询看到完整日志。

## 3. 已修复的问题

| 问题 | 处理结果 |
| --- | --- |
| 页面中文乱码 | 删除乱码内容，重写 workbench 页面 |
| `Layout` 中无效 Tailwind grid-area 写法 | 改为明确 grid columns + flex height 结构 |
| MapLibre canvas 高度只有 300px | 改为 `h-full w-full` 容器并补 resize |
| 远程 demo style 不稳定 | 改为内置 OSM raster style |
| 后端 CORS 阻断前端请求 | 加入 localhost 3000/3001/3002 白名单 |
| `/api/jobs` 只创建目录、不启动 runner | 创建 job 后启动 `run_job.py` subprocess |
| `run_job.py` job 路径与 API 路径不一致 | 统一到 `backend/data/projects/default/jobs` |
| FastAPI 上传依赖缺失 | 确认 `python-multipart` 并安装到当前环境 |
| Next dev 缓存污染导致 500 | 清理 `.next` 后重新启动 |

## 4. 验证结果

已执行：

- `npx tsc --noEmit`
- `npm run build`
- Playwright 页面截图验证
- Playwright 交互验证

验证通过的用户路径：

```text
打开 /workbench
→ 地图加载
→ 点击 lulc_bas.tif Add to map
→ 切换 Layers
→ 图层列表出现 raster layer
→ 点击 Run Carbon
→ 后端创建 job
→ 日志轮询更新
→ job 状态变为 succeeded
```

## 5. 当前限制

- Raster layer 仍是预览桩，暂时使用 OSM tile 占位，不是真实 GeoTIFF tile。
- Vector layer 仍使用 demo GeoJSON polygon，占位展示入图流程。
- 后端 asset metadata 只做基础类型推断，尚未读取 CRS、bounds、width、height。
- Carbon 仍是 stub，尚未真实调用 `natcap.invest.carbon.carbon.execute(args)`。
- 输出文件已生成，但尚未完整回流到 UI 和下载入口。
- 未接入 SQLite，metadata 当前来自文件系统扫描。

## 6. 下一阶段开发重点

优先级建议：

1. Job outputs API 与前端输出列表。
2. 输出文件下载。
3. job 完成后自动刷新 outputs。
4. 后端 asset metadata 识别。
5. 真实 raster/vector preview endpoint。
6. 再接入真实 InVEST Carbon。

下一步继续开发的目标：

```text
Run Carbon
→ job succeeded
→ 右侧 Outputs 显示 dummy_output.txt
→ 用户可下载输出文件
```

