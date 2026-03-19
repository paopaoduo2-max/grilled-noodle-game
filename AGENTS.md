# Repository Guidelines

## Project Structure & Module Organization
- `assets/` is the Cocos Creator source of truth (scenes, scripts, prefabs, resources, audio, images). Keep `.meta` files with their corresponding assets.
- `assets/Scenes/` contains gameplay scenes (e.g. menu, prepare, cooking, result).
- `assets/Scripts/` contains TypeScript gameplay/UI code (e.g. `Data/`, `Manager/`, `Game/`, `UI/`, `Utils/`).
- `docs/` and the root `*.md` files (e.g. `README.md`, `快速配置指南.md`, `代码结构说明.md`) document setup and design.
- Generated/editor output: `library/`, `temp/`, `build/`, `profiles/`, `local/`, `node_modules/` (do not edit by hand; avoid committing changes).
All replies will be made in Chinese.
Be adept at utilizing MCP to solve problems during all implementation stages

## MCP 优先操作规范
- 任何可在编辑器内完成的配置与节点修改，优先使用 MCP 工具完成，避免纯代码硬改。
- 每次实现效果与问题修复，先尝试 MCP（节点/组件/资源/场景保存），必要时再补代码。
- 向量属性用 `component.set_component_property`，`propertyType` 使用小写 `vec2` / `vec3`（大写与 `cc.Vec*` 会失败）。

## Cocos MCP 指南知识库（基于 FEATURE_GUIDE_CN）
- 外部知识来源：`https://github.com/DaxianLee/cocos-mcp-server/blob/main/FEATURE_GUIDE_CN.md`。后续凡是使用 Cocos MCP，默认把这份文档视为长期知识库。
- 文档中的 13 类能力要默认纳入工作记忆：场景、节点、组件、预制体、项目控制、调试、偏好设置、服务器、广播、高级资源、参考图像、高级场景、场景视图。
- 当前工作区里的实际 MCP 工具名与文档分类对应关系如下：
  - 场景/层级/校验：`cocos_scene`、`cocos_capture`、`cocos_validate`
  - 节点：`cocos_node`
  - 组件：`cocos_component`、`cocos_label`、`cocos_spine`
  - 预制体：`cocos_prefab`
  - 资源/项目：`cocos_asset`、`cocos_editor`
  - 组合构建：`cocos_builder`、`cocos_template`、`cocos_composite`
  - 视图/参考图：`cocos_view`
  - 动画：`cocos_animation`
- 默认工作流必须遵守文档里的通用原则：
  - 先查询再操作：先看场景、节点、组件当前状态，再做修改。
  - 优先用 UUID 或精确节点路径，不依赖模糊名称猜测。
  - 所有资源路径统一使用 `db://` 格式。
  - 每次关键操作后检查返回值，确认成功，再继续下一步。
  - 大批量操作时避免无脑循环单点调用，优先批量或先聚合再改。
- 场景类操作规范：
  - 先用 `scene.get_info / hierarchy / capture` 确认当前场景和层级。
  - 做完节点或资源调整后，必须 `scene.save`。
  - 大改后必须做一次 `validate_scene` 或日志检查。
- 节点类操作规范：
  - 创建节点时必须显式指定父节点，避免节点掉到场景根。
  - 调整位置、尺寸、层级前，先读节点信息或场景快照。
  - 移动、复制、删除节点前，先确认引用关系，避免误伤 UI 结构。
- 组件类操作规范：
  - 添加组件前，先看节点已有组件，避免渲染组件冲突。
  - `Graphics`、`Label`、`Sprite` 这类渲染组件的组合要先规划节点层级，不要在同一节点上硬叠冲突组件。
  - 挂渲染/交互组件前，先确保有 `UITransform`。
  - 改组件属性前，优先用 `info/list` 读当前值，再 `set_property`。
- 预制体类操作规范：
  - 复杂结构优先走 `prefab` 工具，不要拿普通节点创建去硬模拟预制体实例化。
  - 文档已提示：复杂预制体实例化可能有子节点丢失风险，实例化后必须检查层级是否完整。
  - 对预制体的应用、回退、保存要显式执行，不要只改实例不收口。
