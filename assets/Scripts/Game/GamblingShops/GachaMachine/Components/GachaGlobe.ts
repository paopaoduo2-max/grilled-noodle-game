import { _decorator, Component, Graphics, Color, tween, Vec3, Vec2, Node, Tween } from 'cc';
import { GACHA_UI_CONFIG } from '../Config/GachaUIConfig';
import { GACHA_CONFIG, GachaRarity } from '../GachaConfig';

const { ccclass, property } = _decorator;

/**
 * 玻璃球组件
 * 负责绘制玻璃球罩、弯月形高光、底部弧形反光、内部胶囊堆叠
 */
@ccclass('GachaGlobe')
export class GachaGlobe extends Component {
    @property
    radius: number = 100;

    @property
    useSquareBounds: boolean = false;

    @property(Vec2)
    squareSize: Vec2 = new Vec2(200, 200);

    @property
    squareCornerRadius: number = 12;

    @property
    usePolygonBounds: boolean = false;

    @property([Vec2])
    polygonPoints: Vec2[] = [];

    @property
    capsuleBottomRange: number = 0.38;

    @property
    capsuleBottomPower: number = 5.0;

    @property(Vec3)
    glassLayerOffset: Vec3 = new Vec3(0, 0, 0);

    @property(Vec2)
    glassLayerScale: Vec2 = new Vec2(1, 1);

    @property(Vec3)
    capsuleLayerOffset: Vec3 = new Vec3(0, 0, 0);

    @property(Vec2)
    capsuleLayerScale: Vec2 = new Vec2(1, 1);

    @property
    showGlass: boolean = true;

    @property
    capsuleCount: number = 18;

    private capsuleColors: string[] = [];
    private capsuleLayer: Node = null!;
    private glassLayer: Node = null!;
    private glassGraphics: Graphics = null!;
    private capsuleNodes: Node[] = [];
    private capsuleBases: Vec3[] = [];
    private capsuleRadii: number[] = [];
    private capsuleRarities: GachaRarity[] = [];
    private rarityWeights = { N: 60, R: 25, SR: 10, SSR: 4, UR: 1 };
    private initialCapsuleCount: number = 0;

    onLoad() {
        this.capsuleColors = GACHA_UI_CONFIG.capsuleColors;
        this.initialCapsuleCount = this.capsuleCount;
        this.capsuleLayer = new Node('CapsuleLayer');
        this.capsuleLayer.parent = this.node;

        this.glassLayer = new Node('GlassLayer');
        this.glassLayer.parent = this.node;
        this.glassGraphics = this.glassLayer.addComponent(Graphics);

        // 在 onLoad 完成后立即渲染
        this.render();
    }

    /**
     * 渲染玻璃球
     */
    render() {
        this.glassGraphics.clear();
        this.applyLayerTransforms();

        const r = this.radius;
        const usePolygon = this.usePolygonBounds && this.polygonPoints.length >= 3;
        const useSquare = !usePolygon && this.useSquareBounds && this.squareSize.x > 0 && this.squareSize.y > 0;
        if (!this.initialCapsuleCount) {
            this.initialCapsuleCount = this.capsuleCount;
        }

        this.glassLayer.active = this.showGlass;
        if (this.showGlass) {
            // 1. 玻璃球主体（半透明）
            if (usePolygon) {
                this.drawPolygonGlass();
            } else if (useSquare) {
                this.drawSquareGlass();
            } else {
                this.glassGraphics.circle(0, 0, r);
                this.glassGraphics.fillColor = new Color(255, 255, 255, 50); // Alpha 50
                this.glassGraphics.fill();

                // 2. 粗描边（5px）
                this.glassGraphics.strokeColor = Color.BLACK;
                this.glassGraphics.lineWidth = 5;
                this.glassGraphics.stroke();

                // 2.5 内圈高光
                this.glassGraphics.strokeColor = new Color(255, 255, 255, 120);
                this.glassGraphics.lineWidth = 2;
                this.glassGraphics.circle(0, 0, r - 10);
                this.glassGraphics.stroke();

                // 3. 弯月形高光（10点钟方向）
                this.drawCrescentHighlight();

                // 4. 底部弧形反光
                this.drawBottomReflection();
            }
        }

        // 5. 内部胶囊堆叠（底部半圆分布）
        this.drawCapsules();
    }

    setRarityWeights(weights: { N: number; R: number; SR: number; SSR: number; UR: number }) {
        this.rarityWeights = { ...weights };
        if (this.glassGraphics) {
            this.render();
        }
    }

