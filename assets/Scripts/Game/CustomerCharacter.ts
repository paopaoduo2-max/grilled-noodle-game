import { _decorator } from 'cc';
import { CustomerMood } from './CookingControllerV2';

const { ccclass } = _decorator;

/**
 * 顾客角色类型枚举
 */
export enum CustomerType {
    TYPE_1 = 'customer1',   // 商人 (customer)
    TYPE_2 = 'customer2',   // 工人 (woker)
    TYPE_3 = 'customer3',   // 老人 (oldman)
    TYPE_4 = 'customer4',   // 老奶奶 (oldlady)
    TYPE_5 = 'customer5',   // 阿姨 (Auntie)
    TYPE_6 = 'customer6',   // 司机 (Driver)
    TYPE_7 = 'customer7',   // 女人 (woman)
    TYPE_8 = 'customer8',   // 小男孩 (littleboy)
    TYPE_9 = 'customer9',   // 小女孩 (littlegirl)
    TYPE_10 = 'customer10', // 年轻人 (yongman)
    TYPE_11 = 'customer11'  // 年轻女性 (Young Woman)
}

/**
 * 顾客角色配置接口
 */
export interface CharacterConfig {
    type: CustomerType;
    name: string;
    spriteFrameUUIDs: {
        [CustomerMood.WAITING]: string;
        [CustomerMood.HAPPY]: string;
        [CustomerMood.ANGRY]: string;
    };
    weight: number;  // 出现权重（用于随机选择）
    // 🔥 添加角色大小配置
    size?: {
        width: number;
        height: number;
    };
}

/**
 * 顾客角色管理器
 */
@ccclass('CustomerCharacterManager')
export class CustomerCharacterManager {
    private static instance: CustomerCharacterManager = null;
    
    // 角色配置池
    private characterConfigs: Map<CustomerType, CharacterConfig> = new Map();
    
    // 当前活跃的角色类型（防止重复）
    private activeCharacterTypes: Set<CustomerType> = new Set();
    
    // 角色权重列表（用于随机选择）
    private weightedCharacters: CustomerType[] = [];
    
    public static getInstance(): CustomerCharacterManager {
        if (!CustomerCharacterManager.instance) {
            CustomerCharacterManager.instance = new CustomerCharacterManager();
        }
        return CustomerCharacterManager.instance;
    }
    
    /**
     * 🔥 强制重新创建实例（完全重置）
     */
    public static forceRecreateInstance(): CustomerCharacterManager {
        console.log('[CustomerCharacterManager] 🔥 强制重新创建实例...');
        CustomerCharacterManager.instance = null;
        return CustomerCharacterManager.getInstance();
    }
    
    /**
     * 🔥 强制重新初始化所有角色配置（用于调试和更新配置）
     */
    public forceRefreshConfigs(): void {
        console.log('[CustomerCharacterManager] 🔥 强制刷新角色配置...');
        this.characterConfigs.clear();
        this.activeCharacterTypes.clear();
        this.weightedCharacters = [];
        this.initCharacterConfigs();
        this.buildWeightedList();
        console.log('[CustomerCharacterManager] ✅ 角色配置刷新完成');
    }
    
    constructor() {
        this.initCharacterConfigs();
        this.buildWeightedList();
    }
    
    /**
     * 初始化角色配置
     */
    private initCharacterConfigs() {
        // 🔥 清空现有配置，确保重新加载
        this.characterConfigs.clear();
        
        // 商人角色 (customer)
        this.characterConfigs.set(CustomerType.TYPE_1, {
            type: CustomerType.TYPE_1,
            name: '商人',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '5d236314-d795-4e8e-b681-bf5e6651eb3e@f9941',  // customer_wait
                [CustomerMood.HAPPY]: 'c0f3a247-28ca-44f4-893f-5b91652f5270@f9941',    // customer_happy
                [CustomerMood.ANGRY]: '5b0cc1d6-5c3a-4c76-9649-6a10dbe4ea75@f9941'     // customer_angry
            },
            weight: 15,
            size: { width: 342, height: 714 }
        });
        
