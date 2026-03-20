# GitHub Codex 团队并行 Issue 清单（可直接复制）

## 使用说明
- 在 GitHub 仓库里按下面的 `Issue 标题` 逐条创建 Issue。
- 每条 Issue 对应一个分支，分支命名使用文档中的 `建议分支`。
- PR 描述必须包含：`逻辑改动`、`场景改动`、`回归路径`、`风险点`。
- 涉及场景的任务必须附 MCP 操作记录（至少 `open`、`validate_scene`、`save`）。

## 里程碑拆分
- 里程碑 1（第 1 周）：流程收敛与单场景骨架
- 里程碑 2（第 2 周）：地图解锁与剧情任务闭环
- 里程碑 3（第 3 周）：小游戏样板与旧关卡清理

---

## Issue 01
**Issue 标题**：`[T0] 初始化协作基线与分支规范`  
**建议分支**：`team-a/bootstrap-governance`

**内容模板**
- 目标：建立本次重构的分支、PR、验收、回归统一规范。
- 交付：
  - `docs/` 下新增协作规范文档。
  - 定义分支命名、PR 模板、验收模板。
- 验收标准：
  - 所有 Team A-E 都可按同一模板提交 PR。
  - 无口头约定，规则文档化。

## Issue 02
**Issue 标题**：`[A] 流程路由统一到 SceneRouteService`  
**建议分支**：`team-a/route-unify`

**内容模板**
- 目标：主流程场景跳转统一由 `SceneRouteService` 管理。
- 范围：
  - 替换主流程中直接 `director.loadScene(...)` 的入口。
  - 禁止硬编码回退到 `CookingScene`。
- 验收标准：
  - 主流程代码中不再出现 `loadScene('ShopScene'|'MainMenu'|'CookingScene')`。
  - 主菜单 -> 商店 -> 备菜 -> 营业链路正常。

## Issue 03
**Issue 标题**：`[A] 存档 schema v2 与 legacy 备份分支收口`  
**建议分支**：`team-a/save-schema-v2`

**内容模板**
- 目标：完成 `WorldProgress` 新结构并稳定持久化。
- 范围：
  - 启动时检测老存档并备份，不自动迁移。
  - 新 schema 包含：世界进度、地图/设备/食材解锁、剧情进度、day state。
- 验收标准：
  - 新存档可读写。
  - 老存档仅备份，不污染新存档。

## Issue 04
**Issue 标题**：`[A] 旧关卡入口下线开关收口`  
**建议分支**：`team-a/legacy-entry-off`

**内容模板**
- 目标：Level2-6 先下线入口，保留可回滚开关。
- 范围：
  - 菜单、流程管理、隐藏入口等统一受 FeatureGate 控制。
- 验收标准：
  - 开关关闭时无法进入旧关卡。
  - 开关打开可恢复（用于回滚验证）。

## Issue 05
**Issue 标题**：`[B] 单营业主场景逻辑模块化拆分`  
**建议分支**：`team-b/business-modularize`

**内容模板**
- 目标：降低 `CookingControllerV2` 复杂度，拆出子系统。
- 范围：
  - 订单生产、营业状态、设备效果、风味标签处理拆分。
  - 不改变用户可见主流程。
- 验收标准：
  - 无新增超大文件。
  - 原有营业闭环不回归。

## Issue 06
**Issue 标题**：`[B] 设备系统接入经营效果`  
**建议分支**：`team-b/device-effects`

**内容模板**
- 目标：设备解锁后实际影响营业参数（产能/速度/容错）。
- 范围：
  - 读取 `DeviceConfig.effects` 并作用到营业逻辑。
- 验收标准：
  - 购买设备后营业行为可观测变化。
  - 读档后效果持续生效。

## Issue 07
**Issue 标题**：`[B] 食材风味系统接入订单判定`  
**建议分支**：`team-b/flavor-order-impact`

**内容模板**
- 目标：风味标签可用于剧情任务订单判定与收益影响。
- 范围：
  - 接入 `IngredientFlavorConfig.flavorTags/recipeImpact`。
- 验收标准：
  - 订单完成时可稳定提取 flavor tags。
  - 任务系统可据此推进。

## Issue 08
**Issue 标题**：`[B] 世界商店购买链路一致性`  
**建议分支**：`team-b/world-shop-consistency`

**内容模板**
- 目标：商店购买与钱包/库存/存档三方一致。
- 范围：
  - 设备购买、食材解锁与补货。
  - 世界钱包与库存同步。
- 验收标准：
  - 买后即时生效。
  - 存档/读档后状态一致。

## Issue 09
**Issue 标题**：`[C] 每日剧情窗口调度（主线1+支线1）`  
**建议分支**：`team-c/daily-window`