    /**
     * 绘制弯月形高光（10点钟方向）
     */
    private drawCrescentHighlight() {
        this.glassGraphics.fillColor = new Color(255, 255, 255, 150); // Alpha 150
        this.glassGraphics.moveTo(-20, this.radius * 0.5);
        this.glassGraphics.arc(
            0,
            0,
            this.radius - 10,
            220 * Math.PI / 180,
            280 * Math.PI / 180,
            false
        );
        this.glassGraphics.lineTo(0, 0);
        this.glassGraphics.fill();
    }

    /**
     * 绘制底部弧形反光
     */
    private drawBottomReflection() {
        this.glassGraphics.fillColor = new Color(255, 255, 255, 80); // Alpha 80
        this.glassGraphics.arc(
            0,
            0,
            this.radius - 15,
            30 * Math.PI / 180,
            80 * Math.PI / 180,
            false
        );
        this.glassGraphics.strokeColor = new Color(255, 255, 255, 100);
        this.glassGraphics.lineWidth = 8;
        this.glassGraphics.stroke();
    }

    /**
     * 绘制内部堆叠的胶囊
     */
    private drawCapsules() {
        this.clearCapsules();

        const usePolygon = this.usePolygonBounds && this.polygonPoints.length >= 3;
        const useSquare = !usePolygon && this.useSquareBounds && this.squareSize.x > 0 && this.squareSize.y > 0;
        const capsulePolygonPoints = usePolygon ? this.getCapsulePolygonPoints() : this.polygonPoints;
        const bounds = this.getBounds(usePolygon ? capsulePolygonPoints : undefined);
        const spreadX = useSquare ? bounds.halfW * 0.75 : this.radius * 0.72;
        const minY = useSquare ? -bounds.halfH * 0.9 : -this.radius * 0.9;
        const rawMaxY = useSquare ? -bounds.halfH * 0.35 : -this.radius * 0.35;
        const maxY = minY + (rawMaxY - minY) * this.capsuleBottomRange;

        const placedCapsules: Array<{ pos: Vec3; radius: number }> = [];
        for (let i = 0; i < this.capsuleCount; i++) {
            const capsule = new Node(`Capsule_${i}`);
            const g = capsule.addComponent(Graphics);
            const size = 14 + Math.random() * 8;
            const polygonInset = size + 26;

            const x = (Math.random() * 2 - 1) * spreadX;
            const yBias = Math.pow(Math.random(), Math.max(1, this.capsuleBottomPower));
            const y = minY + yBias * (maxY - minY);

            const rarity = this.pickRarity();
            const baseColor = this.getRarityColor(rarity);
            const color = this.jitterColor(baseColor, 22);

            const randomPosition = usePolygon
                ? this.getRandomPointInPolygon(capsulePolygonPoints, polygonInset)
                : new Vec3(x, y, 0);
            let basePosition = usePolygon
                ? this.clampToPolygon(randomPosition, capsulePolygonPoints, polygonInset)
                : useSquare
                    ? this.clampToBounds(new Vec3(x, y, 0), bounds.halfW - size - 6, bounds.halfH - size - 6)
                    : this.clampToRadius(new Vec3(x, y, 0), this.radius - size - 6);
            const centerBias = 0.95;
            if (usePolygon) {
                const centroid = this.getPolygonCentroid(capsulePolygonPoints);
                const dx = basePosition.x - centroid.x;
                const dy = basePosition.y - centroid.y;
                const xWeight = Math.min(1, Math.abs(dx) / Math.max(1, bounds.halfW));
                const mound = (1 - xWeight) * 8;
                basePosition = new Vec3(
                    centroid.x + dx * centerBias,
                    basePosition.y + mound,
                    0
                );
                basePosition = this.clampToPolygon(basePosition, capsulePolygonPoints, polygonInset);
            } else {
                const xWeight = Math.min(1, Math.abs(basePosition.x) / Math.max(1, bounds.halfW));
                const mound = (1 - xWeight) * 6;
                basePosition = new Vec3(basePosition.x * centerBias, basePosition.y + mound, 0);
                if (useSquare) {
                    basePosition = this.clampToBounds(basePosition, bounds.halfW - size - 6, bounds.halfH - size - 6);
                } else {
                    basePosition = this.clampToRadius(basePosition, this.radius - size - 6);
                }
            }
            basePosition = this.resolveOverlap(
                basePosition,
                size,
                placedCapsules,
                usePolygon,
                capsulePolygonPoints,
                useSquare,
                bounds,
                polygonInset,
                0.5
            );
            capsule.setPosition(basePosition);
            this.drawCapsule(g, size, color);
            this.capsuleLayer.addChild(capsule);
            this.capsuleNodes.push(capsule);
            this.capsuleBases.push(basePosition.clone());
            this.capsuleRadii.push(size);
            this.capsuleRarities.push(rarity);
            placedCapsules.push({ pos: basePosition.clone(), radius: size });
        }
        this.settleCapsules();
    }

