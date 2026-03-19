# Level5 烧烤 Debug 报告（阶段0）

## 关卡场景
- 场景路径：`assets/Scenes/Level5CookingScene.scene`
- 备注：场景内没有 Prefab 实例（全部为直出节点）。

## Level5 相关脚本与职责（基于场景绑定 + 代码推断）
- `assets/Scripts/Game/BBQController.ts`
  - BBQ 专用控制器（继承 `BaseCookingController`），当前为“最小占位”逻辑：只维护订单队列/火候区选择/交付按钮，不处理食材放置、火候推进、翻面/刷酱等。
- `assets/Scripts/Game/CookingControllerV2.ts`
  - 完整烤冷面流程控制器（面饼、刷酱、翻面、装盘、出餐等）。在 Level5 中大量节点未绑定，导致逻辑无法工作。
- `assets/Scripts/UI/CookingPhaseUI.ts`
  - 订单/面板 UI 管理器，依赖 `CustomerManager`/`CookingSystem`。Level5 中这两个引用未绑定。
- `assets/Scripts/Game/BrushSauceController.ts`
  - 刷酱/撒料等动作控制器（被 `CookingControllerV2` 引用）。
- `assets/Scripts/Manager/GameManager.ts`
  - 订单完成/金币/评分汇总等全局流程。
- `assets/Scripts/Manager/InventoryManager.ts`
  - 食材库存与金币钱包管理。
- `assets/Scripts/Manager/TimeManager.ts`
  - 营业时间与暂停/恢复。
- `assets/Scripts/Manager/GameProgressManager.ts`
  - 关卡进度与解锁。
- `assets/Scripts/Game/Systems/DayNightSystem.ts`
  - 光照/时间环境。
- `assets/Scripts/Tutorial/TutorialManager.ts`
  - 教程引导（当前在 Level5 中 disabled）。
- `assets/Scripts/Game/DebugEventController.ts`
  - 调试面板按钮。
- `assets/Scripts/Game/GamblingShops/LotteryStation/LotteryStationController.ts`
  - 彩票站系统（Level5 场景中存在节点）。
- `assets/Scripts/Game/StoneShopController.ts`
  - 石头商店系统（Level5 场景中存在节点）。

## 场景脚本挂载位置（Level5）
- `Canvas/CookingController`：`BBQController`
- `Canvas`：`CookingControllerV2`、`CookingPhaseUI`
- `Canvas/BrushSauceSystem`：`BrushSauceController`
- `Canvas/GameManager`：`GameManager`、`GameProgressManager`
- `Canvas/InventoryManager`：`InventoryManager`
- `Canvas/TimeManager`：`TimeManager`
- `Canvas/DayNightSystem`：`DayNightSystem`
- `Canvas/DebugEventPanel`：`DebugEventController`
- `Canvas/TutorialPanel`：`TutorialManager`（disabled）
- `Canvas/LotteryStation`：`LotteryStationController`
- `Canvas/StoneShopPanel`：`StoneShopController`

## 运行/预览日志错误与警告（按阻断程度排序）
来源：`temp/logs/project.log`

1) 资源加载错误（潜在阻断）
- `asset can't be load: 524bc1e1-1ab9-4c68-9270-a2f58fa69533@f9941`
  - 场景内 `CookingControllerV2.bgSpriteFrame` 引用该 SpriteFrame，工程内未找到对应 `.meta`。

2) 关键交互缺失（功能错误，导致按钮无效/流程断）
- `Missing DoughBtn/EggBtn/CilantroBtn/OnionBtn/SausageBtn binding`
- `未找到 OilBtn / WaterBtn / SpatulaBtn`
- `顾客区域未绑定`
  - 这些均来自 `CookingControllerV2` 初始化阶段，说明 Level5 场景缺失对应节点或未绑定。

3) 体验缺失或可忽略警告（不阻断）
- `SpecialEventTextOverrides 覆写文件未找到或加载失败`
- `IPC message has been lost`（编辑器预览偶发）

## 按钮 onClick 绑定检查（Level5 场景内 cc.Button）
共 24 个按钮组件，绝大多数 `clickEvents` 为空：
- `ServeButton`、`FireHotBtn`、`FireMidBtn`、`FireWarmBtn`、`SauceBtn`、`SpiceBtn`、`FanBtn` 等均 **无 clickEvents 绑定**。
- `PhoneButton` 存在 clickEvents，但目标/组件/方法均为 `null`，属于无效绑定。
结论：按钮“可点但无逻辑”，主要依赖脚本在 `onLoad/start` 中手动绑定；当前 Level5 中 `CookingControllerV2` 绑定失败，`BBQController` 只绑定少量按钮且逻辑不完整。

## “按钮有反馈但无拿起动画/无状态改变”的原因假设
1) `CookingControllerV2` 在 Level5 中大量关键节点未绑定（grillArea、食材按钮、工具按钮等），初始化后仍无法注册交互与状态流转。
2) `CookingPhaseUI` 的 `customerManager` 与 `cookingSystem` 为 `null`，订单 UI 与流程不联动。
3) `BBQController` 仅实现“火候区选择 + 交付 + 订单队列”的最低逻辑，不包含放置/火候/翻面/装盘/出餐动作链。
4) Level5 同时挂载 `BBQController` 与 `CookingControllerV2`，两套交互模型冲突且 UI 结构不匹配，导致“能点但不完整”。

## TS 编译检查
- `npx tsc -p tsconfig.json --noEmit` 失败（本项目未安装 `typescript` 依赖），无法进行完整编译检查。
