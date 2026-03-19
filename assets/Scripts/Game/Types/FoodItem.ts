/**
 * FoodItem.ts
 * 面饼对象类
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Vec3, Color, Sprite, Label, assetManager, SpriteFrame } from 'cc';
import { IngredientType } from '../../Data/GameConfig';
import { DoughState } from './CookingTypes';

/**
 * 面饼对象
 */
export class FoodItem {
    node: Node;
    state: DoughState = DoughState.NEED_OIL;  // 初始状态：需要喷油
    cookTime: number = 0;
    addedIngredients: IngredientType[] = [];
    eggCount: number = 0;          // 鸡蛋数量（最多2个）
    maxEggCount: number = 2;       // 最大鸡蛋数量（可以加2个）
    maxCookTime: number = 15;      // 总共15秒会烤焦
    burnWarningThreshold: number = 0.6;
    almostBurntThreshold: number = 0.8;
    stateTimings = {
        raw: 3,        // 生面饼3秒
        eggWait: 4,    // 等鸡蛋熟4秒
        sausageWait: 3, // 等香肠熟3秒
        finalWait: 5   // 最后阶段5秒
    };
    currentStateTime: number = 0;
    isFlipped: boolean = false;    // 是否已翻面
    oilDropNode: Node = null;      // 油滴UI节点
    hasOil: boolean = false;       // 是否已喷油
    hasSauce: boolean = false;     // 是否已刷酱料（翻面后必须先刷酱料）
    waterSprayedInState: string = '';  // 当前阶段是否已喷水（记录喷水时的状态）
    totalWaterSprays: number = 0;      // 总喷水次数
    waterBonusChance: number = 0;      // 喷水带来的特别好评几率加成

    constructor(node: Node, maxCookTime: number = 15, burnWarning: number = 0.6, almostBurnt: number = 0.8) {
        this.node = node;
        this.maxCookTime = maxCookTime;
        this.burnWarningThreshold = burnWarning;
        this.almostBurntThreshold = almostBurnt;
    }

    // 抖动动画相关
    private shakeTime: number = 0;
    private isShaking: boolean = false;
    private originalPos: Vec3 = new Vec3();
    
    // 🔥 拖动状态（拖动时暂停抖动）
    public isDragging: boolean = false;

    update(dt: number) {
        // 🔥 DONE 和 BURNT 状态不再计时
        if (this.state !== DoughState.DONE && this.state !== DoughState.BURNT) {
            this.cookTime += dt;
            this.currentStateTime += dt;
        }

        // 更新颜色表示烹饪状态
        this.updateVisualState();
        
        // 煎炸抖动动画（只在有油且正在烹饪时抖动）
        this.updateShakeAnimation(dt);

        // 检查是否烤焦（喷油/喷水后会延长烧焦时间，但仍然可以烧焦）
        // 喷油后最大烹饪时间翻倍，每次喷水额外增加30%
        // 🔥 只有未完成时才检查烧焦
        if (this.state !== DoughState.DONE) {
            let effectiveMaxTime = this.maxCookTime;
            if (this.hasOil) effectiveMaxTime *= 2;       // 喷油翻倍
            // 每次喷水增加30%时间（累计）
            effectiveMaxTime *= (1 + this.totalWaterSprays * 0.3);
            if (this.cookTime > effectiveMaxTime) {
                this.state = DoughState.BURNT;
            }
        }
    }
    
    /**
     * 煎炸抖动动画
     */
    private updateShakeAnimation(dt: number) {
        const bgNode = this.node.parent;
        if (!bgNode) return;
        
        // 🔥 拖动时暂停抖动
        if (this.isDragging) {
            if (this.isShaking) {
                this.isShaking = false;
            }
            return;
        }
        
        // 只在有油且未完成/未烧焦时抖动
        const shouldShake = this.hasOil && 
            this.state !== DoughState.DONE && 
            this.state !== DoughState.BURNT &&
            this.state !== DoughState.ROLLED &&
            this.state !== DoughState.CUT;
        
        if (shouldShake) {
            if (!this.isShaking) {
                // 开始抖动，记录原始位置
                this.isShaking = true;
                this.originalPos.set(bgNode.position);
            }
            
            this.shakeTime += dt;
            
            // 使用正弦波产生微小抖动效果
            const shakeIntensity = 0.5;  // 抖动幅度（像素）- 非常微小
            const shakeSpeed = 8;         // 抖动速度 - 较慢，更自然
            
            const offsetX = Math.sin(this.shakeTime * shakeSpeed) * shakeIntensity;
            const offsetY = Math.sin(this.shakeTime * shakeSpeed * 0.7 + 1.5) * shakeIntensity * 0.6;
            
            bgNode.setPosition(
                this.originalPos.x + offsetX,
                this.originalPos.y + offsetY,
                this.originalPos.z
            );
        } else if (this.isShaking) {
            // 停止抖动，恢复原始位置
            this.isShaking = false;
            bgNode.setPosition(this.originalPos);
        }
    }