    /**
     * 绘制单个胶囊
     */
    private drawCapsule(graphics: Graphics, r: number, topColor: Color) {
        const deg = Math.PI / 180;
        const shadowColor = this.shiftColor(topColor, -55);
        const midColor = this.shiftColor(topColor, -20);

        // 上半球（亮色）
        graphics.moveTo(-r, 0);
        graphics.arc(0, 0, r, 180 * deg, 0, false);
        graphics.lineTo(-r, 0);
        graphics.fillColor = topColor;
        graphics.fill();

        // 下半球（阴影色）
        graphics.moveTo(-r, 0);
        graphics.arc(0, 0, r, 180 * deg, 0, true);
        graphics.lineTo(-r, 0);
        graphics.fillColor = shadowColor;
        graphics.fill();

        // 中间分割线
        graphics.strokeColor = new Color(0, 0, 0, 140);
        graphics.lineWidth = 1.6;
        graphics.moveTo(-r, 0);
        graphics.lineTo(r, 0);
        graphics.stroke();

        // 高光弧线
        graphics.strokeColor = new Color(255, 255, 255, 160);
        graphics.lineWidth = 2;
        graphics.arc(-r * 0.2, r * 0.2, r * 0.6, 210 * deg, 310 * deg, false);
        graphics.stroke();

        // 高光点
        graphics.fillColor = new Color(255, 255, 255, 140);
        graphics.circle(-r * 0.3, r * 0.25, r * 0.18);
        graphics.fill();

        // 阴影弧线
        graphics.strokeColor = new Color(midColor.r, midColor.g, midColor.b, 130);
        graphics.lineWidth = 3;
        graphics.arc(r * 0.2, -r * 0.2, r * 0.5, 320 * deg, 40 * deg, false);
        graphics.stroke();

        // 描边
        graphics.strokeColor = Color.BLACK;
        graphics.lineWidth = 2.2;
        graphics.circle(0, 0, r);
        graphics.stroke();
    }

    /**
     * 震动动画
     * @param onComplete - 动画完成回调
     */
    shake(onComplete?: () => void, options?: { shakeNode?: boolean; intensity?: number; duration?: number }) {
        const intensity = options?.intensity ?? GACHA_UI_CONFIG.animation.shakeIntensity;
        const duration = options?.duration ?? GACHA_UI_CONFIG.animation.shakeDuration;
        const shouldShakeNode = options?.shakeNode !== false;

        this.animateCapsulesDuringShake(duration, intensity);
        if (!shouldShakeNode) {
            tween(this.node)
                .delay(duration)
                .call(() => {
                    if (onComplete) onComplete();
                })
                .start();
            return;
        }
        const step = duration / 10;
        tween(this.node)
            .to(step, { position: new Vec3(intensity, 0, 0), angle: 5 })
            .to(step, { position: new Vec3(-intensity, 0, 0), angle: -5 })
            .to(step, { position: new Vec3(intensity * 0.9, 0, 0), angle: 4 })
            .to(step, { position: new Vec3(-intensity * 0.9, 0, 0), angle: -4 })
            .to(step, { position: new Vec3(intensity * 0.7, 0, 0), angle: 3 })
            .to(step, { position: new Vec3(-intensity * 0.7, 0, 0), angle: -3 })
            .to(step, { position: new Vec3(intensity * 0.4, 0, 0), angle: 2 })
            .to(step, { position: new Vec3(-intensity * 0.4, 0, 0), angle: -2 })
            .to(step, { position: new Vec3(intensity * 0.2, 0, 0), angle: 1 })
            .to(step, { position: new Vec3(0, 0, 0), angle: 0 })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }

    private clearCapsules() {
        this.capsuleNodes.forEach((capsule) => Tween.stopAllByTarget(capsule));
        this.capsuleNodes = [];
        this.capsuleBases = [];
        this.capsuleRadii = [];
        this.capsuleRarities = [];
        this.capsuleLayer.removeAllChildren();
    }

