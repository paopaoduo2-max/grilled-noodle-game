/**
 * 功能开关（用于新旧流程并行期的可回滚控制）
 */
export class FeatureGate {
    /**
     * 新主流程：单营业主场景 + 地图成长 + 剧情任务
     */
    public static readonly ENABLE_WORLD_SINGLE_FLOW = true;

    /**
     * 旧关卡入口开关（Level2-6）
     */
    public static readonly ENABLE_LEGACY_LEVEL_ENTRY = false;

    /**
     * 旧关卡场景保留（仅用于过渡期回滚）
     */
    public static readonly ENABLE_LEGACY_LEVEL_SCENES = false;

    /**
     * 地图内摊位商店（设备/食材分区售卖）
     */
    public static readonly ENABLE_WORLD_SHOP = true;

    /**
     * 按天剧情任务窗口
     */
    public static readonly ENABLE_DAILY_STORY_TASKS = true;

    /**
     * 小游戏店入口
     */
    public static readonly ENABLE_MINIGAME_SHOP = true;
}

