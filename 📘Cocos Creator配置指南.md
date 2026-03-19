# Cocos Creator 主菜单配置指南

## 一、场景结构设置

### MainMenu 场景节点结构

```
Canvas
├─ MainMenuUI (挂载 MainMenuUI.ts 脚本)
│   ├─ Title (Label) - 游戏标题
│   ├─ ButtonGroup (Node) - 按钮组
│   │   ├─ StartButton (Button) - 开始游戏
│   │   ├─ ContinueButton (Button) - 继续游戏
│   │   ├─ LoadSaveButton (Button) - 读取存档
│   │   ├─ SettingsButton (Button) - 设置
│   │   └─ QuitButton (Button) - 退出游戏
│   ├─ SettingsPanel (Node) - 设置面板
│   │   └─ (见下方设置面板结构)
│   └─ SaveListPanel (Node) - 存档列表面板
│       └─ (见下方存档面板结构)
```

---

## 二、主菜单UI配置 (MainMenuUI)

### 1. 创建主菜单节点

1. **在Canvas下创建空节点**，命名为 `MainMenuUI`
2. **添加组件**：`MainMenuUI` 脚本
3. **设置属性**：

#### 属性绑定列表：
```
MainMenuUI 组件属性：
├─ Title Label: → Title节点的Label组件
├─ Start Btn: → StartButton节点的Button组件
├─ Continue Btn: → ContinueButton节点的Button组件
├─ Load Save Btn: → LoadSaveButton节点的Button组件
├─ Settings Btn: → SettingsButton节点的Button组件
├─ Quit Btn: → QuitButton节点的Button组件
├─ Settings Panel: → SettingsPanel节点
├─ Save List Panel: → SaveListPanel节点
└─ Save List Content: → SaveListPanel/ScrollView/View/Content节点
```

### 2. 创建标题

1. 创建Label节点，命名为 `Title`
2. 设置Label属性：
   - String: "东北料理王"
   - Font Size: 48
   - Color: RGB(100, 50, 0)
   - Horizontal Align: Center
3. 位置：(0, 250, 0)

### 3. 创建按钮组

在 `ButtonGroup` 节点下创建5个按钮，配置如下：

#### StartButton（开始游戏）
- **位置**: (0, 100, 0)
- **大小**: (300, 60)
- **颜色**: RGB(100, 200, 100)
- **文字**: "🎮 开始游戏" (大小: 24)

#### ContinueButton（继续游戏）
- **位置**: (0, 20, 0)
- **大小**: (300, 60)
- **颜色**: RGB(100, 150, 200)
- **文字**: "▶️ 继续游戏" (大小: 24)

#### LoadSaveButton（读取存档）
- **位置**: (0, -60, 0)
- **大小**: (300, 60)
- **颜色**: RGB(200, 200, 100)
- **文字**: "💾 读取存档" (大小: 24)

#### SettingsButton（设置）
- **位置**: (0, -140, 0)
- **大小**: (300, 60)
- **颜色**: RGB(150, 150, 150)
- **文字**: "⚙️ 设置" (大小: 24)

#### QuitButton（退出游戏）
- **位置**: (0, -220, 0)
- **大小**: (300, 60)
- **颜色**: RGB(200, 100, 100)
- **文字**: "❌ 退出游戏" (大小: 24)

---

## 三、设置面板配置 (SettingsPanel)

### 1. 面板基础结构

```
SettingsPanel (挂载 SettingsUI.ts)
├─ Background (Sprite) - 半透明背景
├─ Panel (Node) - 主面板
│   ├─ Title (Label) - "游戏设置"
│   ├─ ScrollView (ScrollView)
│   │   └─ View (Node)
│   │       └─ Content (Node)
│   │           ├─ AudioSettings (Node) - 音效设置
│   │           ├─ GraphicsSettings (Node) - 画质设置
│   │           ├─ GameSettings (Node) - 游戏设置
│   │           └─ ControlSettings (Node) - 控制设置
│   ├─ ButtonGroup (Node)
│   │   ├─ ApplyButton (Button) - 应用
│   │   ├─ ResetButton (Button) - 重置
│   │   └─ CloseButton (Button) - 关闭
```

