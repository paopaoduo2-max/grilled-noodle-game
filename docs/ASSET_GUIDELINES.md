# 资源规范文档

## 📷 图片资源规范

### 通用规范
- **格式**：PNG（带透明通道）或 JPG（背景图）
- **颜色空间**：sRGB
- **最大尺寸**：单张图片不超过 2048x2048

### 食材图片 (Ingredients)
| 属性 | 规范 |
|------|------|
| 尺寸 | 128x128 px |
| 格式 | PNG |
| 命名 | `{ingredient_type}.png` |
| 示例 | `egg.png`, `noodle.png`, `sauce.png` |

**食材类型对照表：**
```
noodle      - 面饼
egg         - 鸡蛋
sausage     - 香肠
coriander   - 香菜
onion       - 洋葱
sauce       - 酱料
vinegar     - 醋
chili       - 辣椒
batter      - 面糊
crispy      - 薄脆
lettuce     - 生菜
sweet_sauce - 甜面酱
scallion    - 香葱
meatball    - 肉丸
tofu        - 豆制品
squid       - 鱿鱼
pork        - 里脊肉
beef        - 牛肉
rice        - 米饭
potato      - 土豆
eggplant    - 茄子
corn        - 玉米
```

### 客户头像 (Customers)
| 属性 | 规范 |
|------|------|
| 尺寸 | 96x96 px |
| 格式 | PNG |
| 命名 | `customer_{type}_{index}.png` |
| 示例 | `customer_normal_01.png`, `customer_vip_01.png` |

### UI 按钮 (Buttons)
| 属性 | 规范 |
|------|------|
| 尺寸 | 按需（建议宽度 200-400px）|
| 格式 | PNG（9-slice 切片）|
| 状态 | normal / pressed / disabled |
| 命名 | `btn_{name}_{state}.png` |

### UI 图标 (Icons)
| 属性 | 规范 |
|------|------|
| 尺寸 | 64x64 px 或 48x48 px |
| 格式 | PNG |
| 命名 | `icon_{name}.png` |
| 示例 | `icon_coin.png`, `icon_star.png`, `icon_timer.png` |

### 背景图 (Backgrounds)
| 属性 | 规范 |
|------|------|
| 尺寸 | 1280x720 px（适配设计分辨率）|
| 格式 | JPG（压缩质量 80%）或 PNG |
| 命名 | `bg_{scene_name}.jpg` |
| 示例 | `bg_main_menu.jpg`, `bg_kitchen.jpg` |

### 菜品成品图 (Recipes)
| 属性 | 规范 |
|------|------|
| 尺寸 | 256x256 px |
| 格式 | PNG |
| 命名 | `recipe_{recipe_id}.png` |
| 示例 | `recipe_grilled_cold_noodle.png`, `recipe_jianbing.png` |

---

## 🔊 音频资源规范

### 背景音乐 (BGM)
| 属性 | 规范 |
|------|------|
| 格式 | MP3 或 OGG |
| 采样率 | 44100 Hz |
| 比特率 | 128-192 kbps |
| 时长 | 60-180 秒（可循环）|
| 命名 | `{scene_name}.mp3` |

**需要的 BGM 文件：**
```
main_menu.mp3   - 主菜单（轻松欢快）
prepare.mp3     - 准备阶段（节奏适中）
cooking.mp3     - 烹饪阶段（紧张活泼）
result.mp3      - 结算界面（舒缓）
tutorial.mp3    - 教程（引导感）
```

### 音效 (SFX)
| 属性 | 规范 |
|------|------|
| 格式 | MP3 或 WAV |
| 采样率 | 44100 Hz |
| 时长 | 0.1-3 秒 |
| 命名 | `{action_name}.mp3` |

**UI 音效列表：**
```
button_click.mp3      - 按钮点击
button_hover.mp3      - 按钮悬停（可选）
panel_open.mp3        - 面板打开
panel_close.mp3       - 面板关闭
purchase_success.mp3  - 购买成功
purchase_fail.mp3     - 购买失败
level_unlock.mp3      - 关卡解锁
```

**烹饪音效列表：**
```
place_ingredient.mp3  - 放置食材
crack_egg.mp3         - 打鸡蛋
sizzle.mp3           - 煎炸声
flip.mp3             - 翻面
chop.mp3             - 切菜
brush_sauce.mp3      - 刷酱
sprinkle.mp3         - 撒调料
serve.mp3            - 上菜
order_complete.mp3   - 订单完成
order_timeout.mp3    - 订单超时
customer_happy.mp3   - 客人满意
customer_angry.mp3   - 客人不满
timer_warning.mp3    - 倒计时警告
burn_warning.mp3     - 烧焦警告
```

---

## 📝 命名规范总结

### 通用规则
1. **全小写**，单词间用 **下划线** 分隔
2. 使用 **英文**，不使用中文或拼音
3. 保持 **简洁明了**，避免过长名称
4. 同类资源使用 **统一前缀**

### 示例
```
✅ 正确：
   egg.png
   btn_start_normal.png
   bg_kitchen.jpg
   order_complete.mp3

❌ 错误：
   鸡蛋.png
   Button Start.png
   background-kitchen.jpg
   OrderComplete.mp3
```

---

## 🔗 资源引用方式

### 在脚本中加载资源
```typescript
import { ResourceManager } from '../Utils/ResourceManager';

// 加载精灵
const sprite = await ResourceManager.Instance.loadSprite('Images/Ingredients/egg');

// 加载音频
const clip = await ResourceManager.Instance.loadAudio('Audio/SFX/Cooking/crack_egg');

// 加载预制体
const prefab = await ResourceManager.Instance.loadPrefab('Prefabs/UI/OrderPanel');
```

### 使用配置常量
```typescript
import { AudioConfig } from '../Config/AudioConfig';
import { UIConfig } from '../Config/UIConfig';
import { IngredientConfig } from '../Config/IngredientConfig';

// 播放音效
AudioManager.Instance.playSFX(AudioConfig.SFX_COOKING.CRACK_EGG);

// 获取食材图片路径
const imagePath = IngredientConfig.getImagePath(IngredientType.EGG);
```