    // 状态对应的图片UUID映射（按位置索引：0=左, 1=中, 2=右）
    // 格式: { 状态: [左位置UUID, 中位置UUID, 右位置UUID] }
    private static stateImageUUIDs: { [key: string]: string[] } = {
        [DoughState.NEED_OIL]: ['f0e8d822-dbb9-4948-95ea-d165fbb90156', '7de01c42-cff6-4f50-a8a8-69bda25227a9', '60ab6f57-08e8-4c04-9e23-7e9ee375e4b3'],  // food_dough_raw_left, _center, _right
        [DoughState.RAW]: ['f0e8d822-dbb9-4948-95ea-d165fbb90156', '7de01c42-cff6-4f50-a8a8-69bda25227a9', '60ab6f57-08e8-4c04-9e23-7e9ee375e4b3'],       // 同上
        [DoughState.EGG_ADDED]: ['', '', ''],   // food_dough_egg (待添加) - 根据eggCount动态选择
        [DoughState.FLIPPED]: ['', '', ''],     // food_dough_flipped (待添加)
        [DoughState.ROLLED]: ['', '', ''],      // food_dough_rolled (待添加)
        [DoughState.CUT]: ['', '', ''],         // food_dough_cut (待添加)
        [DoughState.DONE]: ['', '', ''],        // food_dough_done (待添加)
        [DoughState.BURNT]: ['', '', '']        // food_dough_burnt (待添加)
    };
    
    // 加蛋状态的图片UUID（按鸡蛋数量：1蛋、2蛋）
    // 格式: { 蛋数: [左位置UUID, 中位置UUID, 右位置UUID] }
    private static eggImageUUIDs: { [key: number]: string[] } = {
        1: ['a4d2c540-5f5d-4ae9-b350-553da04047af', '4d6450ef-ac23-48c6-8924-eb841b8b4b80', '4cd23ba5-c148-4fd3-84bd-c5047189e801'],  // food_dough_egg1_left, _center, _right
        2: ['63741dca-58e0-469f-95fa-20b431190be4', 'd3ec0f83-2695-4322-a50b-aa07000d9621', 'dcfe1e5a-32f9-4771-9711-0fe653e128d2']   // food_dough_egg2_left, _center, _right
    };
    
    // 翻面后的图片UUID（不区分鸡蛋数量，统一用一套图）
    // 格式: [左位置UUID, 中位置UUID, 右位置UUID]
    private static flippedImageUUIDs: string[] = ['10dddbf7-2e15-4c3d-9fb0-8bf8113c7e7f', 'dd92625b-ec71-4545-8f2c-81850ed199a4', '969ef710-94ef-482b-9248-81c79d737657'];  // food_dough_flipped_left, _center, _right
    
    // 🌯 卷起动画图片UUID（3帧动画）
    // 格式: { 帧数: [左位置UUID, 中位置UUID, 右位置UUID] }，右侧用左侧翻转
    public static rollImageUUIDs: { [key: number]: string[] } = {
        1: ['f907f44a-63ba-4453-9df9-b9bcbc5cf726@f9941', '41c00147-fbdb-4e75-8b74-237055be5758@f9941', 'f907f44a-63ba-4453-9df9-b9bcbc5cf726@f9941'],  // roll_left_1, roll_center_1, roll_left_1(翻转)
        2: ['f947b75b-dadc-4fc3-b344-8213ebe0bbc7@f9941', '4685fb4d-9fa7-4cfb-8b2f-1ddcd63509bd@f9941', 'f947b75b-dadc-4fc3-b344-8213ebe0bbc7@f9941'],  // roll_left_2, roll_center_2, roll_left_2(翻转)
        3: ['31861f97-02f2-4dfa-8f46-bd1d77b49a54@f9941', 'c983e167-52f9-4e2b-9fc5-9555b3995bfa@f9941', '31861f97-02f2-4dfa-8f46-bd1d77b49a54@f9941']   // roll_left_3, roll_center_3, roll_left_3(翻转)
    };
    