### 2. SettingsPanel 节点设置

1. 创建空节点 `SettingsPanel`
2. 添加组件：`SettingsUI` 脚本
3. **默认设置为隐藏**: Active = false
4. 位置：(0, 0, 0)

### 3. 创建背景遮罩

1. 创建Sprite节点 `Background`
2. 设置：
   - Size: (1280, 720) - 填满屏幕
   - Color: RGBA(0, 0, 0, 180) - 半透明黑色
   - Z-Order: -1

### 4. 创建主面板

1. 创建空节点 `Panel`
2. 添加Sprite组件
3. 设置：
   - Size: (800, 600)
   - Color: RGB(240, 240, 240)
   - Position: (0, 0, 0)

### 5. 音效设置区域 (AudioSettings)

创建在 `Content` 节点下：

```
AudioSettings (位置: 0, 200, 0)
├─ Title (Label) - "🎵 音效设置"
├─ BGMGroup (Node)
│   ├─ BGMToggle (Toggle) - 背景音乐开关
│   ├─ BGMLabel (Label) - "背景音乐"
│   ├─ BGMVolumeSlider (Slider) - 音量滑块
│   └─ BGMVolumeLabel (Label) - "70%"
└─ SFXGroup (Node)
    ├─ SFXToggle (Toggle) - 音效开关
    ├─ SFXLabel (Label) - "音效"
    ├─ SFXVolumeSlider (Slider) - 音量滑块
    └─ SFXVolumeLabel (Label) - "80%"
```

#### Toggle 配置：
- Check Mark: 子节点Label，显示"✓"
- Normal Color: RGB(200, 200, 200)
- Pressed Color: RGB(150, 150, 150)

#### Slider 配置：
- Progress: 0.7 (BGM) / 0.8 (SFX)
- Direction: Horizontal
- Bar Sprite: 滑块背景条
- Handle: 滑块把手

### 6. 画质设置区域 (GraphicsSettings)

```
GraphicsSettings (位置: 0, 50, 0)
├─ Title (Label) - "🎨 画质设置"
├─ QualityGroup (Node)
│   ├─ QualityLabel (Label) - "画质等级"
│   ├─ LowToggle (Toggle) - "低"
│   ├─ MediumToggle (Toggle) - "中" (默认选中)
│   └─ HighToggle (Toggle) - "高"
└─ FrameRateGroup (Node)
    ├─ FrameRateLabel (Label) - "帧率限制"
    ├─ FPS30Toggle (Toggle) - "30"
    ├─ FPS60Toggle (Toggle) - "60" (默认选中)
    └─ UnlimitedToggle (Toggle) - "不限制"
```

**Toggle Group 配置**：
- 将3个Quality Toggle添加到同一个 Toggle Container
- 将3个FrameRate Toggle添加到同一个 Toggle Container
- 确保互斥选择

### 7. 游戏设置区域 (GameSettings)

```
GameSettings (位置: 0, -100, 0)
├─ Title (Label) - "🎮 游戏设置"
├─ ShowFPSToggle (Toggle) - "显示FPS"
├─ AutoSaveToggle (Toggle) - "自动保存" (默认开启)
└─ ShowTipsToggle (Toggle) - "显示提示" (默认开启)
```

### 8. 控制设置区域 (ControlSettings)

```
ControlSettings (位置: 0, -220, 0)
├─ Title (Label) - "🖱️ 控制设置"
├─ MouseSensitivityGroup (Node)
│   ├─ MouseLabel (Label) - "鼠标灵敏度"
│   ├─ MouseSensitivitySlider (Slider) - 灵敏度滑块
│   └─ MouseSensitivityLabel (Label) - "5"
├─ ShowHotkeysToggle (Toggle) - "显示快捷键"
└─ TouchFeedbackToggle (Toggle) - "触摸反馈"
```

