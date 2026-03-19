# 主菜单 Figma 切图规范

目标：Figma 出图后，直接覆盖 `assets/Resources/UI/MainMenu/` 下同名素材，Cocos 自动加载，不再做视觉近似。

## 设计基准

- 设计尺寸：`1280x720`
- 安全区域：中间 `640x520`
- 左右人物预留：背景图中间可留空，人物后续单独叠加
- 首页只包含：标题、开始游戏、继续游戏、退出游戏、设置入口

## 资源目录

- `assets/Resources/UI/MainMenu/BG/`
- `assets/Resources/UI/MainMenu/Title/`
- `assets/Resources/UI/MainMenu/Buttons/`
- `assets/Resources/UI/MainMenu/Settings/`
- `assets/Resources/UI/MainMenu/SettingsPanel/`

## 必出素材

### 背景

- `bg_mainmenu_base_1280x720.png`
  - 完整首页背景
  - 包含冷暖过渡、氛围光、底色
  - 不包含人物
- `bg_ring_left.png`
  - 左侧装饰圆环
  - 透明底
- `bg_ring_right.png`
  - 右侧装饰圆环
  - 透明底

### 标题

- `title_plaque.png`
  - 完整木牌
  - 透明底
- `title_logo_zh.png`
  - 中文标题艺术字“冷面人生”
  - 透明底
- `title_logo_en.png`
  - 英文标题
  - 没有英文版可先不出

### 主按钮

- `btn_menu_n.png`
  - 普通态按钮底板
  - 推荐 9-slice
- `btn_menu_p.png`
  - 按下态按钮底板
  - 推荐 9-slice
- `btn_menu_d.png`
  - 禁用态按钮底板
  - 推荐 9-slice

- `btn_label_start_zh.png`
- `btn_label_continue_zh.png`
- `btn_label_quit_zh.png`
- `btn_label_start_en.png`
- `btn_label_continue_en.png`
- `btn_label_quit_en.png`
  - 按钮文字全部透明底导出
  - 如果英文暂时不用，可先只出中文

### 设置入口

- `settings_sign_n.png`
  - 设置牌普通态
- `settings_sign_p.png`
  - 设置牌按下态
- `settings_icon_gear.png`
  - 单独齿轮图标
- `settings_text_zh.png`
  - “设置”文字图
- `settings_text_en.png`
  - “Settings”文字图

### 设置面板

- `settings_panel_bg.png`
- `settings_panel_title_zh.png`
- `settings_panel_title_en.png`
- `settings_close.png`

## 导出要求

- 格式：`PNG`
- 背景：整图导出，不做裁切
- 透明元素：保持透明底
- 阴影、高光、木纹、发光全部烘焙进图里
- 不把这些效果交给 Cocos 运行时去模拟
- 按钮、牌匾推荐在 Figma 中按最终显示尺寸输出

## 命名规则

- 必须严格按上面的文件名导出
- 后续直接替换同名文件，不改路径，不改代码

## Cocos 侧加载规则

- 脚本会固定读取：
  - `UI/MainMenu/BG/...`
  - `UI/MainMenu/Title/...`
  - `UI/MainMenu/Buttons/...`
  - `UI/MainMenu/Settings/...`
  - `UI/MainMenu/SettingsPanel/...`
- 只要导出到这些路径，首页会自动换成正式素材