        // 工人角色 (woker)
        this.characterConfigs.set(CustomerType.TYPE_2, {
            type: CustomerType.TYPE_2,
            name: '工人',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '60db2e26-bb55-4dab-a0fa-4688d4683ea9@f9941',  // woker_wait
                [CustomerMood.HAPPY]: '3474f298-3e82-4dfc-b6b0-145698464ad5@f9941',    // woker_happy
                [CustomerMood.ANGRY]: 'd3e9d558-fd15-41af-b32b-370b5d72077c@f9941'     // woker_angry
            },
            weight: 15,
            size: { width: 342, height: 714 }
        });
        
        // 老人角色 (oldman)
        this.characterConfigs.set(CustomerType.TYPE_3, {
            type: CustomerType.TYPE_3,
            name: '老人',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '99b89a9a-889e-4096-9558-b6ecc3ffd6d4@f9941',  // oldman_wait
                [CustomerMood.HAPPY]: '08483550-7da3-49f8-80b4-c32b58706b9c@f9941',    // oldman_happy
                [CustomerMood.ANGRY]: 'ad5682a1-c4c2-4a99-87ec-f9c9d8e6724e@f9941'     // oldman_angry
            },
            weight: 12,
            size: { width: 360, height: 700 }
        });
        
        // 老奶奶角色 (oldlady)
        this.characterConfigs.set(CustomerType.TYPE_4, {
            type: CustomerType.TYPE_4,
            name: '老奶奶',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: 'f390247b-90df-42f6-a395-8afea70e1e0e@f9941',  // oldlady_wait
                [CustomerMood.HAPPY]: '27e81b4b-d40e-4912-bd8c-875630aab09b@f9941',    // oldlady_happy
                [CustomerMood.ANGRY]: 'a3edb33c-f322-45d4-a25a-4c3f194db287@f9941'     // oldlady_angry
            },
            weight: 12,
            size: { width: 350, height: 680 }
        });
        
        // 阿姨角色 (Auntie)
        this.characterConfigs.set(CustomerType.TYPE_5, {
            type: CustomerType.TYPE_5,
            name: '阿姨',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '5da77614-84c4-4043-91c6-754d8148965f@f9941',  // Auntie_wait
                [CustomerMood.HAPPY]: 'b8aeef05-66aa-4e1e-92be-21e7a240759e@f9941',    // Auntie_happy
                [CustomerMood.ANGRY]: 'cbcc1f65-47dd-47bf-a234-8d7a2fb3aa48@f9941'     // Auntie_angry
            },
            weight: 15,
            size: { width: 380, height: 750 }
        });
        
        // 司机角色 (Driver)
        this.characterConfigs.set(CustomerType.TYPE_6, {
            type: CustomerType.TYPE_6,
            name: '司机',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: 'e208fac6-8ea1-4222-b019-0fa4c8d310c6@f9941',  // Driver_wait
                [CustomerMood.HAPPY]: '43bd1451-5808-4467-86b1-c593bd510822@f9941',    // Driver_happy
                [CustomerMood.ANGRY]: '85dd88cf-e778-4a1d-86a0-7431f52cf9cc@f9941'     // Driver_angry
            },
            weight: 12,
            size: { width: 400, height: 780 }
        });
        
        // 女人角色 (woman)
        this.characterConfigs.set(CustomerType.TYPE_7, {
            type: CustomerType.TYPE_7,
            name: '女人',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '5eab5a1d-7ede-4f79-a1cb-50ac32e7ea1d@f9941',  // woman_wait
                [CustomerMood.HAPPY]: '6434979c-3588-4514-8f38-f9fc5d155b9b@f9941',    // woman_happy
                [CustomerMood.ANGRY]: 'a6ff510f-4bf2-4591-8485-7f51d6df44d6@f9941'     // woman_angry
            },
            weight: 15,
            size: { width: 340, height: 700 }
        });
        
        // 小男孩角色 (littleboy)
        this.characterConfigs.set(CustomerType.TYPE_8, {
            type: CustomerType.TYPE_8,
            name: '小男孩',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: 'e9f4dc0a-db9a-44a6-a2d2-9d14f3867203@f9941',  // littleboy_wait
                [CustomerMood.HAPPY]: '203aed79-5d6c-4d5b-873c-66aad0b1b4c9@f9941',    // littleboy_happy
                [CustomerMood.ANGRY]: '9a7df89a-0a78-4e19-a0b9-2e5c1e8c4a3a@f9941'     // littleboy_angry
            },
            weight: 10,
            size: { width: 280, height: 580 }
        });
        
        // 小女孩角色 (littlegirl)
        this.characterConfigs.set(CustomerType.TYPE_9, {
            type: CustomerType.TYPE_9,
            name: '小女孩',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '8f9e574a-9a4c-4a7d-9682-346e04d0b77b@f9941',  // littlegirl_wait
                [CustomerMood.HAPPY]: '4c3238d8-34dd-441f-9ad8-db62711afb68@f9941',    // littlegirl_happy
                [CustomerMood.ANGRY]: '41541565-6f35-45f2-a1f8-7634b6277b75@f9941'     // littlegirl_angry
            },
            weight: 10,
            size: { width: 270, height: 560 }
        });
        
        // 年轻人角色 (yongman)
        this.characterConfigs.set(CustomerType.TYPE_10, {
            type: CustomerType.TYPE_10,
            name: '年轻人',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '062ca821-4694-45de-97be-82ec5765029b@f9941',  // yongman_wait
                [CustomerMood.HAPPY]: '854ef237-0450-483c-bbe6-6440c348152b@f9941',    // yongman_happy
                [CustomerMood.ANGRY]: '882e6775-2cb2-4932-81d4-1f5d69788c33@f9941'     // yongman_angry
            },
            weight: 15,
            size: { width: 360, height: 740 }
        });
        
        // 年轻女性角色 (Young Woman)
        this.characterConfigs.set(CustomerType.TYPE_11, {
            type: CustomerType.TYPE_11,
            name: '年轻女性',
            spriteFrameUUIDs: {
                [CustomerMood.WAITING]: '760280df-2181-4293-a34a-d303f60207d5@f9941',  // Young Woman_wait
                [CustomerMood.HAPPY]: '7f0683f9-3a6b-4012-8a17-1ae33c0967ad@f9941',    // Young Woman_happy
                [CustomerMood.ANGRY]: '77204b51-8047-4ea9-8203-aa247f480de1@f9941'     // Young Woman_angry
            },
            weight: 15,
            size: { width: 330, height: 680 }
        });
    }
    
    /**
     * 构建权重列表用于随机选择
     */
    private buildWeightedList() {
        this.weightedCharacters = [];
        for (const [type, config] of this.characterConfigs) {
            for (let i = 0; i < config.weight; i++) {
                this.weightedCharacters.push(type);
            }
        }
        console.log(`[CustomerCharacterManager] 权重列表构建完成，总数: ${this.weightedCharacters.length}`);
        
        // 输出每个角色的权重
        for (const [type, config] of this.characterConfigs) {
            const count = this.weightedCharacters.filter(t => t === type).length;
            console.log(`[CustomerCharacterManager] ${config.name}: 权重=${config.weight}, 实际数量=${count}`);
        }
        
        // 打乱权重列表以提高随机性
        this.shuffleWeightedList();
    }
    
    /**
     * 打乱权重列表
     */
    private shuffleWeightedList() {
        for (let i = this.weightedCharacters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.weightedCharacters[i], this.weightedCharacters[j]] = [this.weightedCharacters[j], this.weightedCharacters[i]];
        }
        console.log('[CustomerCharacterManager] 权重列表已打乱');
    }
    
    /**
     * 随机选择一个未使用的角色类型
     */
    public getRandomAvailableCharacter(): CustomerType | null {
        // 获取所有可用的角色类型
        const availableCharacters = this.weightedCharacters.filter(
            type => !this.activeCharacterTypes.has(type)
        );
        
        console.log(`[CustomerCharacterManager] 权重列表总数: ${this.weightedCharacters.length}`);
        console.log(`[CustomerCharacterManager] 活跃角色: ${Array.from(this.activeCharacterTypes).join(', ')}`);
        console.log(`[CustomerCharacterManager] 可用角色数: ${availableCharacters.length}`);
        
        if (availableCharacters.length === 0) {
            console.warn('[CustomerCharacterManager] 没有可用的角色类型');
            return null;
        }
        
        // 使用更好的随机选择方法
        // 首先收集所有唯一的可用类型
        const uniqueAvailableTypes = Array.from(new Set(availableCharacters));
        console.log(`[CustomerCharacterManager] 唯一可用角色数: ${uniqueAvailableTypes.length}`);
        console.log(`[CustomerCharacterManager] 可用类型列表: ${uniqueAvailableTypes.map(t => this.characterConfigs.get(t)?.name || t).join(', ')}`);
        
        // 使用时间戳增强随机性
        const now = Date.now();
        const seed = now % 1000;
        const randomValue = (Math.random() * 1000 + seed) % 1;
        
        // 随机选择一个唯一类型
        const randomIndex = Math.floor(randomValue * uniqueAvailableTypes.length);
        const selectedType = uniqueAvailableTypes[randomIndex];
        const config = this.characterConfigs.get(selectedType);
        
        console.log(`[CustomerCharacterManager] 随机种子: ${seed}, 随机值: ${randomValue}`);
        console.log(`[CustomerCharacterManager] 随机索引: ${randomIndex}/${uniqueAvailableTypes.length}`);
        console.log(`[CustomerCharacterManager] 选中角色: ${config?.name || selectedType}`);
        
        return selectedType;
    }
    
    /**
     * 激活角色类型（标记为已使用）
     */
    public activateCharacterType(type: CustomerType) {
        this.activeCharacterTypes.add(type);
        console.log(`[CustomerCharacterManager] 激活角色: ${this.characterConfigs.get(type)?.name}`);
    }
    
    /**
     * 释放角色类型（标记为可用）
     */
    public releaseCharacterType(type: CustomerType) {
        this.activeCharacterTypes.delete(type);
        console.log(`[CustomerCharacterManager] 释放角色: ${this.characterConfigs.get(type)?.name}`);
    }
    
    /**
     * 获取角色配置
     */
    public getCharacterConfig(type: CustomerType): CharacterConfig | undefined {
        return this.characterConfigs.get(type);
    }
    
    /**
     * 获取角色的精灵图UUID
     */
    public getSpriteFrameUUID(type: CustomerType, mood: CustomerMood): string {
        const config = this.characterConfigs.get(type);
        if (!config) {
            console.error(`[CustomerCharacterManager] 未找到角色类型: ${type}`);
            return '';
        }
        return config.spriteFrameUUIDs[mood];
    }
    
    /**
     * 清理所有活跃角色（游戏重置时使用）
     */
    public clearAllActiveCharacters() {
        this.activeCharacterTypes.clear();
        console.log('[CustomerCharacterManager] 已清理所有活跃角色');
    }
    
    /**
     * 获取当前活跃角色数量
     */
    public getActiveCharacterCount(): number {
        return this.activeCharacterTypes.size;
    }
    
    /**
     * 检查角色类型是否可用
     */
    public isCharacterAvailable(type: CustomerType): boolean {
        return !this.activeCharacterTypes.has(type);
    }
}
