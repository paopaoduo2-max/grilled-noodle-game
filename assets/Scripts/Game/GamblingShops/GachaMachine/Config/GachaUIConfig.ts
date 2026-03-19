import { Color } from 'cc';

/**
 * 赛璐璐风格三层着色颜色接口
 */
export interface CelShadingColors {
    baseColor: Color;           // 基础色 (RGB, 255)
    shadowColor: Color;         // 阴影色 (baseColor * 0.6, 255)
    highlightColor: Color;      // 高光色 (白色混合, 150-200透明度)
    outlineColor: Color;        // 描边色 (纯黑, 255)
}

/**
 * 扭蛋机部件尺寸配置
 */
export interface GachaComponentDimensions {
    width: number;
    height: number;
    radius?: number;
}

/**
 * 扭蛋机部件完整配置
 */
export interface GachaComponentConfig {
    dimensions: GachaComponentDimensions;
    colors: CelShadingColors;
    outlineWidth: number;       // 粗描边 4-5px
    shadowOffset: { x: number; y: number };  // 右下偏移
}

/**
 * 赛璐璐风格扭蛋机UI配置
 */
export const GACHA_UI_CONFIG = {
    // Tier主题配置
    themes: {
        normal: {
            name: '普通机',
            baseColor: '#00CED1', // Cyan
            globe: {
                radius: 120,
                capsuleCount: 22,
                colors: {
                    baseColor: new Color(200, 220, 255, 200),     // 浅蓝玻璃
                    shadowColor: new Color(120, 132, 153, 255),   // 深蓝阴影
                    highlightColor: new Color(255, 255, 255, 180), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            base: {
                dimensions: { width: 190, height: 140 },
                outlineWidth: 4,
                shadowOffset: { x: 6, y: -6 },
                colors: {
                    baseColor: new Color(100, 149, 237, 255),     // 矢车菊蓝
                    shadowColor: new Color(60, 89, 142, 255),      // 深蓝阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            lever: {
                length: 70,
                thickness: 13,
                ballRadius: 12,
                colors: {
                    baseColor: new Color(192, 192, 192, 255),     // 银色
                    shadowColor: new Color(115, 115, 115, 255),    // 深灰阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                },
                ballColors: {
                    baseColor: new Color(255, 50, 50, 255),        // 红色球头
                    shadowColor: new Color(180, 0, 0, 255),        // 深红阴影
                    highlightColor: new Color(255, 200, 200, 150), // 浅红高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            dispenser: {
                width: 60,
                stripeCount: 5
            }
        },
        premium: {
            name: '高级机',
            baseColor: '#FF69B4', // Hot Pink
            globe: {
                radius: 120,
                capsuleCount: 22,
                colors: {
                    baseColor: new Color(255, 182, 193, 200),     // 浅粉玻璃
                    shadowColor: new Color(153, 109, 116, 255),   // 深粉阴影
                    highlightColor: new Color(255, 255, 255, 180), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            base: {
                dimensions: { width: 190, height: 140 },
                outlineWidth: 4,
                shadowOffset: { x: 6, y: -6 },
                colors: {
                    baseColor: new Color(255, 105, 180, 255),     // 亮粉色
                    shadowColor: new Color(153, 63, 108, 255),     // 深粉阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            lever: {
                length: 70,
                thickness: 13,
                ballRadius: 12,
                colors: {
                    baseColor: new Color(192, 192, 192, 255),     // 银色
                    shadowColor: new Color(115, 115, 115, 255),    // 深灰阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                },
                ballColors: {
                    baseColor: new Color(255, 50, 50, 255),        // 红色球头
                    shadowColor: new Color(180, 0, 0, 255),        // 深红阴影
                    highlightColor: new Color(255, 200, 200, 150), // 浅红高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            dispenser: {
                width: 60,
                stripeCount: 5
            }
        },
        luxury: {
            name: '豪华机',
            baseColor: '#FFD700', // Gold
            globe: {
                radius: 120,
                capsuleCount: 22,
                colors: {
                    baseColor: new Color(255, 255, 200, 200),     // 浅金玻璃
                    shadowColor: new Color(153, 153, 120, 255),   // 深金阴影
                    highlightColor: new Color(255, 255, 255, 180), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            base: {
                dimensions: { width: 190, height: 140 },
                outlineWidth: 4,
                shadowOffset: { x: 6, y: -6 },
                colors: {
                    baseColor: new Color(255, 215, 0, 255),       // 金色
                    shadowColor: new Color(153, 129, 0, 255),      // 深金阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            lever: {
                length: 70,
                thickness: 13,
                ballRadius: 12,
                colors: {
                    baseColor: new Color(192, 192, 192, 255),     // 银色
                    shadowColor: new Color(115, 115, 115, 255),    // 深灰阴影
                    highlightColor: new Color(255, 255, 255, 150), // 白色高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                },
                ballColors: {
                    baseColor: new Color(255, 50, 50, 255),        // 红色球头
                    shadowColor: new Color(180, 0, 0, 255),        // 深红阴影
                    highlightColor: new Color(255, 200, 200, 150), // 浅红高光
                    outlineColor: new Color(0, 0, 0, 255)          // 纯黑描边
                }
            },
            dispenser: {
                width: 60,
                stripeCount: 5
            }
        }
    },

    // 动画参数
    animation: {
        shakeIntensity: 34,        // 震动强度（像素）
        shakeDuration: 1.2,        // 震动时长（秒）
        dropDuration: 0.8,         // 掉落时长（秒）
        leverPullDuration: 0.4,    // 摇杆拉动时长（秒）
        capsuleBounceBounciness: 0.4, // 胶囊弹跳弹性
    },

    // 胶囊颜色配置
    capsuleColors: ['#FF5E5E', '#5E7BFF', '#5EFF5E', '#FFFF5E', '#FF5EFF', '#FF9F5E', '#5EFFF0', '#C35EFF'],

    // 粒子配置
    particles: {
        countPerRarity: {
            N: 8,
            R: 12,
            SR: 20,
            SSR: 30,
            UR: 40
        },
        maxSize: 16,
        minSize: 8,
        burstDistance: 100,
        burstDuration: 0.6
    }
};
