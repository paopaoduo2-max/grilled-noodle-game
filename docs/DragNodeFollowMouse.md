# 节点拖动跟随鼠标的最佳实践

## 问题背景

在 Cocos Creator 3.x 中，当节点位于有缩放的父节点下（如 `GrillArea` 有 1.5x 缩放），直接使用坐标转换会导致拖动时节点无法精确跟随鼠标。

**节点层级示例：**
```
Canvas
└── GrillArea (scale: 1.5)
    └── FoodContainer
        └── DoughBg (要拖动的节点)
```

## 解决方案：临时移动到 Canvas

**核心思路**：拖动时将节点临时移到 Canvas 下，使用和 `MouseFollower`、`BrushSauceController` 相同的坐标系。

### 1. 拖动开始 - 移到 Canvas

```typescript
private onDragStart(event: EventTouch, targetNode: Node) {
    // 记录原始父节点
    this.dragOriginalParent = targetNode.parent;
    this.dragStartPos.set(targetNode.position);
    
    // 获取 Canvas
    const canvas = director.getScene()?.getChildByName('Canvas');
    if (!canvas) return;
    
    // 记录世界位置
    const worldPos = targetNode.worldPosition.clone();
    
    // 移到 Canvas 下
    targetNode.parent = canvas;
    targetNode.setSiblingIndex(9999);  // 确保在最上层
    
    // 转换为 Canvas 本地坐标
    const canvasTransform = canvas.getComponent(UITransform);
    if (canvasTransform) {
        const localPos = canvasTransform.convertToNodeSpaceAR(worldPos);
        targetNode.setPosition(localPos);
        this.dragStartPos.set(localPos);  // 更新起始位置
    }
}
```

### 2. 拖动中 - 使用标准坐标转换

```typescript
private onDragMove(event: EventTouch, targetNode: Node) {
    // 节点现在在 Canvas 下，使用标准坐标转换
    const canvas = targetNode.parent;
    if (!canvas) return;
    
    const canvasTransform = canvas.getComponent(UITransform);
    if (!canvasTransform) return;
    
    const uiPos = event.getUILocation();
    const designSize = view.getDesignResolutionSize();
    const canvasSize = canvasTransform.contentSize;
    const scaleToCanvas = canvasSize.width / designSize.width;
    
    // 标准坐标转换公式（和 MouseFollower、BrushSauceController 相同）
    const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
    const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
    
    targetNode.setPosition(localX, localY, 0);
}
```

### 3. 拖动结束 - 移回原始父节点

```typescript
private moveBackToOriginalParent(targetNode: Node) {
    if (this.dragOriginalParent) {
        // 记录当前世界位置
        const worldPos = targetNode.worldPosition.clone();
        
        // 移回原始父节点
        targetNode.parent = this.dragOriginalParent;
        
        // 转换为原始父节点的本地坐标
        const parentTransform = this.dragOriginalParent.getComponent(UITransform);
        if (parentTransform) {
            const localPos = parentTransform.convertToNodeSpaceAR(worldPos);
            targetNode.setPosition(localPos);
        }
        
        this.dragOriginalParent = null;
    }
}

private onDragEnd(event: EventTouch, targetNode: Node) {
    // 检测目标区域...
    
    // 如果需要返回原位
    this.moveBackToOriginalParent(targetNode);
    
    // 播放返回动画
    tween(targetNode)
        .to(0.2, { position: this.dragStartPos }, { easing: 'backOut' })
        .start();
}
```

## 需要的属性

```typescript
private dragOriginalParent: Node | null = null;  // 拖动前的原始父节点
private dragStartPos: Vec3 = new Vec3();         // 拖动开始时的位置
```

## 为什么这样做有效

1. **避免缩放问题**：Canvas 没有缩放，坐标转换简单直接
2. **统一坐标系**：和 `MouseFollower`、`BrushSauceController` 使用相同的坐标系
3. **层级最高**：拖动时节点在 Canvas 最上层，不会被其他元素遮挡

## 相关文件

- `CookingControllerV2.ts` - 面饼拖动实现
- `BrushSauceController.ts` - 刷子跟随鼠标实现
- `CoordinateConversion.md` - 坐标转换详解