### 9. 按钮组

```
ButtonGroup (位置: 0, -280, 0)
├─ ApplyButton (Button) - "应用" (绿色)
├─ ResetButton (Button) - "重置默认" (黄色)
└─ CloseButton (Button) - "关闭" (灰色)
```

### 10. SettingsUI 组件属性绑定

```
SettingsUI 组件：
├─ Bgm Toggle: → BGMToggle
├─ Bgm Volume Slider: → BGMVolumeSlider
├─ Bgm Volume Label: → BGMVolumeLabel
├─ Sfx Toggle: → SFXToggle
├─ Sfx Volume Slider: → SFXVolumeSlider
├─ Sfx Volume Label: → SFXVolumeLabel
├─ Quality Toggles: → [LowToggle, MediumToggle, HighToggle] (数组)
├─ Frame Rate Toggles: → [FPS30Toggle, FPS60Toggle, UnlimitedToggle] (数组)
├─ Show FPS Toggle: → ShowFPSToggle
├─ Auto Save Toggle: → AutoSaveToggle
├─ Show Tips Toggle: → ShowTipsToggle
├─ Mouse Sensitivity Slider: → MouseSensitivitySlider
├─ Mouse Sensitivity Label: → MouseSensitivityLabel
├─ Show Hotkeys Toggle: → ShowHotkeysToggle
├─ Touch Feedback Toggle: → TouchFeedbackToggle
├─ Apply Btn: → ApplyButton
├─ Reset Btn: → ResetButton
└─ Close Btn: → CloseButton
```

---

## 四、存档列表面板配置 (SaveListPanel)

### 1. 面板基础结构

```
SaveListPanel (挂载 SaveListUI.ts)
├─ Background (Sprite) - 半透明背景
├─ Panel (Node)
│   ├─ Title (Label) - "💾 存档管理"
│   ├─ ScrollView (ScrollView)
│   │   └─ View (Node)
│   │       └─ Content (Node) - 存档列表内容区
│   ├─ EmptyTip (Label) - 空提示
│   ├─ ButtonGroup (Node)
│   │   ├─ CreateSaveButton (Button) - 新建存档
│   │   └─ CloseButton (Button) - 关闭
```

### 2. SaveListPanel 节点设置

1. 创建空节点 `SaveListPanel`
2. 添加组件：`SaveListUI` 脚本
3. **默认设置为隐藏**: Active = false

### 3. ScrollView 配置

1. 创建ScrollView节点
2. 设置：
   - Size: (750, 450)
   - Horizontal: false
   - Vertical: true
   - Inertia: true

3. **Content 节点**：
   - Size: (750, 450) - 会自动扩展
   - Layout Component: Vertical
   - Spacing Y: 10
   - Padding: Top=10, Bottom=10

### 4. EmptyTip 配置

1. Label节点
2. 设置：
   - String: "暂无存档\n点击"新建存档"创建"
   - Font Size: 20
   - Color: Gray
   - Horizontal Align: Center
   - Vertical Align: Center
   - Position: (0, 0, 0)
   - **默认隐藏**: Active = false

### 5. SaveListUI 组件属性绑定

```
SaveListUI 组件：
├─ Scroll View: → ScrollView组件
├─ Content Node: → ScrollView/View/Content节点
├─ Save Item Prefab: → (可选，存档项预制体)
├─ Close Btn: → CloseButton
├─ Create Save Btn: → CreateSaveButton
└─ Empty Tip Label: → EmptyTip
```

---

## 五、快速配置步骤

### 步骤1：备份场景
1. 复制 `MainMenu.scene` 文件作为备份

### 步骤2：移除旧的LevelPanel
1. 在场景中找到 `LevelPanel` 节点
2. 删除该节点及其所有子节点