    // 🌯 卷好后酱料覆盖图片UUID
    // 格式: [左位置UUID, 中位置UUID, 右位置UUID]，右侧用左侧翻转
    public static rollSauceImageUUIDs: string[] = ['e7987ed5-1d11-4bf7-8b24-129bbbe9f924@f9941', '804ec1a7-c6c9-4db3-a2d0-8268de7ac196@f9941', 'e7987ed5-1d11-4bf7-8b24-129bbbe9f924@f9941'];  // roll_left_sauced, roll_center_sauced, roll_left_sauced(翻转)
    
    // 🔪 切好的卷饼图片UUID
    // 格式: [左位置UUID, 中位置UUID, 右位置UUID]，右侧用左侧翻转
    public static cutImageUUIDs: string[] = ['a488cb95-ea45-44af-be2b-f91677147a62@f9941', 'dc43e07a-5ebe-4b75-a1e6-44c00493c4fe@f9941', 'a488cb95-ea45-44af-be2b-f91677147a62@f9941'];  // roll_lift_cut, roll_cut, roll_lift_cut(翻转)
    
    // 🌯 卷起状态相关标记
    public hasRollSauce: boolean = false;  // 卷好后是否已刷酱
    
    // 🔪 切割相关
    public cutCount: number = 0;  // 切割次数（0-3），切3刀完成
    public static readonly MAX_CUT_COUNT: number = 3;  // 最大切割次数
    
    private lastLoadedState: DoughState | null = null;
    positionIndex: number = 0;  // 位置索引（0=左, 1=中, 2=右）

    private lastLoadedEggCount: number = 0;  // 上次加载的鸡蛋数量
    private pendingLoadKey: string | null = null;
    private lastLoadFailKey: string | null = null;
    private lastLoadFailAt: number = 0;

    private static toSpriteFrameUUID(uuid: string): string {
        if (!uuid) return '';
        return uuid.includes('@') ? uuid : `${uuid}@f9941`;
    }