    private animateCapsulesDuringShake(duration: number, intensity: number) {
        const amp = Math.max(18, intensity * 0.65);
        const ampY = amp * 0.5;
        const shakeInset = 26;
        const extraInset = 6;
        const usePolygon = this.usePolygonBounds && this.polygonPoints.length >= 3;
        const useSquare = !usePolygon && this.useSquareBounds && this.squareSize.x > 0 && this.squareSize.y > 0;
        const capsulePolygonPoints = usePolygon ? this.getCapsulePolygonPoints() : this.polygonPoints;
        const bounds = this.getBounds(usePolygon ? capsulePolygonPoints : undefined);
        const polygonBounds = usePolygon ? this.getPolygonBounds(capsulePolygonPoints) : null;
        const minX = usePolygon ? polygonBounds!.minX : -bounds.halfW;
        const maxX = usePolygon ? polygonBounds!.maxX : bounds.halfW;
        this.capsuleNodes.forEach((capsule, index) => {
            const base = this.capsuleBases[index] ?? capsule.position.clone();
            const capsuleRadius = this.capsuleRadii[index] ?? 14;
            const maxR = Math.max(10, this.radius - capsuleRadius - shakeInset - extraInset);
            const maxX = Math.max(10, bounds.halfW - capsuleRadius - shakeInset - extraInset);
            const maxY = Math.max(10, bounds.halfH - capsuleRadius - shakeInset - extraInset);
            Tween.stopAllByTarget(capsule);
            capsule.setPosition(base);
            capsule.angle = 0;

            const edgeInset = capsuleRadius + shakeInset + extraInset;
            const biasOffsetX = (value: number) => {
                if (base.x < minX + edgeInset) return Math.abs(value) * 0.6;
                if (base.x > maxX - edgeInset) return -Math.abs(value) * 0.6;
                return value;
            };

            const offsetA = new Vec3(
                biasOffsetX((Math.random() * 2 - 1) * amp),
                (Math.random() * 2 - 1) * ampY,
                0
            );
            const offsetB = new Vec3(
                biasOffsetX((Math.random() * 2 - 1) * (amp * 0.8)),
                (Math.random() * 2 - 1) * (ampY * 0.8),
                0
            );
            const offsetC = new Vec3(
                biasOffsetX((Math.random() * 2 - 1) * (amp * 0.55)),
                (Math.random() * 2 - 1) * (ampY * 0.55),
                0
            );

            const posA = usePolygon
                ? this.clampToPolygon(new Vec3(base.x + offsetA.x, base.y + offsetA.y, 0), capsulePolygonPoints, capsuleRadius + shakeInset + extraInset)
                : useSquare
                    ? this.clampToBounds(new Vec3(base.x + offsetA.x, base.y + offsetA.y, 0), maxX, maxY)
                    : this.clampToRadius(new Vec3(base.x + offsetA.x, base.y + offsetA.y, 0), maxR);
            const posB = usePolygon
                ? this.clampToPolygon(new Vec3(base.x + offsetB.x, base.y + offsetB.y, 0), capsulePolygonPoints, capsuleRadius + shakeInset + extraInset)
                : useSquare
                    ? this.clampToBounds(new Vec3(base.x + offsetB.x, base.y + offsetB.y, 0), maxX, maxY)
                    : this.clampToRadius(new Vec3(base.x + offsetB.x, base.y + offsetB.y, 0), maxR);
            const posC = usePolygon
                ? this.clampToPolygon(new Vec3(base.x + offsetC.x, base.y + offsetC.y, 0), capsulePolygonPoints, capsuleRadius + shakeInset + extraInset)
                : useSquare
                    ? this.clampToBounds(new Vec3(base.x + offsetC.x, base.y + offsetC.y, 0), maxX, maxY)
                    : this.clampToRadius(new Vec3(base.x + offsetC.x, base.y + offsetC.y, 0), maxR);

            tween(capsule)
                .to(duration * 0.2, { position: posA, angle: 24, scale: new Vec3(1.08, 1.08, 1) })
                .to(duration * 0.2, { position: posB, angle: -20, scale: new Vec3(0.96, 0.96, 1) })
                .to(duration * 0.2, { position: posC, angle: 16, scale: new Vec3(1.04, 1.04, 1) })
                .to(duration * 0.4, { position: base, angle: 0, scale: new Vec3(1, 1, 1) })
                .start();
        });
    }