### 步骤3：创建MainMenuUI
1. 在Canvas下创建空节点 `MainMenuUI`
2. 添加 `MainMenuUI.ts` 脚本
3. 按照"二、主菜单UI配置"创建所有按钮

### 步骤4：创建SettingsPanel
1. 创建 `SettingsPanel` 节点
2. 添加 `SettingsUI.ts` 脚本
3. 按照"三、设置面板配置"创建UI结构
4. 绑定所有属性
5. **设置为隐藏**

### 步骤5：创建SaveListPanel
1. 创建 `SaveListPanel` 节点
2. 添加 `SaveListUI.ts` 脚本
3. 按照"四、存档列表面板配置"创建UI结构
4. 绑定所有属性
5. **设置为隐藏**

### 步骤6：绑定MainMenuUI属性
1. 选中 `MainMenuUI` 节点
2. 在属性检查器中绑定所有@property属性：
   - Title Label
   - 5个Button
   - Settings Panel节点
   - Save List Panel节点
   - Save List Content节点

### 步骤7：测试功能
1. 保存场景
2. 运行游戏
3. 测试所有按钮是否正常工作
4. 检查控制台是否有错误

---

## 六、常见问题排查

### 问题1：按钮点击无响应
**检查**：
- Button组件是否正确添加
- MainMenuUI脚本中的按钮属性是否已绑定
- 按钮的Transition是否设置为Color或Sprite

### 问题2：面板不显示
**检查**：
- 面板节点的Active是否为true（测试时）
- 面板的Layer是否正确
- 面板的Z-Order是否足够高

### 问题3：设置不保存
**检查**：
- SettingsManager是否正确初始化
- LocalStorage是否可用
- 浏览器是否禁用了LocalStorage

### 问题4：存档列表为空
**检查**：
- SaveListUI的contentNode是否正确绑定
- ScrollView的Content节点是否有Layout组件
- 是否有创建过存档

---

## 七、性能优化建议

### 1. 面板加载优化
- 将SettingsPanel和SaveListPanel设为隐藏，按需显示
- 使用对象池管理存档列表项
- 限制存档列表一次显示的数量

### 2. 资源优化
- 使用图集打包所有UI图片
- 压缩大图资源
- 使用预制体复用UI元素

### 3. 代码优化
- 避免在update中频繁访问LocalStorage
- 使用缓存减少DOM操作
- 延迟加载非核心功能

---

## 八、测试清单

### 功能测试
- [ ] 点击"开始游戏"进入游戏
- [ ] 点击"继续游戏"加载最新存档
- [ ] 点击"读取存档"打开存档列表
- [ ] 点击"设置"打开设置面板
- [ ] 点击"退出游戏"显示提示
- [ ] 设置面板所有选项可以正常切换
- [ ] 设置可以正确保存和加载
- [ ] 存档可以创建、加载、删除
- [ ] 没有存档时"继续游戏"按钮禁用

### 视觉测试
- [ ] UI布局合理，无遮挡
- [ ] 字体大小适中，易读
- [ ] 颜色搭配协调
- [ ] 按钮悬停效果正常
- [ ] 面板打开/关闭流畅

### 性能测试
- [ ] 打开设置面板无卡顿
- [ ] 刷新存档列表流畅
- [ ] 内存占用正常
- [ ] 无内存泄漏

---

## 九、下一步扩展

### 短期扩展
1. 添加按钮音效
2. 添加面板打开/关闭动画
3. 美化UI样式

### 中期扩展
1. 实现关卡选择界面
2. 添加成就系统UI
3. 实现音频管理器

### 长期扩展
1. 添加多语言支持
2. 实现云存档
3. 添加社交分享功能

---

## 十、技术支持

如果遇到问题：
1. 检查控制台错误日志
2. 参考代码中的注释
3. 查看Cocos Creator官方文档
4. 确保所有脚本正确编译

**配置完成后记得保存场景！**
