# ⚙️ Cursor设置 - 保存工作历史记录

## 🎯 目标

让Cursor在每次打开时都能保留之前的工作历史记录，快速恢复项目上下文。

---

## 📋 方法一：使用项目记录文件（推荐）✅

### 操作步骤

1. **创建项目记录文件**
   - 文件已创建：`📚项目完整记录-工作上下文恢复.md`
   - 此文件包含所有系统、修改历史、当前状态

2. **每次打开Cursor时**
   ```
   1. 打开Cursor
   2. 在聊天中输入：
      "请先读取 📚项目完整记录-工作上下文恢复.md 文件，了解项目当前状态"
   3. AI会读取文件并恢复上下文
   4. 继续工作
   ```

3. **完成重要修改后**
   - 更新`📚项目完整记录-工作上下文恢复.md`文件
   - 添加新的修改记录
   - 更新当前状态和待办事项

**优点**:
- ✅ 不依赖Cursor设置
- ✅ 项目记录文件在版本控制中
- ✅ 可以手动维护和更新
- ✅ 团队成员可以共享

---

## 📋 方法二：Cursor内置功能

### 2.1 使用Cursor的Chat History

**说明**: Cursor会自动保存聊天历史，但可能不会跨会话保留。

**设置步骤**:
1. 打开Cursor设置
2. 找到 `Features` → `Chat`
3. 确保 `Save Chat History` 已启用
4. 检查 `Chat History Location` 路径

**注意**: 
- Cursor的聊天历史可能存储在本地
- 不同项目可能有不同的历史记录
- 历史记录可能不会自动加载

---

### 2.2 使用Cursor的Workspace Context

**说明**: Cursor可以保存工作区上下文。

**设置步骤**:
1. 打开Cursor设置 (`Ctrl+,` 或 `Cmd+,`)
2. 搜索 `context` 或 `workspace`
3. 启用相关选项：
   - `Enable Workspace Context`
   - `Save Context Automatically`
   - `Load Context on Startup`

**注意**: 
- 这些功能可能因Cursor版本而异
- 某些功能可能需要Cursor Pro

---

### 2.3 使用Cursor的Memory功能（如果可用）

**说明**: 某些版本的Cursor支持Memory功能，可以记住项目信息。

**设置步骤**:
1. 打开Cursor设置
2. 查找 `Memory` 或 `AI Memory` 选项
3. 启用 `Remember Project Context`
4. 设置记忆范围和时间

**注意**: 
- 此功能可能仅在Cursor Pro中可用
- 需要手动触发或自动保存

---

## 📋 方法三：使用`.cursorrules`文件

### 创建项目规则文件

在项目根目录创建 `.cursorrules` 文件：

```markdown
# 项目规则和上下文

## 项目概述
这是一个使用Cocos Creator 3.x开发的2D模拟经营游戏"东北料理王"。

## 核心系统
- GameManager: 全局游戏管理器（单例）
- CookingControllerV2: CookingScene的核心控制器
- 多顾客订单系统: 3个顾客，每个有独立订单
- 打包出餐系统: 打包 → 出餐按钮 → 送达顾客

## 重要文件
- assets/Scripts/Game/CookingControllerV2.ts - 核心系统
- assets/Scenes/CookingScene.scene - 核心场景
- assets/Scripts/Manager/GameManager.ts - 全局管理器
- assets/Scripts/Data/GameConfig.ts - 数据配置

## 当前状态
- 核心功能已完成
- 需要在编辑器中绑定CookingControllerV2的属性
- 需要测试完整流程

## 开发规范
- 使用TypeScript
- 遵循现有代码风格
- 添加详细注释
- 使用统一的日志格式：[模块名] 信息
```

**优点**:
- ✅ Cursor会自动读取此文件
- ✅ 提供项目上下文
- ✅ 可以定义开发规范

---

## 📋 方法四：使用Git提交信息

### 在提交信息中记录重要修改

