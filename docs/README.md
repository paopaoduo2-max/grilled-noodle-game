# 东北料理游戏 (NewProject_1)

## 📋 项目概述

一款以东北街边小吃为主题的烹饪模拟游戏，玩家将经营各种特色摊位，制作烤冷面、煎饼果子、麻辣烫等美食。

## 🎮 游戏特色

- **7个关卡**：从新手教程到东北乱炖，难度递进
- **8种菜品**：烤冷面、煎饼果子、麻辣烫、铁板烧等
- **多样操作**：点击、长按、滑动、时机判定等交互方式
- **评分系统**：客户满意度、好评/差评机制

## 📁 项目结构

```
assets/
├── Prefabs/                    # 预制体
│   ├── UI/                     # UI 预制体
│   └── Game/                   # 游戏对象预制体
├── Resources/                  # 动态加载资源
│   ├── Audio/                  # 音频资源
│   │   ├── BGM/               # 背景音乐
│   │   └── SFX/               # 音效
│   │       ├── Cooking/       # 烹饪音效
│   │       └── UI/            # UI 音效
│   ├── Configs/               # JSON 配置文件
│   ├── Images/                # 图片资源
│   │   ├── Backgrounds/       # 背景图
│   │   ├── Customers/         # 客户头像
│   │   ├── Ingredients/       # 食材图片
│   │   ├── Recipes/           # 菜品图片
│   │   └── UI/                # UI 图片
│   │       ├── Buttons/       # 按钮
│   │       ├── Icons/         # 图标
│   │       └── Panels/        # 面板
│   └── Levels/                # 关卡配置
├── Scenes/                     # 场景文件
│   ├── MainMenu.scene         # 主菜单
│   ├── PrepareScene.scene     # 准备阶段
│   ├── CookingScene.scene     # 烹饪阶段
│   ├── ResultScene.scene      # 结算界面
│   └── TutorialScene.scene    # 教程场景
└── Scripts/                    # 脚本
    ├── Config/                # 配置类
    │   ├── AudioConfig.ts     # 音频配置
    │   ├── IngredientConfig.ts # 食材配置
    │   └── UIConfig.ts        # UI 配置
    ├── Data/                  # 数据定义
    │   ├── GameConfig.ts      # 游戏主配置
    │   └── ReviewTexts.ts     # 评价文本
    ├── Game/                  # 游戏逻辑
    │   ├── CookingController.ts
    │   ├── CookingSystem.ts
    │   ├── CustomerManager.ts
    │   └── StepOperationSystem.ts
    ├── Manager/               # 管理器
    │   ├── GameManager.ts     # 游戏管理器
    │   ├── SaveManager.ts     # 存档管理器
    │   └── SettingsManager.ts # 设置管理器
    ├── UI/                    # UI 脚本
    │   ├── MainMenuUI.ts
    │   ├── CookingPhaseUI.ts
    │   └── ResultUI.ts
    └── Utils/                 # 工具类
        ├── AudioManager.ts    # 音频管理器
        ├── EventManager.ts    # 事件管理器
        └── ResourceManager.ts # 资源管理器
```

## 🔧 开发指南

### 添加新食材图片

1. 将图片放入 `Resources/Images/Ingredients/`
2. 命名规范：`{ingredient_type}.png`（如 `egg.png`）
3. 在 `IngredientConfig.ts` 的 `IMAGE_MAP` 中添加映射

### 添加新音效

1. 将音频文件放入对应目录：
   - BGM → `Resources/Audio/BGM/`
   - 烹饪音效 → `Resources/Audio/SFX/Cooking/`
   - UI 音效 → `Resources/Audio/SFX/UI/`
2. 在 `AudioConfig.ts` 中添加路径常量
3. 通过 `AudioManager.Instance.playSFX(path)` 播放

### 创建新 Prefab

1. 在场景中创建节点并配置组件
2. 拖拽到 `Prefabs/UI/` 或 `Prefabs/Game/`
3. 通过 `ResourceManager.Instance.loadPrefab(path)` 加载

## 📐 资源规范

详见 [ASSET_GUIDELINES.md](./ASSET_GUIDELINES.md)

## 🚀 构建说明

### Web 构建
```bash
# 在 Cocos Creator 中选择 Project → Build
# Platform: Web Mobile / Web Desktop
```

### 调试模式
- 打开浏览器控制台查看 `[GameManager]`、`[CookingController]` 等日志

## 📝 版本历史

- **v1.0.0** - 初始版本，基础框架搭建