    updateVisualState() {
        // 更新背景节点的Sprite颜色
        const bgNode = this.node.parent;
        if (!bgNode) return;
        
        const sprite = bgNode.getComponent(Sprite);
        const label = this.node.getComponent(Label);
        if (!sprite || !label) return;

        // 🌯 ROLLED、CUT、DONE 状态由动画控制，不在这里更新（除非烧焦）
        if (this.state === DoughState.ROLLED || this.state === DoughState.CUT || this.state === DoughState.DONE) {
            return;
        }
        
        // 🔥 BURNT 状态特殊处理：更新主图片颜色和酱料层颜色
        if (this.state === DoughState.BURNT) {
            // 更新主图片颜色为焦黑色
            sprite.color = new Color(50, 30, 10, 255);
            
            // 🔥 同时更新 _RollSauceLayer（卷好后刷的酱）颜色为焦黑色
            const rollSauceLayer = bgNode.getChildByName('_RollSauceLayer');
            if (rollSauceLayer) {
                const rollSauceSprite = rollSauceLayer.getComponent(Sprite);
                if (rollSauceSprite) {
                    rollSauceSprite.color = new Color(50, 30, 10, 255);
                }
            }
            
            // 显示焦了的文字
            const label = this.node.getComponent(Label);
            if (label) {
                label.string = '🍞\n❌焦了';
                label.fontSize = 50;
            }
            return;
        }

        // 根据时间改变背景颜色
        const progress = this.cookTime / this.maxCookTime;
        
        const posIdx = Math.min(Math.max(this.positionIndex, 0), 2);  // 确保在0-2范围内
        
        // 特殊处理：EGG_ADDED 和 FLIPPED 状态根据鸡蛋数量选择图片
        let imageUUID = '';
        let needReload = false;
        
        if (this.state === DoughState.EGG_ADDED && this.eggCount > 0) {
            // 加蛋状态：根据鸡蛋数量选择图片
            const eggUUIDs = FoodItem.eggImageUUIDs[this.eggCount];
            imageUUID = eggUUIDs ? eggUUIDs[posIdx] : '';
            // 鸡蛋数量变化时需要重新加载
            needReload = this.lastLoadedState !== this.state || this.lastLoadedEggCount !== this.eggCount;
            if (needReload) {
                this.lastLoadedEggCount = this.eggCount;
            }
        } else if (this.state === DoughState.FLIPPED) {
            // 翻面状态：统一用一套图（不区分鸡蛋数量）
            imageUUID = FoodItem.flippedImageUUIDs[posIdx] || '';
            needReload = this.lastLoadedState !== this.state;
        } else {
            // 其他状态使用普通映射
            const imageUUIDs = FoodItem.stateImageUUIDs[this.state];
            imageUUID = imageUUIDs ? imageUUIDs[posIdx] : '';
            needReload = this.lastLoadedState !== this.state;
        }

        imageUUID = FoodItem.toSpriteFrameUUID(imageUUID);
        
        if (imageUUID && needReload) {
            const loadKey = `${this.state}:${posIdx}:${this.eggCount}`;
            const now = Date.now();
            if (this.pendingLoadKey !== loadKey && !(this.lastLoadFailKey === loadKey && now - this.lastLoadFailAt < 800)) {
                this.pendingLoadKey = loadKey;
                assetManager.loadAny({uuid: imageUUID}, (err: Error | null, spriteFrame: SpriteFrame) => {
                    this.pendingLoadKey = null;
                    if (!err && spriteFrame && spriteFrame.isValid && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                        sprite.color = Color.WHITE;
                        this.lastLoadedState = this.state;
                        this.lastLoadedEggCount = this.eggCount;
                        this.lastLoadFailKey = null;
                        console.log(`[FoodItem] 🍞 切换到状态图片: ${this.state}, 位置: ${posIdx}, 鸡蛋: ${this.eggCount}`);
                    } else {
                        this.lastLoadFailKey = loadKey;
                        this.lastLoadFailAt = Date.now();
                        console.warn(`[FoodItem] ❌ 加载状态图片失败: ${this.state}, 位置: ${posIdx}, 鸡蛋: ${this.eggCount}`, err);
                    }
                });
            }
        }
        
        // 如果没有图片，使用颜色表示
        const hasSpriteFrame = !!sprite.spriteFrame;
        if (!imageUUID) {
            // 🔥 EGG_ADDED 状态即使没有对应数量的图片，也不显示 emoji（使用已有图片）
            if (this.state === DoughState.EGG_ADDED && this.eggCount > 0) {
                label.string = '';  // 清空 emoji，保持使用上一个加载的图片
            } else if (progress > this.almostBurntThreshold) {
                sprite.color = new Color(139, 90, 43, 255);  // 深棕色（快焦了）
                label.string = '🍞';
                label.fontSize = 60;
            } else if (progress > this.burnWarningThreshold) {
                sprite.color = new Color(210, 180, 140, 255);  // 浅棕色（正好）
                label.string = '🍞';
                label.fontSize = 60;
            } else {
                sprite.color = new Color(255, 228, 196, 255);  // 浅色（还嫩）
                label.string = '🍞';
                label.fontSize = 60;
            }
        } else if (hasSpriteFrame) {
            // 有图片时隐藏emoji文字
            label.string = '';
        } else {
            // 图片还没加载成功时，保底显示
            label.string = '🍞';
            label.fontSize = 60;
        }
        
        // 🔥 处理酱料图片显示（BURNT 状态已在前面处理，这里只处理其他状态）
        const sauceLayer = bgNode.getChildByName('_SauceLayer');
        if (sauceLayer) {
            // 🔥 只有刷过酱料才显示酱料层
            if (this.hasSauce) {
                sauceLayer.active = true;
            }
            // 🔥 酱料层不再根据时间变色，保持原始颜色
        }
    }

    addIngredient(type: IngredientType) {
        if (type === IngredientType.EGG) {
            if (this.eggCount < this.maxEggCount) {
                this.eggCount++;
                if (this.eggCount === 1) {
                    this.state = DoughState.EGG_ADDED;
                }
                this.currentStateTime = 0;
            }
        }
        this.addedIngredients.push(type);
    }
    
    /**
     * 翻面
     */
    flip() {
        if (this.state === DoughState.EGG_ADDED && !this.isFlipped) {
            this.isFlipped = true;
            this.state = DoughState.FLIPPED;
            this.currentStateTime = 0;
            return true;
        }
        return false;
    }
    
