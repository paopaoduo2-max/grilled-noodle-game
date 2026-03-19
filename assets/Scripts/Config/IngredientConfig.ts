import { IngredientType, IngredientData } from '../Data/GameConfig';

/**
 * 食材配置管理
 * 从 GameConfig.ts 拆分出来，便于维护
 */
export class IngredientConfig {
    /**
     * 获取食材图片路径
     * @param type 食材类型
     * @returns 图片资源路径
     */
    static getImagePath(type: IngredientType): string {
        return `Images/Ingredients/${type}`;
    }

    /**
     * 获取食材音效路径
     * @param type 食材类型  
     * @returns 音效资源路径
     */
    static getSoundPath(type: IngredientType): string {
        return `Audio/SFX/Cooking/${type}`;
    }

    /**
     * 食材图片资源映射表
     * 当添加实际图片资源后，在这里配置对应关系
     */
    static readonly IMAGE_MAP: { [key: string]: string } = {
        // 烤冷面食材
        [IngredientType.NOODLE]: 'noodle',
        [IngredientType.EGG]: 'egg',
        [IngredientType.SAUSAGE]: 'sausage',
        [IngredientType.CORIANDER]: 'coriander',
        [IngredientType.ONION]: 'onion',
        [IngredientType.SAUCE]: 'sauce',
        [IngredientType.VINEGAR]: 'vinegar',
        [IngredientType.CHILI]: 'chili',
        
        // 煎饼果子食材
        [IngredientType.BATTER]: 'batter',
        [IngredientType.CRISPY]: 'crispy',
        [IngredientType.LETTUCE]: 'lettuce',
        [IngredientType.SWEET_SAUCE]: 'sweet_sauce',
        [IngredientType.SCALLION]: 'scallion',
        
        // 其他食材按需添加...
    };

    /**
     * 食材 Emoji 映射（临时使用，后续替换为图片）
     */
    static readonly EMOJI_MAP: { [key: string]: string } = {
        [IngredientType.NOODLE]: '🥞',
        [IngredientType.EGG]: '🥚',
        [IngredientType.SAUSAGE]: '🌭',
        [IngredientType.CORIANDER]: '🌿',
        [IngredientType.ONION]: '🧅',
        [IngredientType.SAUCE]: '🥫',
        [IngredientType.VINEGAR]: '🧪',
        [IngredientType.CHILI]: '🌶️',
        [IngredientType.BATTER]: '🥣',
        [IngredientType.CRISPY]: '🍘',
        [IngredientType.LETTUCE]: '🥬',
        [IngredientType.SWEET_SAUCE]: '🥫',
        [IngredientType.SCALLION]: '🌱',
        [IngredientType.MEATBALL]: '🍡',
        [IngredientType.VEGETABLE_MIX]: '🥗',
        [IngredientType.TOFU]: '🧈',
        [IngredientType.NOODLES]: '🍜',
        [IngredientType.SPICY_SOUP]: '🍲',
        [IngredientType.SQUID]: '🦑',
        [IngredientType.PORK]: '🥓',
        [IngredientType.CUMIN]: '🧂',
        [IngredientType.CHILI_POWDER]: '🌶️',
        [IngredientType.BBQ_SAUCE]: '🥫',
        [IngredientType.MEAT_SKEWER]: '🍢',
        [IngredientType.VEG_SKEWER]: '🍢',
        [IngredientType.CHICKEN]: '🍗',
        [IngredientType.BREADCRUMB]: '🍞',
        [IngredientType.KETCHUP]: '🍅',
        [IngredientType.PORK_BELLY]: '🥩',
        [IngredientType.BEEF]: '🥩',
        [IngredientType.RICE]: '🍚',
        [IngredientType.KIMCHI]: '🥬',
        [IngredientType.BEAN_SPROUT]: '🌱',
        [IngredientType.STONE_POT]: '🍲',
        [IngredientType.POTATO]: '🥔',
        [IngredientType.EGGPLANT]: '🍆',
        [IngredientType.GREEN_BEAN]: '🫘',
        [IngredientType.CORN]: '🌽',
        [IngredientType.VERMICELLI]: '🍜',
        [IngredientType.BROTH]: '🍲',
        [IngredientType.SPICE_MIX]: '🧂',
    };

    /**
     * 获取食材显示内容（优先使用图片，降级为emoji）
     */
    static getDisplayContent(type: IngredientType): string {
        return this.EMOJI_MAP[type] || '❓';
    }
}
