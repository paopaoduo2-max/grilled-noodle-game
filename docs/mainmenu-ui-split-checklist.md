# MainMenu UI 分块清单

基准稿：`docs/figma_mockups/main-menu-v15-polish.html`

## 目标
- 不再使用整页图直贴。
- 不再允许从整页稿反向裁切出 UI 素材。
- Figma 负责直接设计并输出可替换的独立 UI 组件。
- Cocos 负责按模块拼装、布点、绑定交互。

## 页面分块

### 背景层
- `BG_Base`
  - 冷暖横向过渡底图
  - 不包含标题、按钮、设置入口
- `BG_Decor_Left`
  - 左侧冷色氛围层
- `BG_Decor_Right`
  - 右侧暖色氛围层
- `BG_Center_Blend`
  - 中线柔和过渡光

### 标题层
- `Title_Plaque_Shadow`
  - 木牌阴影
- `Title_Plaque`
  - 木牌底板
- `Title_SubTitle`
  - 副标题：`冷面人生`
  - 位于主标题下方，单独一行，推荐独立导出，保持题签/手写副标题结构
- `Title_MainTitle`
  - 主标题：`烤冷面物语`
  - 位于标题区上方主位，单独一行，推荐单独出图，不用 `Label` 复刻

### 主菜单层
- `Btn_Start_BG`
- `Btn_Start_Text`
- `Btn_Continue_BG`
- `Btn_Continue_Text`
- `Btn_Quit_BG`
- `Btn_Quit_Text`

状态要求：
- `normal`
- `pressed`
- `disabled`

### 设置入口
- `Settings_Rope_Left`
- `Settings_Rope_Right`
- `Settings_Sign_BG`
- `Settings_Icon`
- `Settings_Text`

状态要求：
- `normal`
- `pressed`

### 设置面板
- `SettingsPanel_BG`
- `SettingsPanel_Title`
- `SettingsPanel_Close`
- `SettingsPanel_Item_BG`
- `SettingsPanel_Item_Label`
- `SettingsPanel_Audio_BGM`
- `SettingsPanel_Audio_SFX`
- `SettingsPanel_Graphics_Quality`
- `SettingsPanel_Graphics_FrameRate`
- `SettingsPanel_Game_Language`
- `SettingsPanel_Game_ShowFPS`
- `SettingsPanel_Game_AutoSave`
- `SettingsPanel_Game_ShowTips`
- `SettingsPanel_Controls_MouseSensitivity`
- `SettingsPanel_Controls_ShowHotkeys`
- `SettingsPanel_Controls_TouchFeedback`

## 当前布局基准

来自 `main-menu-v15-polish.html`：
- 设计基准：`1280 x 720`
- 标题区：
  - `center top = 110`
  - `plaque width = 388`
- 按钮区：
  - `menu top = 322`
  - `menu width = 282`
  - `button height = 54`
  - `button gap = 14`
- 设置入口：
  - `top = 26`
  - `right = 30`
  - `width = 118`
- 装饰圆环：
  - 当前版本移除，不进入最终组件设计

## Cocos 对应节点建议
- `Canvas/MainMenuRoot/BackgroundRoot/BG_Base`
- `Canvas/MainMenuRoot/BackgroundRoot/BG_Decor_Left`
- `Canvas/MainMenuRoot/BackgroundRoot/BG_Decor_Right`
- `Canvas/MainMenuRoot/BackgroundRoot/BG_Center_Blend`
- `Canvas/MainMenuRoot/TitleRoot/Title_Plaque_Shadow`
- `Canvas/MainMenuRoot/TitleRoot/Title_Plaque`
- `Canvas/MainMenuRoot/TitleRoot/Title_SubTitle`
- `Canvas/MainMenuRoot/TitleRoot/Title_MainTitle`
- `Canvas/MainMenuRoot/MenuRoot/StartButton`
- `Canvas/MainMenuRoot/MenuRoot/ContinueButton`
- `Canvas/MainMenuRoot/MenuRoot/QuitButton`
- `Canvas/MainMenuRoot/TopRightRoot/SettingsButton`
- `Canvas/MainMenuRoot/OverlayRoot/SettingsPanel`

## 导出约束
- 底图和装饰图：`PNG`
- 可拉伸底板：优先做 `9-slice`
- 艺术字：单独透明底 `PNG`
- 按钮文字：
  - 若要完全复刻，独立出图
  - 若后续要做多语言，文字层可保留 `Label`

## 素材来源约束
- `BG_Base / 标题 / 按钮 / 设置入口 / 设置面板` 必须从组件板或组件稿直接导出。
- 设置面板组件必须覆盖代码中真实存在的设置分类：`audio / graphics / game / controls`。
- 禁止从整页预览图、整页截图、整页设计稿中裁切出最终资源。
- 整页预览图只用于检查组合关系，不作为正式资源来源。
- 若组件包含多层结构，例如木牌底、艺术字、按钮底板、按钮文案、齿轮图标，优先拆成独立导出层。

## 本轮落地方向
- 基于组件清单直接产出组件设计板。
- 先把组件板导入 Figma，作为背景、标题、按钮、设置面板的独立组件基准。
- 最后用 Cocos MCP 替换正式资源，禁止回退到整页裁切方案。