    /**
     * 喷油（从NEED_OIL状态转换到RAW状态）
     */
    sprayOil(): boolean {
        if (this.state === DoughState.NEED_OIL) {
            this.hasOil = true;
            this.state = DoughState.RAW;
            this.currentStateTime = 0;
            return true;
        }
        return false;
    }
    
    /**
     * 喷水（每个阶段只能喷一次，但不同阶段可以多次喷水）
     * 延缓烧焦+增加好评几率
     */
    sprayWater(): boolean {
        // 已烧焦/完成的不能喷
        if (this.state === DoughState.BURNT || this.state === DoughState.DONE) {
            return false;
        }
        // 当前阶段已经喷过水
        if (this.waterSprayedInState === this.state) {
            return false;
        }
        // 记录在哪个阶段喷的水
        this.waterSprayedInState = this.state;
        this.totalWaterSprays++;
        // 每次喷水增加10%好评几率（累计最高50%）
        this.waterBonusChance = Math.min(0.5, this.totalWaterSprays * 0.1);
        return true;
    }
    
    /**
     * 检查当前阶段是否已喷水
     */
    hasWaterInCurrentState(): boolean {
        return this.waterSprayedInState === this.state;
    }
    
    /**
     * 检查是否可以添加食材（必须先喷油）
     * 注意：烧焦后仍然可以添加食材
     * 翻面后必须先刷酱料，才能添加其他食材
     */
    canAddIngredient(type: IngredientType): boolean {
        // 必须先喷油才能添加任何食材
        if (!this.hasOil) {
            return false;
        }
        
        // 鸡蛋可以在RAW或EGG_ADDED状态添加（最多3个）
        if (type === IngredientType.EGG) {
            return this.eggCount < this.maxEggCount && (this.state === DoughState.RAW || this.state === DoughState.EGG_ADDED);
        }
        
        // 其他食材必须在FLIPPED或BURNT状态才能添加
        if (this.state !== DoughState.FLIPPED && this.state !== DoughState.BURNT) {
            return false;
        }
        
        // 酱料可以直接添加（翻面后第一个要加的就是酱料）
        if (type === IngredientType.GRILLED_NOODLE_SAUCE) {
            return true;
        }
        
        // 其他食材（香肠、洋葱、香菜、调料等）必须先刷酱料
        return this.hasSauce;
    }
    
    /**
     * 标记已刷酱料
     */
    addSauce() {
        this.hasSauce = true;
    }
    
    /**
     * 卷起（翻面后即可卷起，不管添加了什么食材）
     */
    roll(): boolean {
        if (this.state === DoughState.FLIPPED) {
            this.state = DoughState.ROLLED;
            return true;
        }
        return false;
    }
    
    /**
     * 切一刀（卷起刷酱后）
     * @returns 切割次数，0表示无法切割
     */
    cutOnce(): number {
        // 必须是卷好且刷酱的状态
        if (this.state !== DoughState.ROLLED || !this.hasRollSauce) {
            return 0;
        }
        
        // 已经切满3刀
        if (this.cutCount >= FoodItem.MAX_CUT_COUNT) {
            return 0;
        }
        
        this.cutCount++;
        
        // 切满3刀后变成 CUT 状态
        if (this.cutCount >= FoodItem.MAX_CUT_COUNT) {
            this.state = DoughState.CUT;
        }
        
        return this.cutCount;
    }
    
    /**
     * 检查是否切割完成
     */
    isCutComplete(): boolean {
        return this.cutCount >= FoodItem.MAX_CUT_COUNT;
    }
    
    /**
     * 切块（兼容旧代码，直接切满）
     */
    cut(): boolean {
        if (this.state === DoughState.ROLLED && this.hasRollSauce) {
            this.cutCount = FoodItem.MAX_CUT_COUNT;
            this.state = DoughState.CUT;
            return true;
        }
        return false;
    }
    
    /**
     * 完成（切块后，准备打包）
     */
    finish(): boolean {
        if (this.state === DoughState.CUT) {
            this.state = DoughState.DONE;
            return true;
        }
        return false;
    }

    getQuality(): number {
        if (this.state === DoughState.BURNT) return 0;
        
        const progress = this.cookTime / this.maxCookTime;
        if (progress < 0.4) return 60;  // 还太生
        if (progress > 0.9) return 30;  // 快焦了
        if (progress > 0.6 && progress < 0.8) return 100;  // 完美
        return 80;  // 良好
    }
}
