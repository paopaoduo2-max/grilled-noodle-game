# UI 资源替换说明

## 📁 文件夹结构

```
resources/UI/
├── Backgrounds/          # 背景图片
│   ├── main_bg.png       # 主菜单背景
│   ├── main_bg_01.png    # 动态背景帧1（可选）
│   ├── main_bg_02.png    # 动态背景帧2（可选）
│   ├── shop_bg.png       # 商店背景
│   ├── cooking_bg.png    # 烹饪背景
│   ├── processing_bg.png # 加工背景
│   └── result_bg.png     # 结算背景
│
├── Buttons/              # 按钮素材
│   ├── btn_primary.png   # 主按钮（橙色）
│   ├── btn_secondary.png # 次按钮（绿色）
│   ├── btn_normal.png    # 普通按钮
│   └── btn_icon.png      # 图标按钮背景
│
├── Icons/                # 图标
│   ├── icon_coin.png     # 金币图标
│   ├── icon_star.png     # 星星图标
│   ├── icon_settings.png # 设置图标
│   └── icon_close.png    # 关闭图标
│
├── MainMenu/             # 主菜单专用
│   └── title_logo.png    # 标题Logo（可选）
│
└── Common/               # 通用素材
    ├── panel_bg.png      # 面板背景
    └── divider.png       # 分隔线
```

## 🖼️ 图片规格建议

### 背景图
- **尺寸**: 1280×720 或 1920×1080
- **格式**: PNG 或 JPG
- **说明**: 背景会自动适配Canvas尺寸
- **默认**: 使用渐变背景（无需图片）

### 动态背景（帧动画）
- **命名规则**: `main_bg_01.png`, `main_bg_02.png`, ...
- **帧数**: 建议 4-8 帧
- **帧率**: 默认 8 FPS
- **启用方式**: 修改 `UIAssetConfig.ts` 中的 `useAnimation: true`

### 按钮
- **尺寸**: 建议使用 9-slice 切图
- **主按钮**: 280×70
- **次按钮**: 200×55
- **图标按钮**: 60×60
- **格式**: PNG（支持透明）

### 图标
- **尺寸**: 64×64 或 128×128
- **格式**: PNG（透明背景）

## 🔧 替换步骤

### 方法一：直接替换文件
1. 将新图片放入对应文件夹
2. 保持文件名不变
3. 重新运行游戏

### 方法二：修改配置文件
1. 打开 `Scripts/Config/UIAssetConfig.ts`
2. 修改对应的资源路径
3. 保存并重新运行

## 🎨 背景设置

### 渐变背景（默认）
在 `UIStyleConfig.ts` 中修改渐变色：
```typescript
gradientTop: new Color(255, 200, 150, 255),    // 顶部颜色
gradientBottom: new Color(200, 120, 80, 255),  // 底部颜色
```

### 静态图片背景
在 `UIAssetConfig.ts` 中设置：
```typescript
background: {
    static: 'UI/Backgrounds/main_bg',  // 设置图片路径
    useAnimation: false,
}
```

### 动态背景
在 `UIAssetConfig.ts` 中修改：
```typescript
background: {
    frames: [
        'UI/Backgrounds/main_bg_01',
        'UI/Backgrounds/main_bg_02',
        'UI/Backgrounds/main_bg_03',
        'UI/Backgrounds/main_bg_04',
    ],
    frameRate: 8,        // 帧率
    useAnimation: true,  // 改为 true 启用动画
}
```

### 渐变主题
支持预设主题：`'warm'` | `'cool'` | `'sunset'` | `'forest'`

## 🎨 颜色配置

在 `Scripts/Config/UIStyleConfig.ts` 中修改颜色：

```typescript
export const UIColors = {
    primary: new Color(255, 140, 60, 255),    // 主色调
    secondary: new Color(100, 180, 100, 255), // 次要色
    bgDark: new Color(45, 35, 30, 255),       // 深色背景
    textGold: new Color(255, 200, 50, 255),   // 金色文字
    // ...
};
```

## ⚠️ 注意事项

1. **文件名区分大小写**
2. **图片必须放在 `resources` 文件夹下才能动态加载**
3. **替换后需要重新运行游戏**
4. **建议保留原始文件备份**

## 📞 常见问题

### Q: 图片不显示？
A: 检查文件路径是否正确，确保图片在 `resources` 文件夹下

### Q: 动态背景不播放？
A: 确保 `useAnimation` 设为 `true`，且帧图片命名正确

### Q: 按钮样式不对？
A: 检查 `UIStyleConfig.ts` 中的颜色配置
