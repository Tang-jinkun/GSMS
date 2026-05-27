# 阶段性验收报告：Raster Metadata、Sample Import 与 Job Output Raster Preview

## 1. 验收日期

2026-05-27

## 2. 验收分支

当前验收分支：

```text
feature/job-output-raster-preview
```

对比基线：

```text
main
```

本次验收按完整分支差异检查，不只检查当前工作区未提交内容。分支相对 `main` 包含以下已提交能力：

- GeoTIFF metadata 读取增强。
- GeoTIFF preview PNG endpoint。
- MapLibre raster image source 预览。
- sample Carbon data import。
- Windows 下 Next 构建目录与清理脚本稳定化。
- Agent 开发准则文档。

当前工作区另包含 job output raster preview 增量，并已在本次验收中一并检查。

## 3. 分支主要变化

### 3.1 后端

- 新增资产 preview 缓存目录：

```text
backend/data/projects/default/assets_previews/
```

- GeoTIFF metadata 增加：
  - native `bounds`
  - `bounds_wgs84`
  - CRS
  - width / height
  - band count
  - nodata / dtype

- 新增资产 raster preview API：

```http
GET  /api/assets/{asset_id}/preview.png
HEAD /api/assets/{asset_id}/preview.png
```

- 新增 sample Carbon data import API：

```http
POST /api/sample-data/carbon/import
```

- job output 增强：
  - GeoTIFF output 返回 `preview_url`。
  - GeoTIFF output 返回 `bounds_wgs84`。
  - 新增 job output raster preview API：

```http
GET  /api/jobs/{job_id}/outputs/{filename}/preview.png
HEAD /api/jobs/{job_id}/outputs/{filename}/preview.png
```

- Carbon stub runner 在 baseline 输入为 GeoTIFF 时，会复制一份 raster output：

```text
carbon_output_{results_suffix}.tif
```

### 3.2 前端

- `FileAsset` / `JobOutput` 支持：
  - `previewUrl`
  - `boundsWgs84`

- `MapLayer` 支持：
  - `rasterUrl`

- MapLibre raster preview 改为 image source：

```text
preview PNG + WGS84 bounds -> MapLibre image source
```

- 右侧模型面板新增：
  - Import sample Carbon data
  - raster output Add to map

- 图层 bounds 优先使用 `boundsWgs84`，保证非 EPSG:4326 GeoTIFF 可以正确定位到地图。

### 3.3 工程稳定性

- 新增 `frontend/next.config.js`，将 Next 构建目录改为：

```text
.next-build
```

- 新增：

```text
npm run clean
```

用于清理 `.next`、`.next-build` 和缓存目录，降低 Windows 文件锁问题。

## 4. 本次发现并修复的问题

### 4.1 默认 API 端口不一致

问题：

分支中前端默认 API 地址被改为：

```text
http://localhost:8001
```

但项目文档、后端启动命令和既有开发约定均使用：

```text
http://localhost:8000
```

影响：

在不设置 `NEXT_PUBLIC_API_URL` 的默认开发环境中，前端会请求错误端口，导致 model schema、sample import、assets/jobs 等联动失败。

修复：

已将以下位置恢复为 `http://localhost:8000`：

- `frontend/src/stores/useStores.tsx`
- `frontend/src/components/RightPanel.tsx`

## 5. 验收验证

### 5.1 静态与构建验证

已通过：

```powershell
cd backend
python -m py_compile app\main.py run_job.py invest_models\carbon.py
```

已通过：

```powershell
cd frontend
npx tsc --noEmit
```

已通过：

```powershell
cd frontend
npm run clean
npm run build
```

说明：

首次构建时遇到 Windows 下 `.next-build/trace` 文件锁。停止旧 node 进程后，使用分支新增的 `npm run clean` 再构建，通过。

### 5.2 后端 API 验证

已验证：

- `GET /health`
- `POST /api/sample-data/carbon/import`
- `GET /api/assets`
- `GET /api/assets/{asset_id}/metadata`
- `GET /api/assets/{asset_id}/preview.png`
- `POST /api/jobs`
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/outputs`
- `GET /api/jobs/{job_id}/outputs/{filename}/preview.png`

验证结果摘要：

```json
{
  "metadataCrs": "EPSG:26910",
  "hasBoundsWgs84": true,
  "assetPreviewStatus": 200,
  "jobStatus": "succeeded",
  "outputCount": 3,
  "rasterOutput": "carbon_output_validation.tif",
  "outputPreviewStatus": 200
}
```

### 5.3 浏览器端到端验证

已使用 Playwright 验证以下路径：

```text
打开 /workbench
-> Import sample Carbon data
-> Run Carbon
-> job succeeded
-> Outputs 出现 carbon_output_mvp.tif
-> Add output raster to map
-> MapLibre 请求 job output preview.png
-> 地图 active layers 增加
```

关键验证结果：

```json
{
  "matchedPreview": "/api/jobs/{job_id}/outputs/carbon_output_mvp.tif/preview.png",
  "assetPreviewStatus": 200,
  "outputPreviewStatus": 200,
  "activeText": "2 active layers"
}
```

浏览器 console 仅出现 headless Chromium WebGL 软件渲染和 `ReadPixels` 性能警告，未发现应用级错误。

## 6. 验收结论

本阶段功能验收通过。

分支相对 `main` 的新增能力已形成可演示闭环：

```text
导入 Carbon 样例数据
-> 识别 GeoTIFF metadata 和 WGS84 bounds
-> 生成 raster preview PNG
-> 将 raster asset 加入地图
-> 运行 Carbon stub
-> 生成 raster job output
-> 输出 raster preview
-> 将 raster output 加入地图
```

## 7. 剩余风险与后续建议

- 当前 raster preview 是单张 PNG + image source，不是真正 XYZ tile 服务；适合 MVP 预览，不适合大规模栅格浏览。
- Carbon 仍是 stub runner，尚未调用真实 `natcap.invest.carbon.carbon.execute(args)`。
- sample data import 会在重名时生成 UUID 文件名，连续导入会产生多份样例数据；后续可增加“已存在则复用”或“清理 sample assets”逻辑。
- Windows 构建仍可能受旧 node 进程文件锁影响；新增 clean 脚本可以缓解，但不能替代关闭旧 dev server。
- `backend/data/` 和 `sample_data/carbon` 下真实数据不进入 Git，其他环境验收前需要自行准备样例文件。

## 8. 推荐下一步

下一阶段建议进入真实 InVEST Carbon 接入：

```text
asset id -> real file path
-> validate Carbon inputs
-> build natcap.invest args
-> run carbon.execute(args)
-> scan real InVEST outputs
-> register raster outputs
-> preview outputs on map
```
