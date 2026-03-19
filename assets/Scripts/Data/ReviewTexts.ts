/**
 * 评价文案库
 * 用于存储好评和差评的文案，与烤冷面相关
 */

export class ReviewTexts {
    /**
     * 超级好评文案（食材对 + 没烤焦）
     */
    static SUPER_GOOD_REVIEWS: string[] = [
        '🌟 太完美了！鸡蛋嫩，酱料香，绝了！',
        '🌟 这烤冷面太正宗了！东北味儿！',
        '🌟 酱香四溢，调料恰到好处！',
        '🌟 面饼软糯，配料丰富，太好吃了！',
        '🌟 香肠烤得刚刚好，配冷面绝配！',
        '🌟 辣椒糖醋配比完美，吃出家乡味！',
        '🌟 这手艺可以啊！每一口都是享受！',
        '🌟 洋葱香菜新鲜，酱料入味，满分！',
        '🌟 火候掌握得真好！面不糊蛋刚熟！',
        '🌟 太赞了！这是我吃过最棒的烤冷面！',
        '🌟 鸡蛋打得漂亮，酱刷得均匀，完美！',
        '🌟 香肠和冷面配一起太香了！'
    ];

    /**
     * 好评文案（食材对 + 烤焦了）
     */
    static GOOD_REVIEWS: string[] = [
        '😊 味道不错，就是面饼有点焦了...',
        '😊 酱料很香，但火候稍微过了点',
        '😊 配料都对，就是有点糊味',
        '😊 鸡蛋好吃，面稍微焦了点',
        '😊 调料不错，下次火候轻一点就完美了',
        '😊 香肠烤得好，但面有点焦味',
        '😊 酱料入味，就是烤过头了',
        '😊 整体还行，面饼再嫩点就更好',
        '😊 配菜新鲜，就是有点烤焦',
        '😊 味道可以，火候再控制下'
    ];

    /**
     * 差评文案（食材错误）- 根据具体原因
     */
    static BAD_REVIEWS: string[] = [
        '😢 我要的是加蛋的，这没蛋啊！',
        '😢 酱都没刷，味道太淡了！',
        '😢 这个调料不对，和订单不一样！',
        '😢 我要加香肠的，怎么没有？',
        '😢 这烤冷面味道不对劲...',
        '😢 配料和我点的不一样啊！',
        '😢 完全不是我要的口味！',
        '😢 我明明要辣的，这不辣啊！',
        '😢 订单是要醋的，怎么没有酸味？',
        '😢 这不是我要的烤冷面！'
    ];
    
    /**
     * 差评文案 - 没有鸡蛋
     */
    static BAD_NO_EGG: string[] = [
        '😢 我要的是加蛋的，这没蛋啊！',
        '😢 烤冷面没鸡蛋，少了灵魂！',
        '😢 鸡蛋呢？我点的是加蛋的！'
    ];
    
    /**
     * 差评文案 - 没有酱料
     */
    static BAD_NO_SAUCE: string[] = [
        '😢 酱都没刷，味道太淡了！',
        '😢 这烤冷面怎么没酱？干巴巴的！',
        '😢 没有酱料，完全没味道啊！'
    ];
    
    /**
     * 差评文案 - 调料不对
     */
    static BAD_WRONG_CONDIMENTS: string[] = [
        '😢 这个调料不对，我要的是辣的！',
        '😢 我要甜口的，这个太酸了！',
        '😢 调料配比不对，味道怪怪的！'
    ];
    
    /**
     * 差评文案 - 烧焦了
     */
    static BAD_BURNT: string[] = [
        '😢 这都烤焦了，没法吃！',
        '😢 黑成这样还敢卖？！',
        '😢 烤糊了！这能吃吗？'
    ];

    /**
     * 随机获取一个超级好评文案
     */
    static getRandomSuperGoodReview(): string {
        const index = Math.floor(Math.random() * this.SUPER_GOOD_REVIEWS.length);
        return this.SUPER_GOOD_REVIEWS[index];
    }

    /**
     * 随机获取一个好评文案
     */
    static getRandomGoodReview(): string {
        const index = Math.floor(Math.random() * this.GOOD_REVIEWS.length);
        return this.GOOD_REVIEWS[index];
    }

    /**
     * 随机获取一个差评文案
     */
    static getRandomBadReview(): string {
        const index = Math.floor(Math.random() * this.BAD_REVIEWS.length);
        return this.BAD_REVIEWS[index];
    }
    
    /**
     * 根据原因获取差评文案
     */
    static getBadReviewByReason(reason: string): string {
        let reviews: string[];
        switch (reason) {
            case 'no_egg':
                reviews = this.BAD_NO_EGG;
                break;
            case 'no_sauce':
                reviews = this.BAD_NO_SAUCE;
                break;
            case 'wrong_condiments':
                reviews = this.BAD_WRONG_CONDIMENTS;
                break;
            case 'burnt':
                reviews = this.BAD_BURNT;
                break;
            default:
                reviews = this.BAD_REVIEWS;
        }
        const index = Math.floor(Math.random() * reviews.length);
        return reviews[index];
    }
}





