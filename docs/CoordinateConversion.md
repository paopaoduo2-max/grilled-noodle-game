# Cocos Creator 3.x 坐标转换解决方案

## 问题背景

在 Cocos Creator 3.x 项目中，当 Canvas 的 `contentSize` 与 `view.getDesignResolutionSize()` 不一致时，会导致鼠标/触摸事件的坐标转换出现偏移。

### 具体表现
- 点击按钮后，生成的 UI 元素不在鼠标点击位置
- 越往右点击，偏移越大
- 鼠标跟随的元素位置不正确

### 环境信息
- **设计分辨率**: 1280x720 (`view.getDesignResolutionSize()`)
- **Canvas 实际大小**: 1920x1080 (`Canvas.UITransform.contentSize`)
- **Canvas 锚点**: (0.5, 0.5) 中心

## 解决方案

### 核心公式

```typescript
// 获取 UI 坐标（设计分辨率下的坐标，左下角为原点）
const uiPos = event.getUILocation();

// 获取设计分辨率
const designSize = view.getDesignResolutionSize();

// 获取 Canvas 的实际大小
const canvasTransform = canvas.getComponent(UITransform);
const canvasSize = canvasTransform.contentSize;

// 计算缩放比例
const scaleToCanvas = canvasSize.width / designSize.width;

// 转换为 Canvas 本地坐标（Canvas 锚点在中心）
const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
```

### 完整示例代码

#### 1. 鼠标移动事件 (EventMouse)

```typescript
private onMouseMove(event: EventMouse) {
    const uiPos = event.getUILocation();
    const designSize = view.getDesignResolutionSize();
    
    // 使用目标节点的父节点（Canvas）来获取实际大小
    if (this.mouseFollower && this.mouseFollower.parent) {
        const canvasTransform = this.mouseFollower.parent.getComponent(UITransform);
        if (canvasTransform) {
            const canvasSize = canvasTransform.contentSize;
            const scaleToCanvas = canvasSize.width / designSize.width;
            this._currentMousePos.set(
                uiPos.x * scaleToCanvas - canvasSize.width / 2,
                uiPos.y * scaleToCanvas - canvasSize.height / 2
            );
        }
    }
}
```

#### 2. 触摸事件 (EventTouch)

```typescript
private onTouchStart(event: EventTouch) {
    const uiPos = event.getUILocation();
    const designSize = view.getDesignResolutionSize();
    
    const parent = this.targetNode.parent;
    if (parent) {
        const parentTransform = parent.getComponent(UITransform);
        if (parentTransform) {
            const canvasSize = parentTransform.contentSize;
            const scaleToCanvas = canvasSize.width / designSize.width;
            const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
            const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
            
            // 使用 localX, localY 设置节点位置
            this.targetNode.setPosition(localX, localY, 0);
        }
    }
}
```

## 关键点说明

### 1. 为什么不能直接用 `getUILocation()` 减去设计分辨率中心？

因为 Canvas 的 `contentSize` (1920x1080) 与设计分辨率 (1280x720) 不同。`getUILocation()` 返回的是基于设计分辨率的坐标，但节点的位置是相对于 Canvas 的本地坐标系。

### 2. 为什么不能用 `getLocation()` (屏幕坐标)？

`getLocation()` 返回的是屏幕像素坐标，与 UI 坐标系统不同。在不同分辨率的设备上，屏幕坐标和 UI 坐标的比例会变化。

### 3. 为什么需要缩放？

- `getUILocation()` 返回的坐标范围是 `[0, 1280] x [0, 720]`（设计分辨率）
- Canvas 本地坐标范围是 `[-960, 960] x [-540, 540]`（Canvas 大小 1920x1080，锚点在中心）
- 需要先将 UI 坐标缩放到 Canvas 大小，再减去中心点

### 4. 缩放比例计算

```typescript
const scaleToCanvas = canvasSize.width / designSize.width;
// 例如: 1920 / 1280 = 1.5
```

## 常见错误方案（不要使用）

### ❌ 错误方案1: 直接用屏幕坐标减去可见区域中心
```typescript
// 错误！屏幕坐标和 Canvas 坐标系不一致
const localX = screenPos.x - visibleSize.width / 2;
```

### ❌ 错误方案2: 直接用 UI 坐标减去设计分辨率中心
```typescript
// 错误！没有考虑 Canvas 大小与设计分辨率的差异
const localX = uiPos.x - designSize.width / 2;
```

### ❌ 错误方案3: 使用 convertToNodeSpaceAR
```typescript
// 错误！getLocation() 返回的是屏幕坐标，不是世界坐标
const worldPos = new Vec3(screenPos.x, screenPos.y, 0);
const localPos = canvasTransform.convertToNodeSpaceAR(worldPos);
```

## 调试技巧

当坐标转换出现问题时，可以输出以下信息进行调试：

```typescript
console.log(`屏幕坐标: (${event.getLocation().x}, ${event.getLocation().y})`);
console.log(`UI坐标: (${event.getUILocation().x}, ${event.getUILocation().y})`);
console.log(`可见区域: ${view.getVisibleSize().width}x${view.getVisibleSize().height}`);
console.log(`设计分辨率: ${view.getDesignResolutionSize().width}x${view.getDesignResolutionSize().height}`);
console.log(`Canvas 大小: ${canvasSize.width}x${canvasSize.height}`);
console.log(`Canvas 锚点: (${canvasTransform.anchorPoint.x}, ${canvasTransform.anchorPoint.y})`);
```

## 适用场景

- 鼠标跟随 UI 元素
- 拖拽功能
- 点击位置检测
- 动态生成 UI 元素到点击位置

## 相关文件

- `assets/Scripts/Game/CookingControllerV2.ts` - 包含实际应用的代码

---

*文档创建日期: 2024-12-04*
*Cocos Creator 版本: 3.x*
