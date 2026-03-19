# 关卡交互范式参考（阶段1）

## Level2：饭团/便当（RiceBundleController）
- 脚本路径：`assets/Scripts/Game/RiceBundleController.ts`
- 核心类：`RiceBundleController`
- 关键函数与交互要点：
  - `bindButtons()` / `handle*ButtonClick()`：按钮点击后统一走 `pickupHandItem()`，避免按钮逻辑分散。
  - `pickupHandItem()` / `updateHandDisplay()`：进入“手上拿着”状态，更新跟随提示与数量。
  - `playButtonClickFeedback()` / `playButtonClickAnimation()`：按钮点击缩放反馈。
  - `updateUiHitTestState()` / `disableUiHitTest()`：持物时临时禁用 Canvas 下非核心 UI 的 `UITransform.hitTest`，避免跟随物被 UI 挡住（与当前项目的 UI 阻挡修复一致）。
  - `stopEventPropagation()`：点击/拖拽中断事件传播，避免重复触发。

## Level3：锅包肉（GuoBaoRouController）
- 脚本路径：`assets/Scripts/Game/GuoBaoRouController.ts`
- 核心类：`GuoBaoRouController`
- 关键函数与交互要点：
  - `bindNodeClick()`：统一 Button 与 Touch 事件入口，兼容按钮/区域点击。
  - `bindButtons()` / `bindAreas()`：按钮与区域完全走“点击→状态更新→UI刷新”的流程。
  - `startPickupIngredient()` / `handle*AreaClick()`：点击进入手持态，在区域点击处消费/落点。
  - `toggleTool()` / `updateToolButtons()`：工具互斥选择与状态高亮。
  - `updateIngredientButtonLabels()`：按钮文本实时反映库存/选中态。

## Level4：麻辣烫（MalaTangController）
- 脚本路径：`assets/Scripts/Game/MalaTangController.ts`
- 核心类：`MalaTangController`
- 关键函数与交互要点：
  - `buildDeliveryButtons()` / `refreshDeliveryButtons()`：动态创建“出餐/交付”按钮并绑定点击。
  - `bindControls()`：统一注册按钮事件（雇佣、投圈、勺子、上菜）。
  - `bindBasketFollowInput()`：容器拖拽跟随 + 放置逻辑。
  - `onDeliveryClick()` / `onPotSlotClick()`：点击式交互完成落点逻辑与状态回写。

## BBQ 关卡应复用的交互范式（建议落地）
- 食材按钮：复用 `RiceBundleController.pickupHandItem()` 的“手持态”模型 + `playButtonClickFeedback()` 的点击反馈。
- 烤架格位：复用 `GuoBaoRouController.bindNodeClick()` 的统一事件入口，点击落点 -> 状态更新 -> UI 刷新。
- 工具按钮：复用 `GuoBaoRouController.toggleTool()` + `updateToolButtons()` 的互斥与高亮。
- 出餐/交付：复用 `MalaTangController.buildDeliveryButtons()` 的“动态按钮 + 绑定”模式，或最少走 `onDeliveryClick()` 的统一出口。
- UI 阻挡：沿用 `RiceBundleController.updateUiHitTestState()` 的 hitTest 禁用策略，持物/跟随时避免 UI 阻挡。
- 烤架点击/放置细节（补充参考）：`assets/Scripts/Game/CookingControllerV2.ts` 的 `setupButtons()` / `onGrillClick()` / `placeDoughOnGrill()` / `handleFoodClick()` 为“点击烤架→放置/翻面”的成熟实现，可按需裁剪适配。