**内容模板**
- 目标：按天固定窗口分配主线与支线任务。
- 范围：
  - 当日首次进入营业时派发。
  - 跨天重置并重新派发。
- 验收标准：
  - 同一天不重复派发。
  - 跨天逻辑正确。

## Issue 10
**Issue 标题**：`[C] 订单型任务推进与完成判定`  
**建议分支**：`team-c/order-task-progress`

**内容模板**
- 目标：订单完成可推进主线/支线任务进度。
- 范围：
  - 按地图、口味标签、订单数量判定。
- 验收标准：
  - 满足条件推进，未满足不推进。
  - 达标后任务完成与奖励发放正确。

## Issue 11
**Issue 标题**：`[C] 剧情奖励与 nextTask 链路`  
**建议分支**：`team-c/story-reward-chain`

**内容模板**
- 目标：任务奖励与后续任务链路稳定。
- 范围：
  - `money`、`unlockDeviceIds`、`unlockIngredientIds`、`storyFlags`。
- 验收标准：
  - 奖励无重复发放。
  - 链路可持续推进到下一任务。

## Issue 12
**Issue 标题**：`[D][MCP] 主菜单/商店/备菜/营业四核心场景收口`  
**建议分支**：`team-d/core-scenes-mcp`

**内容模板**
- 目标：四核心场景结构与组件引用稳定。
- 范围：
  - `MainMenu.scene`、`ShopScene.scene`、`ProcessingScene.scene`、`Level1CookingScene.scene`。
- 验收标准：
  - 每个场景 `validate_scene` 通过。
  - 无 broken refs。
  - 附 MCP 操作记录。

## Issue 13
**Issue 标题**：`[D][MCP] 单营业场景地图表现层切换`  
**建议分支**：`team-d/map-visual-switch`

**内容模板**
- 目标：在同一个营业场景里按 map 配置切换表现层。
- 范围：
  - 背景、特殊顾客池、入口可见性、文案提示。
- 验收标准：
  - `street` 与 `gbd` 两图可切换。
  - 切换后不影响订单与剧情系统。

## Issue 14
**Issue 标题**：`[D][MCP] 小游戏入口场景配置与返回链路`  
**建议分支**：`team-d/minigame-entry-scene`

**内容模板**
- 目标：营业地图入口 -> 小游戏店 -> 结算回流 -> 返回主流程。
- 范围：
  - `FactoryScene` 入口与返回按钮链路。
- 验收标准：
  - 入口可达。
  - 奖励回流世界资金。
  - 返回营业与主菜单均正常。

## Issue 15
**Issue 标题**：`[D][MCP] 旧关卡入口节点移除（不物理删资源）`  
**建议分支**：`team-d/legacy-entry-hide`

**内容模板**
- 目标：先做入口下线，不做资源物理删除。
- 范围：
  - 场景内按钮/传送入口/可见节点移除或禁用。
- 验收标准：
  - 用户路径无法触达 Level2-6。
  - 主流程不受影响。

## Issue 16
**Issue 标题**：`[E] 小游戏样板玩法闭环打磨`  
**建议分支**：`team-e/minigame-loop`

**内容模板**
- 目标：首个小游戏店达到“可玩+可结算+可回流”标准。
- 范围：
  - 计时、目标、胜负判定、奖励提示。
- 验收标准：
  - 成功有奖励，失败无奖励。
  - 结算文案和状态一致。

## Issue 17
**Issue 标题**：`[E] 小游戏每日奖励一次策略`  
**建议分支**：`team-e/minigame-daily-reward-once`

**内容模板**
- 目标：同一天重复进入小游戏不重复发奖。
- 范围：
  - 基于 dayIndex + storyFlags 做幂等。
- 验收标准：
  - 同日只发一次。
  - 跨天可再次获取。

## Issue 18
**Issue 标题**：`[E] 集成冒烟与回归报告`  
**建议分支**：`team-e/smoke-regression-report`

**内容模板**
- 目标：形成统一冒烟脚本与回归结论。
- 必测路径：
  - 主菜单 -> 商店 -> 备菜 -> 营业 -> 赚钱 -> 地图2解锁
  - 设备/食材购买即刻生效 + 读档一致
  - 剧情任务按窗口触发并推进
  - 小游戏入口、结算、回流正常
- 验收标准：
  - 场景切换无空引用。
  - 控制台无新增 error。
  - 输出 RC 验收报告文档。

---

## 建议 Labels
- `team-a` `team-b` `team-c` `team-d` `team-e`
- `arch` `gameplay` `story` `scene-mcp` `minigame`
- `milestone-1` `milestone-2` `milestone-3`
- `risk-high` `risk-medium` `risk-low`

## PR 合并门槛（建议）
- 至少 1 位 reviewer 通过
- 通过对应回归路径
- 场景变更附 MCP 记录
- 不允许新增超大控制器文件