    private clampToRadius(position: Vec3, maxRadius: number): Vec3 {
        const len = Math.sqrt(position.x * position.x + position.y * position.y);
        if (len <= maxRadius) {
            return position;
        }
        const scale = maxRadius / len;
        return new Vec3(position.x * scale, position.y * scale, 0);
    }

    private clampToBounds(position: Vec3, maxX: number, maxY: number): Vec3 {
        return new Vec3(
            Math.max(-maxX, Math.min(maxX, position.x)),
            Math.max(-maxY, Math.min(maxY, position.y)),
            0
        );
    }

    private getBounds(polygonOverride?: Vec2[]) {
        if (this.useSquareBounds && this.squareSize.x > 0 && this.squareSize.y > 0) {
            const w = Math.max(1, this.squareSize.x);
            const h = Math.max(1, this.squareSize.y);
            return { width: w, height: h, halfW: w / 2, halfH: h / 2 };
        }
        const polygonPoints = polygonOverride ?? this.polygonPoints;
        if (this.usePolygonBounds && polygonPoints.length >= 3) {
            const bounds = this.getPolygonBounds(polygonPoints);
            return {
                width: bounds.maxX - bounds.minX,
                height: bounds.maxY - bounds.minY,
                halfW: (bounds.maxX - bounds.minX) / 2,
                halfH: (bounds.maxY - bounds.minY) / 2
            };
        }
        const r = this.radius;
        return { width: r * 2, height: r * 2, halfW: r, halfH: r };
    }

    private drawSquareGlass() {
        const bounds = this.getBounds();
        const radius = Math.min(this.squareCornerRadius, Math.min(bounds.halfW, bounds.halfH));

        this.glassGraphics.roundRect(-bounds.halfW, -bounds.halfH, bounds.width, bounds.height, radius);
        this.glassGraphics.fillColor = new Color(255, 255, 255, 50);
        this.glassGraphics.fill();

        this.glassGraphics.strokeColor = Color.BLACK;
        this.glassGraphics.lineWidth = 5;
        this.glassGraphics.stroke();

        this.glassGraphics.strokeColor = new Color(255, 255, 255, 120);
        this.glassGraphics.lineWidth = 2;
        this.glassGraphics.roundRect(
            -bounds.halfW + 10,
            -bounds.halfH + 10,
            bounds.width - 20,
            bounds.height - 20,
            Math.max(4, radius - 6)
        );
        this.glassGraphics.stroke();

        this.glassGraphics.fillColor = new Color(255, 255, 255, 70);
        this.glassGraphics.roundRect(
            -bounds.halfW + 16,
            bounds.halfH - 30,
            bounds.width - 32,
            16,
            8
        );
        this.glassGraphics.fill();

        this.glassGraphics.strokeColor = new Color(255, 255, 255, 100);
        this.glassGraphics.lineWidth = 6;
        this.glassGraphics.roundRect(
            -bounds.halfW + 18,
            -bounds.halfH + 18,
            bounds.width - 36,
            14,
            7
        );
        this.glassGraphics.stroke();
    }

    private drawPolygonGlass() {
        const points = this.polygonPoints;
        if (points.length < 3) {
            return;
        }
        const insetPoints = this.insetPolygon(points, 4);
        this.glassGraphics.moveTo(insetPoints[0].x, insetPoints[0].y);
        for (let i = 1; i < insetPoints.length; i++) {
            this.glassGraphics.lineTo(insetPoints[i].x, insetPoints[i].y);
        }
        this.glassGraphics.close();
        this.glassGraphics.fillColor = new Color(255, 255, 255, 50);
        this.glassGraphics.fill();

        this.glassGraphics.strokeColor = Color.BLACK;
        this.glassGraphics.lineWidth = 5;
        this.glassGraphics.stroke();

        const centroid = this.getPolygonCentroid(insetPoints);
        const inner = insetPoints.map((p) => new Vec2(
            centroid.x + (p.x - centroid.x) * 0.92,
            centroid.y + (p.y - centroid.y) * 0.92
        ));
        this.glassGraphics.strokeColor = new Color(255, 255, 255, 120);
        this.glassGraphics.lineWidth = 2;
        this.glassGraphics.moveTo(inner[0].x, inner[0].y);
        for (let i = 1; i < inner.length; i++) {
            this.glassGraphics.lineTo(inner[i].x, inner[i].y);
        }
        this.glassGraphics.close();
        this.glassGraphics.stroke();

        // Keep polygon glass clean to avoid overflow beyond guide
    }

