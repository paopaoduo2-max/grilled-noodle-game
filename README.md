# v2 CLI 流水线

本仓库仅保留 v2 CLI 流水线与独立整理工具，不包含 Web UI。

## 运行入口
```
python main.py --config config.yaml
```

可选指定 AID：
```
python main.py --config config.yaml --aids 1001 1002
```

## 必要环境变量
- `ARK_API_KEY`: 豆包 Ark API Key
- `UNSPLASH_ACCESS_KEY`: 可选（启用 Unsplash 时）

## 输入与输出
- 输入：`input/aids.xlsx`
- 抓取器产出：`work_v2/items/<aid>/10_sources.txt`（使用 `=====参考资料=====` 分隔正文与参考资料）
- 输出：`output/<aid>.docx`（或标题+aid）
- 诊断：`work_v2/runs/<run_id>/diagnose.json`

## 目录结构
```
input/
work_v2/
library/
assets/
image_bank/
output/
import/
```

## 独立工具
文库整理：
```
python tools/organize_library.py --src <用户文库目录>
```

图库整理：
```
python tools/organize_image_bank.py --src <用户图库目录>
```

## 依赖安装
```
pip install -r requirements.txt
```