- 资源/项目类操作规范：
  - 导入、复制、移动、删除资源前，先查 UUID、URL、路径。
  - 资源替换优先通过 `asset` / `editor` 相关 MCP 完成，避免手动改 `.meta`。
  - 涉及预览、构建、项目状态时优先用编辑器 MCP，而不是凭猜测判断。
- 调试类操作规范：
  - 遇到渲染、引用、脚本报错，先看 `console logs / project logs / log search`。
  - 场景异常时，优先 `validate_scene`、`scene_snapshot`、`node_snapshot` 定位。
  - 修改后要跑预览，并查看是否出现新的 `error`。
- 偏好设置、服务器、广播类操作规范：
  - 编辑器偏好、全局偏好走 `cocos_editor` 的 `pref_*` 能力。
  - 项目路径、编辑器版本、运行状态优先从 MCP 读取，不靠猜。
  - 需要监控编辑器事件或消息时，再考虑广播/监听型能力。
- 参考图像工具规范：
  - 凡是视觉对位、界面复刻、UI 比例微调，必须优先使用参考图像工具，而不是靠肉眼估。
  - 标准流程：`ref_add -> ref_opacity -> ref_scale -> ref_position`，对齐完成后再调真实节点。
  - 对位时优先切到 2D 视图，必要时配合 `camera_focus`、`gizmo_tool` 使用。
  - 用户给了正确参考图时，应先把参考图挂进编辑器，再去调整 `Canvas`、`MainMenuRoot`、标题、按钮和装饰层。
- 高级场景/视图规范：
  - 复杂 UI 搭建优先考虑 `builder`、`template`、`composite`，不要所有层级都手写。
  - 需要理解当前场景结构时，优先 `scene_snapshot / node_snapshot`，比口头猜结构更可靠。
  - 调整视图、参考图、相机和 gizmo 时，统一走 `cocos_view`。
- 当外部文档和当前 MCP 工具名不完全一致时，以“文档里的能力分类”为认知模型，以“当前工作区真实可用工具名”为实际调用入口。

## 逻辑与场景分离规范
- 必须明确区分“逻辑修改”和“场景修改”：脚本、数据、状态机、交互流程归逻辑层；节点层级、组件挂载、坐标尺寸、资源引用、场景保存归场景层。
- 回答实现结果时，必须单独说明两部分：`逻辑改动` 改了什么，`场景改动` 改了什么，禁止混写成一段模糊描述。
- 场景相关操作默认使用 Cocos MCP 完成，包括但不限于：创建/删除节点、调整层级、挂载组件、设置属性、替换 SpriteFrame、保存场景。
- 除非 MCP 明确做不到，否则不要通过脚本在运行时偷偷补场景结构来代替编辑器内场景配置。
- 若必须用代码生成临时运行时节点，要在回复里明确说明该部分属于运行时逻辑，不等同于场景已落地。

## 视觉设计流程
- 凡是涉及页面视觉、菜单结构、子菜单、弹窗、HUD、按钮排布、信息层级、动效风格等视觉设计相关需求，必须先产出视觉稿或线框稿，再决定是否进入项目落地。
- 视觉稿优先使用 Figma MCP 生成或整理；至少要明确页面分区、主次层级、交互入口、功能说明与视觉方向，禁止跳过设计稿直接改运行时 UI。
- 用户未明确要求直接落地时，默认流程为：`需求梳理 -> Figma/FigJam 视觉稿 -> 用户确认 -> Cocos MCP/代码落地`。
- 若 Figma MCP 当前能力不适合直接生成高保真界面，也必须先产出可评审的低保真结构稿、功能线框图或页面流程图，再继续实现。
- 凡是场景内 UI 设计、界面草稿、页面布局草图、菜单草案、弹窗草案等，都必须优先使用 Figma MCP 实现和沉淀，不能直接跳到 Cocos 场景里试摆。
- 场景 UI 的设计阶段产物默认以 Figma/FigJam 为准；Cocos 场景只负责在设计确认后做落地，不承担“边摆边设计”的职责。

