# 烤冷面资源目录

此目录用于存放烤冷面制作相关的图片资源。

## 目录结构

```
Cooking/
├── Ingredients/      # 食材图片
│   ├── dough.png        # 面饼
│   ├── egg.png          # 鸡蛋
│   ├── sausage_raw.png  # 生香肠（粉色）
│   ├── sausage_cooked.png # 熟香肠（棕色）
│   ├── onion.png        # 洋葱
│   ├── cilantro.png     # 香菜
│   ├── oil.png          # 油
│   └── sauce.png        # 酱料
│
├── States/           # 烹饪状态图片
│   ├── dough_with_egg.png    # 打蛋后的面饼
│   ├── flipped.png           # 翻面后
│   ├── with_sauce.png        # 刷酱后
│   ├── with_toppings.png     # 加配料后
│   ├── rolled.png            # 卷起后
│   ├── cut.png               # 切块后
│   └── packed.png            # 打包后
│
└── UI/               # UI图片
    ├── brush.png             # 酱料刷子
    ├── btn_oil.png           # 油按钮图标
    ├── btn_dough.png         # 面饼按钮图标
    ├── btn_egg.png           # 鸡蛋按钮图标
    ├── btn_sauce.png         # 酱料按钮图标
    ├── btn_sausage.png       # 香肠按钮图标
    ├── btn_onion.png         # 洋葱按钮图标
    └── btn_cilantro.png      # 香菜按钮图标
```

## 图片规格建议

- **食材图片**: 100x100 像素，PNG 格式，透明背景
- **状态图片**: 150x150 像素，PNG 格式，透明背景
- **按钮图标**: 80x80 像素，PNG 格式，透明背景
- **刷子动画**: 可使用序列帧，如 brush_01.png, brush_02.png...

## 替换方法

1. 将图片文件放入对应目录
2. 在 Cocos Creator 中刷新资源
3. 修改 `CookingController.ts` 中的 `createFoodNode` 方法，取消注释 Sprite 加载代码

## 序列帧动画支持

如需使用序列帧动画（如香肠烤制过程），可以：
1. 创建 `Ingredients/sausage_cooking/` 子目录
2. 放入序列帧：`frame_01.png`, `frame_02.png`...
3. 在代码中使用 AnimationClip 或手动切换 SpriteFrame