```bash
# 提交时添加详细说明
git commit -m "V7.1: 优化订单UI显示，添加背景框

- 修复UITransform重复添加问题
- 优化订单UI显示（带背景框，更清晰）
- 删除未使用的customerOrderLabel属性
- 优化订单生成逻辑"
```

**优点**:
- ✅ 版本控制中保留历史
- ✅ 可以查看提交记录了解修改
- ✅ 团队成员可以共享

---

## 📋 方法五：使用Cursor的Codebase Index

### 启用代码库索引

**设置步骤**:
1. 打开Cursor设置
2. 找到 `Features` → `Codebase Index`
3. 启用 `Index Project Files`
4. 设置索引范围（建议包含所有`.ts`和`.md`文件）

**优点**:
- ✅ Cursor可以快速搜索代码库
- ✅ 提供代码上下文
- ✅ 帮助理解项目结构

---

## 🎯 推荐方案组合

### 最佳实践

1. **主要方法**: 使用项目记录文件
   - 创建并维护 `📚项目完整记录-工作上下文恢复.md`
   - 每次打开Cursor时先读取此文件

2. **辅助方法**: 使用`.cursorrules`文件
   - 创建项目规则文件
   - 提供快速上下文

3. **版本控制**: 使用Git提交信息
   - 在提交时添加详细说明
   - 保留修改历史

4. **代码索引**: 启用Codebase Index
   - 让Cursor理解项目结构
   - 提供代码搜索功能

---

## 📝 实际操作示例

### 每次打开Cursor时

```
你：请先读取 📚项目完整记录-工作上下文恢复.md 文件，了解项目当前状态

AI：[读取文件并恢复上下文]

你：继续开发，需要绑定CookingControllerV2的属性

AI：[基于恢复的上下文继续工作]
```

### 完成重要修改后

```
1. 更新 📚项目完整记录-工作上下文恢复.md
   - 添加新的修改记录
   - 更新当前状态
   - 更新待办事项

2. 提交到Git
   git add .
   git commit -m "V7.2: 完成XXX功能"
```

---

## 🔧 Cursor设置检查清单

### 基础设置
- [ ] 启用 `Save Chat History`
- [ ] 启用 `Codebase Index`
- [ ] 设置合适的索引范围

### 高级设置（如果可用）
- [ ] 启用 `Workspace Context`
- [ ] 启用 `AI Memory`
- [ ] 设置自动保存上下文

### 项目文件
- [ ] 创建 `.cursorrules` 文件
- [ ] 维护 `📚项目完整记录-工作上下文恢复.md`
- [ ] 在Git提交中添加详细说明

---

## 💡 额外建议

### 1. 使用Cursor的Composer功能

**说明**: Cursor的Composer可以处理多个文件，适合大型修改。

**使用场景**:
- 重构代码
- 添加新功能
- 修复多个文件的问题

### 2. 使用Cursor的Chat功能

**说明**: 使用Chat功能时，可以引用特定文件。

**使用方式**:
```
你：请查看 CookingControllerV2.ts 中的订单系统实现
AI：[读取并分析文件]
```

### 3. 定期更新项目记录

**建议**: 
- 每次完成重要功能后更新记录
- 每周回顾一次项目状态
- 保持记录文件最新

---

## 🎯 总结

### 最可靠的方法 ✅

**使用项目记录文件 + 每次打开时读取**

1. 维护 `📚项目完整记录-工作上下文恢复.md`
2. 每次打开Cursor时先读取此文件
3. 完成重要修改后更新记录

**优点**:
- ✅ 不依赖Cursor版本
- ✅ 可以手动控制
- ✅ 在版本控制中
- ✅ 团队成员可以共享

---

## 📞 如果Cursor不支持某些功能

如果您的Cursor版本不支持某些功能，请：

1. **检查Cursor版本**
   - 确保使用最新版本
   - 某些功能可能需要Cursor Pro

2. **使用项目记录文件**
   - 这是最可靠的方法
   - 不依赖Cursor功能

3. **联系Cursor支持**
   - 询问功能可用性
   - 获取设置帮助

---

**🎉 推荐使用项目记录文件方法，最可靠且不依赖Cursor版本！**