## UI 组件冲突排查（常见报错）
报错：`Can't add component 'cc.Label' to X because it conflicts with the existing 'cc.Graphics' derived component.`
处理：
- `cc.Label` 与 `cc.Graphics` 不能挂在同一个节点（都属于渲染组件）。
- 解决方案：保留 `Graphics` 在父节点，给文字新建子节点挂 `Label`。
- 以后做图标+文字时，统一使用“父节点画图形 + 子节点放文字”的结构，避免首帧报错导致 UI 渲染中断。

## cameraPriority 为空报错排查
报错：`Cannot read properties of null (reading 'cameraPriority')`
处理：
- 出现于 UI 节点带 `Graphics/Label/Button/BlockInputEvents`，但缺少 `UITransform` 的情况。
- 动态创建 UI 时，先确保节点有 `UITransform`（必要时设置尺寸），再添加渲染/交互组件。
- 若在编辑器内配置，优先用 MCP 给对应节点补 `cc.UITransform`。

## UI 阻挡跟随问题（手持/跟随物被 UI 挡住）
适用：第二关手持/跟随物体被手机、打包盒等 UI 边缘阻挡。
处理方案：
- 在 `RiceBundleController.ts` 中，当存在手持或跟随物时，临时禁用 `Canvas` 下除 `RiceBundleRoot` / `FollowOverlay` 外的 `UITransform.hitTest`（保存原 hitTest，放下后恢复）。
- 放下或丢弃后恢复所有 hitTest，避免影响正常 UI 点击。
- Level3 的 `SaucePanel` 里 `SauceArea` 和 `KetchupBowlArea` 必须是真正的小碗区域（建议 `UITransform.contentSize` 约 90×90），并通过 MCP 或编辑器设置在调料按钮附近。面积太大、挡住别的 UI 会让手持跟随被卡住，限制范围可以保证预览手持/拖动的逻辑正常。

## 编辑器内按钮文字显示（避免只显示“Label”）
适用：编辑器场景中按钮只显示默认 `Label`，预览才显示真实文字/emoji。
处理方案：
- 在编辑器里为所有按钮子节点 `BtnLabel` 直接设置 `cc.Label.string`（用 MCP `component.set_component_property`），保证编辑态就能看到真实文字/emoji。
- 若文字后续会被脚本动态覆盖，也要保留一个“合理默认值”，避免编辑器里全是 `Label`。
- 若脚本逻辑会更新按钮或工具文字（例如 `GuoBaoRouController.updateIngredientButtonLabels`、`updateToolButtons`），要加 `if (EDITOR) return;` 这样的保护，让编辑器环境跳过实时刷新，避免一运行就把编辑器态的静态文字“洗掉”。

## 鼠标跟随失准修复（跟手逐渐偏移）
适用：`ProcessingControllerV3` 等鼠标跟随道具（刀具/铲子/鸡蛋）出现“初始跟手、移动后偏移/跟不上”。
修复要点：
- 直接使用 **Canvas Camera** 的 `screenToWorld` 做坐标换算。
- 输入坐标用 `EventMouse.getLocation()`（屏幕坐标），原生 `mousemove` 用 `canvas` 的屏幕坐标换算。
- 跟随节点使用 `setWorldPosition` 更新，不再依赖 UI 坐标缩放换算。
参考实现已落地在 `assets/Scripts/Processing/ProcessingControllerV3.ts`。

### 玻璃范围对齐（MCP 配置流程）
目标：对齐 `GlassLayer` / `CapsuleLayer` 的位置与缩放，避免玻璃与扭蛋错位。
步骤（以关卡2为例）：
1. 查找节点：`GachaMachineButton`
2. 使用组件类型 `239ecZrEBdPT5zKybRAVadx`（`GachaMachineController`）
3. 设置参数（`propertyType` 用 `vec2/vec3`）：
   - `glassLayerOffset`（vec3）
   - `glassLayerScale`（vec2）
   - `capsuleLayerOffset`（vec3）
   - `capsuleLayerScale`（vec2）
