# 备菜阶段资源说明

## 📁 文件夹结构

```
Processing/
├── bg_processing.png          # 背景图 (1280x720)
├── chopping_board.png         # 砧板 (300x200)
├── chopping_board_active.png  # 砧板激活状态
│
├── knife_idle.png             # 刀具静止 (80x120)
├── knife_chop_01.png          # 切菜动画帧1
├── knife_chop_02.png          # 切菜动画帧2
├── knife_chop_03.png          # 切菜动画帧3
├── knife_chop_04.png          # 切菜动画帧4
│
├── onion_whole.png            # 完整洋葱 (100x100)
├── onion_half.png             # 切半洋葱
├── onion_diced.png            # 切块洋葱
├── onion_minced.png           # 切碎洋葱
│
├── cilantro_whole.png         # 完整香菜 (100x100)
├── cilantro_half.png          # 切段香菜
├── cilantro_diced.png         # 切小段香菜
├── cilantro_minced.png        # 切碎香菜
│
├── progress_bg.png            # 进度条背景 (400x30)
├── progress_fill.png          # 进度条填充
│
├── complete_01.png            # 完成特效帧1
├── complete_02.png            # 完成特效帧2
└── complete_03.png            # 完成特效帧3
```

## 🎬 动画序列

### 切菜动画 (knife_chop_XX.png)
- **帧数**: 4帧
- **帧率**: 12 FPS
- **尺寸**: 80x120 像素
- **说明**: 刀从上往下切的动作

### 完成特效 (complete_XX.png)
- **帧数**: 3帧
- **帧率**: 10 FPS
- **尺寸**: 100x100 像素
- **说明**: 星星闪烁效果

## 🖼️ 图片规格

| 资源 | 尺寸 | 格式 | 说明 |
|------|------|------|------|
| 背景 | 1280x720 | PNG/JPG | 厨房/木质风格 |
| 砧板 | 300x200 | PNG | 木质纹理 |
| 刀具 | 80x120 | PNG | 透明背景 |
| 食材 | 100x100 | PNG | 透明背景 |
| 进度条 | 400x30 | PNG | 可9-slice |

## 🔄 替换步骤

1. 准备好对应尺寸的图片
2. 保持文件名不变
3. 放入此文件夹
4. 重新运行游戏

## 💡 设计建议

- 砧板使用木质纹理，有使用痕迹更真实
- 刀具建议使用菜刀造型
- 食材状态变化要明显（完整→切碎）
- 进度条可使用渐变色