    private getRandomPointInPolygon(points: Vec2[], inset: number): Vec3 {
        const bounds = this.getPolygonBounds(points);
        const minX = bounds.minX + inset;
        const maxX = bounds.maxX - inset;
        const minY = bounds.minY + inset;
        const maxY = bounds.maxY - inset;
        const cappedMaxY = minY + Math.max(1, (maxY - minY) * Math.min(1, Math.max(0.1, this.capsuleBottomRange)));
        for (let i = 0; i < 120; i++) {
            const x = minX + Math.random() * Math.max(1, maxX - minX);
            const yBias = Math.pow(Math.random(), Math.max(1, this.capsuleBottomPower));
            const y = minY + yBias * Math.max(1, cappedMaxY - minY);
            const candidate = new Vec2(x, y);
            if (this.pointInPolygon(candidate, points)) {
                return new Vec3(candidate.x, candidate.y, 0);
            }
        }
        const anchor = this.getPolygonBottomAnchor(points, inset);
        return new Vec3(anchor.x, anchor.y, 0);
    }

    private clampToPolygon(position: Vec3, points: Vec2[], inset: number): Vec3 {
        const point2 = new Vec2(position.x, position.y);
        if (this.pointInPolygon(point2, points)) {
            return position;
        }
        let closest = points[0];
        let minDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            const proj = this.closestPointOnSegment(point2, a, b);
            const dx = point2.x - proj.x;
            const dy = point2.y - proj.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                closest = proj;
            }
        }
        const centroid = this.getPolygonCentroid(points);
        const dirX = centroid.x - closest.x;
        const dirY = centroid.y - closest.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 0.001) {
            const nx = dirX / len;
            const ny = dirY / len;
            return new Vec3(closest.x + nx * inset, closest.y + ny * inset, 0);
        }
        return new Vec3(closest.x, closest.y, 0);
    }

    private pointInPolygon(point: Vec2, points: Vec2[]): boolean {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x;
            const yi = points[i].y;
            const xj = points[j].x;
            const yj = points[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.00001) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }

    private getPolygonBounds(points: Vec2[]) {
        let minX = points[0].x;
        let maxX = points[0].x;
        let minY = points[0].y;
        let maxY = points[0].y;
        points.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        return { minX, maxX, minY, maxY };
    }

    private getPolygonCentroid(points: Vec2[]): Vec2 {
        let x = 0;
        let y = 0;
        points.forEach((p) => {
            x += p.x;
            y += p.y;
        });
        return new Vec2(x / points.length, y / points.length);
    }

    private getPolygonBottomAnchor(points: Vec2[], inset: number): Vec2 {
        const bounds = this.getPolygonBounds(points);
        const targetY = bounds.minY + inset;
        const candidates = points.filter((p) => Math.abs(p.y - bounds.minY) < 1.5 * inset);
        const avgX = candidates.length
            ? candidates.reduce((sum, p) => sum + p.x, 0) / candidates.length
            : (bounds.minX + bounds.maxX) / 2;
        return new Vec2(avgX, targetY);
    }

    private insetPolygon(points: Vec2[], inset: number): Vec2[] {
        const centroid = this.getPolygonCentroid(points);
        return points.map((p) => {
            const dx = centroid.x - p.x;
            const dy = centroid.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len <= inset) {
                return new Vec2(p.x, p.y);
            }
            const nx = dx / len;
            const ny = dy / len;
            return new Vec2(p.x + nx * inset, p.y + ny * inset);
        });
    }

    private getCapsulePolygonPoints(): Vec2[] {
        if (!this.usePolygonBounds || this.polygonPoints.length < 3) {
            return this.polygonPoints;
        }
        const offset = this.capsuleLayerOffset ?? new Vec3(0, 0, 0);
        const scale = this.capsuleLayerScale ?? new Vec2(1, 1);
        const sx = scale.x || 1;
        const sy = scale.y || 1;
        return this.polygonPoints.map((p) => new Vec2(
            (p.x - offset.x) / sx,
            (p.y - offset.y) / sy
        ));
    }

    private resolveOverlap(
        position: Vec3,
        radius: number,
        placed: Array<{ pos: Vec3; radius: number }>,
        usePolygon: boolean,
        polygonPoints: Vec2[],
        useSquare: boolean,
        bounds: { halfW: number; halfH: number },
        inset: number,
        maxOverlapRatio: number
    ): Vec3 {
        if (!placed.length) return position;
        let resolved = position.clone();
        for (let pass = 0; pass < 6; pass++) {
            let adjusted = false;
            for (const item of placed) {
        const minDist = (radius + item.radius) * Math.max(0.45, 1 - maxOverlapRatio);
                const dx = resolved.x - item.pos.x;
                const dy = resolved.y - item.pos.y;
                if (dx * dx + dy * dy < minDist * minDist) {
                    resolved.y = item.pos.y + minDist;
                    adjusted = true;
                }
            }
            if (!adjusted) break;
            if (usePolygon) {
                resolved = this.clampToPolygon(resolved, polygonPoints, radius + inset);
            } else if (useSquare) {
                resolved = this.clampToBounds(resolved, bounds.halfW - radius - inset, bounds.halfH - radius - inset);
            } else {
                resolved = this.clampToRadius(resolved, this.radius - radius - inset);
            }
        }
        return resolved;
    }

    private applyLayerTransforms() {
        if (this.glassLayer) {
            this.glassLayer.setPosition(this.glassLayerOffset);
            this.glassLayer.setScale(new Vec3(this.glassLayerScale.x, this.glassLayerScale.y, 1));
        }
        if (this.capsuleLayer) {
            this.capsuleLayer.setPosition(this.capsuleLayerOffset);
            this.capsuleLayer.setScale(new Vec3(this.capsuleLayerScale.x, this.capsuleLayerScale.y, 1));
        }
    }

    settleCapsules() {
        if (!this.capsuleNodes.length) return;
        const usePolygon = this.usePolygonBounds && this.polygonPoints.length >= 3;
        const useSquare = !usePolygon && this.useSquareBounds && this.squareSize.x > 0 && this.squareSize.y > 0;
        const capsulePolygonPoints = usePolygon ? this.getCapsulePolygonPoints() : this.polygonPoints;
        const bounds = usePolygon
            ? this.getPolygonBounds(capsulePolygonPoints)
            : useSquare
                ? { minX: -this.squareSize.x / 2, maxX: this.squareSize.x / 2, minY: -this.squareSize.y / 2, maxY: this.squareSize.y / 2 }
                : { minX: -this.radius, maxX: this.radius, minY: -this.radius, maxY: this.radius };
        const inset = 22;
        const minY = bounds.minY + inset;
        const centroid = usePolygon ? this.getPolygonCentroid(capsulePolygonPoints) : new Vec2(0, 0);
        const sorted = this.capsuleNodes.map((node, index) => ({
            node,
            index,
            radius: this.capsuleRadii[index] ?? 12,
            base: this.capsuleBases[index] ?? node.position.clone()
        })).sort((a, b) => a.base.y - b.base.y);

        const placedCapsules: Array<{ pos: Vec3; radius: number }> = [];
        sorted.forEach((item, order) => {
            const basePos = item.base;
            let target = new Vec3(basePos.x, minY, 0);
            if (usePolygon) {
                target = this.clampToPolygon(target, capsulePolygonPoints, item.radius + inset);
            } else if (useSquare) {
                target = this.clampToBounds(target, (this.squareSize.x / 2) - item.radius - inset, (this.squareSize.y / 2) - item.radius - inset);
            } else {
                target = this.clampToRadius(target, this.radius - item.radius - inset);
            }
            const halfW = (bounds.maxX - bounds.minX) / 2;
            const halfH = (bounds.maxY - bounds.minY) / 2;
            target = this.resolveOverlap(
                target,
                item.radius,
                placedCapsules,
                usePolygon,
                capsulePolygonPoints,
                useSquare,
                { halfW, halfH },
                inset,
                0.5
            );
            item.node.setPosition(target);
            this.capsuleBases[item.index] = target.clone();
            placedCapsules.push({ pos: target.clone(), radius: item.radius });
        });
    }

    private closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const abLenSq = abx * abx + aby * aby || 1;
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
        return new Vec2(a.x + abx * t, a.y + aby * t);
    }

    consumeCapsule(forcedRarity?: GachaRarity) {
        if (this.capsuleNodes.length === 0) {
            return 0;
        }

        let targetIndex = 0;
        let lowestY = Number.POSITIVE_INFINITY;
        this.capsuleNodes.forEach((capsule, index) => {
            if (capsule.position.y < lowestY) {
                lowestY = capsule.position.y;
                targetIndex = index;
            }
        });

        const capsule = this.capsuleNodes.splice(targetIndex, 1)[0];
        this.capsuleBases.splice(targetIndex, 1);
        const capsuleRadius = this.capsuleRadii.splice(targetIndex, 1)[0] ?? 12;
        const originalRarity = this.capsuleRarities.splice(targetIndex, 1)[0] ?? GachaRarity.N;
        Tween.stopAllByTarget(capsule);

        const base = capsule.position.clone();
        const dropOffset = new Vec3(
            base.x + (Math.random() * 2 - 1) * 10,
            base.y - 26 - Math.random() * 12,
            0
        );

        if (forcedRarity) {
            const g = capsule.getComponent(Graphics);
            if (g) {
                g.clear();
                this.drawCapsule(g, capsuleRadius, this.getRarityColor(forcedRarity));
            }
        } else if (originalRarity !== GachaRarity.N) {
            const g = capsule.getComponent(Graphics);
            if (g) {
                g.clear();
                this.drawCapsule(g, capsuleRadius, this.getRarityColor(originalRarity));
            }
        }

        tween(capsule)
            .to(0.12, { position: dropOffset, angle: 28, scale: new Vec3(0.9, 0.9, 1) }, { easing: 'sineIn' })
            .to(0.18, { scale: new Vec3(0, 0, 1), angle: 60 }, { easing: 'backIn' })
            .call(() => capsule.destroy())
            .start();

        return this.capsuleNodes.length;
    }

    resetCapsules(count?: number) {
        this.capsuleCount = count ?? this.initialCapsuleCount;
        this.drawCapsules();
        this.settleCapsules();
        this.capsuleNodes.forEach((capsule) => {
            capsule.scale = new Vec3(0, 0, 1);
            tween(capsule)
                .to(0.2 + Math.random() * 0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        });
    }

    emptyCapsules() {
        this.clearCapsules();
    }

    getRemainingCapsules(): number {
        return this.capsuleNodes.length;
    }

    private pickRarity(): GachaRarity {
        const total = this.rarityWeights.N + this.rarityWeights.R + this.rarityWeights.SR + this.rarityWeights.SSR + this.rarityWeights.UR;
        const roll = Math.random() * total;
        let acc = this.rarityWeights.UR;
        if (roll < acc) return GachaRarity.UR;
        acc += this.rarityWeights.SSR;
        if (roll < acc) return GachaRarity.SSR;
        acc += this.rarityWeights.SR;
        if (roll < acc) return GachaRarity.SR;
        acc += this.rarityWeights.R;
        if (roll < acc) return GachaRarity.R;
        return GachaRarity.N;
    }

    private getRarityColor(rarity: GachaRarity): Color {
        switch (rarity) {
            case GachaRarity.R:
                return new Color(GACHA_CONFIG.ui.colors.rarityR.r, GACHA_CONFIG.ui.colors.rarityR.g, GACHA_CONFIG.ui.colors.rarityR.b, 255);
            case GachaRarity.SR:
                return new Color(GACHA_CONFIG.ui.colors.raritySR.r, GACHA_CONFIG.ui.colors.raritySR.g, GACHA_CONFIG.ui.colors.raritySR.b, 255);
            case GachaRarity.SSR:
                return new Color(GACHA_CONFIG.ui.colors.raritySSR.r, GACHA_CONFIG.ui.colors.raritySSR.g, GACHA_CONFIG.ui.colors.raritySSR.b, 255);
            case GachaRarity.UR:
                return new Color(GACHA_CONFIG.ui.colors.rarityUR.r, GACHA_CONFIG.ui.colors.rarityUR.g, GACHA_CONFIG.ui.colors.rarityUR.b, 255);
            case GachaRarity.N:
            default:
                return new Color(GACHA_CONFIG.ui.colors.rarityN.r, GACHA_CONFIG.ui.colors.rarityN.g, GACHA_CONFIG.ui.colors.rarityN.b, 255);
        }
    }

    private jitterColor(color: Color, amount: number): Color {
        return new Color(
            this.clampChannel(color.r + (Math.random() * 2 - 1) * amount),
            this.clampChannel(color.g + (Math.random() * 2 - 1) * amount),
            this.clampChannel(color.b + (Math.random() * 2 - 1) * amount),
            255
        );
    }

    private shiftColor(color: Color, delta: number): Color {
        return new Color(
            this.clampChannel(color.r + delta),
            this.clampChannel(color.g + delta),
            this.clampChannel(color.b + delta),
            255
        );
    }

    private clampChannel(value: number): number {
        return Math.min(255, Math.max(0, Math.round(value)));
    }
}