4. 保存场景（MCP `scene.save`）

### 扭蛋机素材替换（MCP 配置流程）
目标：将 `MachineStage/GachaMachine` 下的 `Base` 替换为 `idle`，`Lever` 替换为 `button`，并新增 `Door` 素材。
步骤（以关卡2为例）：
1. 打开场景：`db://assets/Scenes/Level2CookingScene.scene`
2. 查找节点：`GachaMachineButton`
3. 通过 MCP 设置脚本属性（`GachaMachineController`）：
   - `useMachineSprite = true`（propertyType 使用 `boolean`）
   - `normalMachineSprite = idle` 的 `SpriteFrame`（propertyType 使用 `asset`，值为 `idle.png@f9941` 的 UUID）
   - `normalMachineButtonSprite = button` 的 `SpriteFrame`（propertyType 使用 `asset`）
   - `normalMachineDoorSprite = door` 的 `SpriteFrame`（propertyType 使用 `asset`）
4. 保存场景（MCP `scene.save`）

备注：若需要使用 `Base/Lever` 贴图替换（而非整机叠图），建议 `useMachineSprite = false`，避免叠加双层机身。

素材路径：`assets/Resources/Gacha/Machines/normal/`（`idle.png` / `button.png` / `door.png`）

## Build, Test, and Development Commands
- Open the project in **Cocos Creator 3.8.7+** (see `package.json`).
- Run locally: use the editor **Preview** (`Ctrl+P` on Windows) and verify the browser console has no errors.
- Build: editor **Project → Build** (common output: `build/web-desktop/`).
- Troubleshooting rebuild: close the editor, delete `library/` and `temp/`, then reopen the project.

## Coding Style & Naming Conventions
- Language: TypeScript under `assets/Scripts/**`.
- Indentation: follow existing files (4 spaces); keep changes consistent with surrounding style.
- Naming: classes `PascalCase`, methods/fields `camelCase`, managers `*Manager.ts`, UI controllers `*UI.ts`.
- Asset hygiene: rename/move assets via the editor to preserve UUIDs and `.meta` linkage.

## Testing Guidelines
- No automated test runner is configured.
- For changes, do a quick smoke test: open the affected scene(s), run Preview, and validate the full loop (menu → prepare → cooking → result).

## Commit & Pull Request Guidelines
- Git history is not present in this repository; use clear, scoped messages (e.g. `feat(ui): improve main menu`, `fix(cooking): prevent double-pack`).
- PRs should include: summary, test steps (which scene/flow), screenshots/GIFs for UI changes, and any new/changed assets listed.

## 2025-12-29 Gacha Shop Notes
- 目标：扭蛋店参考彩票站“3 连不中必中”机制，叠加 8 抽软保底、10 抽硬保底，突出赌感。
- 配置：支持 1/5/10 抽（10 连 9.5 折）、追击半价（0.5×单价），硬保底权重 SR/SSR/UR=70/25/5，短保底 3 连不中必中 SR。
- UI（赛璐璐）：顶部钱包/返回/帮助，Tabs 选机，底部单抽/多连/追击按钮，双进度条（3 连不中、软/硬保底），批量结果摘要；保持赛璐璐色块、粗描边、高光。
- 动效：投币→拉杆→震动→掉落→开蛋，稀有光效分级（SR 金扫光，SSR 粉金爆光+轻震，UR 紫金爆光+慢放）；批量抽首末慢放，中间快放；追击可快放。
- 赌性强化点：明确“再来必中”提示、概率提升提示、追击按钮、批量折扣、历史弹幕/高光展示，鼓励“再抽一发”。

## 测试开关
- 需要恢复“未解锁”逻辑时，将以下开关改为 `false`：
  - `assets/Scripts/Manager/InventoryManager.ts` 中的 `DEBUG_UNLOCK_ALL_LEVELS`
  - `assets/Scripts/Manager/GameProgressManager.ts` 中的 `DEBUG_UNLOCK_ALL_LEVELS`
