import { Node, Vec3, Color, tween, Tween } from 'cc';

/**
 * 🍳 烹饪工具函数
 * 通用动画、计算、辅助方法
 */
export class CookingUtils {
    
    // ==================== 动画效果 ====================
    
    /**
     * 弹跳出现动画
     */
    static bounceIn(node: Node, duration: number = 0.3, scale: number = 1): Tween<Node> {
        node.setScale(0, 0, 1);
        return tween(node)
            .to(duration, { scale: new Vec3(scale, scale, 1) }, { easing: 'backOut' });
    }
    
    /**
     * 弹跳消失动画
     */
    static bounceOut(node: Node, duration: number = 0.2): Tween<Node> {
        return tween(node)
            .to(duration, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' });
    }
    
    /**
     * 淡入动画
     */
    static fadeIn(node: Node, duration: number = 0.3): Tween<Node> {
        node.setScale(0.8, 0.8, 1);
        return tween(node)
            .to(duration, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' });
    }
    
    /**
     * 抖动动画
     */
    static shake(node: Node, intensity: number = 5, duration: number = 0.5): Tween<Node> {
        const originalPos = node.position.clone();
        return tween(node)
            .to(0.05, { position: new Vec3(originalPos.x + intensity, originalPos.y, originalPos.z) })
            .to(0.05, { position: new Vec3(originalPos.x - intensity, originalPos.y, originalPos.z) })
            .to(0.05, { position: new Vec3(originalPos.x + intensity * 0.5, originalPos.y, originalPos.z) })
            .to(0.05, { position: new Vec3(originalPos.x - intensity * 0.5, originalPos.y, originalPos.z) })
            .to(0.05, { position: originalPos });
    }
    
    /**
     * 浮动动画（上下漂浮）
     */
    static float(node: Node, amplitude: number = 10, duration: number = 1): Tween<Node> {
        const originalY = node.position.y;
        return tween(node)
            .to(duration / 2, { position: new Vec3(node.position.x, originalY + amplitude, node.position.z) }, { easing: 'sineInOut' })
            .to(duration / 2, { position: new Vec3(node.position.x, originalY, node.position.z) }, { easing: 'sineInOut' })
            .union()
            .repeatForever();
    }
    
    /**
     * 脉冲动画（大小变化）
     */
    static pulse(node: Node, scale: number = 1.1, duration: number = 0.5): Tween<Node> {
        return tween(node)
            .to(duration / 2, { scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' })
            .to(duration / 2, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever();
    }
    
    // ==================== 颜色工具 ====================
    
    /**
     * 根据进度获取颜色（绿-黄-红）
     */
    static getProgressColor(progress: number): Color {
        if (progress < 0.5) {
            // 绿色到黄色
            const t = progress * 2;
            return new Color(
                Math.floor(255 * t),
                255,
                0,
                255
            );
        } else {
            // 黄色到红色
            const t = (progress - 0.5) * 2;
            return new Color(
                255,
                Math.floor(255 * (1 - t)),
                0,
                255
            );
        }
    }
    
    /**
     * 烹饪状态颜色
     */
    static getCookingColor(cookProgress: number, maxTime: number): Color {
        const ratio = cookProgress / maxTime;
        
        if (ratio < 0.6) {
            // 正常烹饪 - 浅棕色
            const brown = Math.floor(180 + ratio * 50);
            return new Color(brown, Math.floor(brown * 0.7), Math.floor(brown * 0.5), 255);
        } else if (ratio < 0.8) {
            // 快焦了 - 深棕色
            return new Color(139, 90, 43, 255);
        } else {
            // 烤焦了 - 黑色
            const black = Math.floor(50 + (1 - ratio) * 50);
            return new Color(black, black, black, 255);
        }
    }
    
    // ==================== 计算工具 ====================
    
    /**
     * 计算两点距离
     */
    static distance(p1: Vec3, p2: Vec3): number {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + 
            Math.pow(p2.y - p1.y, 2)
        );
    }
    
    /**
     * 检查点是否在矩形内
     */
    static isPointInRect(point: Vec3, center: Vec3, width: number, height: number): boolean {
        return Math.abs(point.x - center.x) <= width / 2 &&
               Math.abs(point.y - center.y) <= height / 2;
    }
    
    /**
     * 限制值在范围内
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * 线性插值
     */
    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * this.clamp(t, 0, 1);
    }
    
    /**
     * 随机范围
     */
    static randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * 随机整数范围
     */
    static randomInt(min: number, max: number): number {
        return Math.floor(this.randomRange(min, max + 1));
    }
    
    /**
     * 随机数组元素
     */
    static randomElement<T>(array: T[]): T | null {
        if (array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * 打乱数组
     */
    static shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    
    // ==================== 时间工具 ====================
    
    /**
     * 格式化时间 (秒 -> MM:SS)
     */
    static formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${this.pad(mins, 2)}:${this.pad(secs, 2)}`;
    }
    
    /**
     * 格式化游戏时间 (HH:MM)
     */
    static formatGameTime(hours: number, minutes: number): string {
        return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}`;
    }
    
    /**
     * 数字补零
     */
    private static pad(num: number, length: number): string {
        let str = num.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }
    
    // ==================== 金额工具 ====================
    
    /**
     * 格式化金额
     */
    static formatMoney(amount: number): string {
        if (amount >= 10000) {
            return `¥${(amount / 10000).toFixed(1)}万`;
        }
        return `¥${amount}`;
    }
    
    /**
     * 格式化带符号的金额变化
     */
    static formatMoneyChange(amount: number): string {
        if (amount >= 0) {
            return `+¥${amount}`;
        }
        return `-¥${Math.abs(amount)}`;
    }
}
