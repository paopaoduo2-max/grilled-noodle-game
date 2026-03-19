import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;
import { RiceBundleManager } from '../Manager/RiceBundleManager';
import { RiceBundleConfig } from '../Data/RiceBundleConfig';

/**
 * 东北饭包测试脚本
 * 用于验证东北饭包关卡的功能
 */
@ccclass('RiceBundleTest')
export class RiceBundleTest extends Component {
    private _manager: RiceBundleManager = null;
    private _testResults: string[] = [];

    /**
     * 开始测试
     */
    public start() {
        console.log('[RiceBundleTest] 开始东北饭包功能测试');
        this.runAllTests();
    }

    /**
     * 运行所有测试
     */
    private runAllTests() {
        this.testConfig();
        this.testManager();
        this.testCookingSystem();
        this.testPrepareSystem();
        this.testUIExtension();
        
        this.printTestResults();
    }

    /**
     * 测试配置
     */
    private testConfig() {
        console.log('[RiceBundleTest] 测试配置...');
        
        try {
            // 测试菜谱配置
            const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
            this.assert(recipe.id === 'dongbei_rice_bundle', '菜谱ID正确');
            this.assert(recipe.name === '东北饭包', '菜谱名称正确');
            this.assert(recipe.steps.length === 6, '步骤数量正确');
            this.assert(recipe.ingredients.length === 6, '食材数量正确');
            
            // 测试准备任务配置
            const tasks = RiceBundleConfig.PREPARE_TASKS;
            this.assert(tasks.length === 3, '准备任务数量正确');
            
            // 测试关卡配置
            const levelConfig = RiceBundleConfig.LEVEL_CONFIG;
            this.assert(levelConfig.levelId === 2, '关卡ID正确');
            this.assert(levelConfig.levelName.includes('东北饭包'), '关卡名称正确');
            
            this.logSuccess('配置测试通过');
        } catch (error) {
            this.logError('配置测试失败: ' + error.message);
        }
    }

    /**
     * 测试管理器
     */
    private testManager() {
        console.log('[RiceBundleTest] 测试管理器...');
        
        try {
            // 测试单例
            const manager1 = RiceBundleManager.init();
            const manager2 = RiceBundleManager.getInstance();
            this.assert(manager1 === manager2, '单例模式正确');
            
            // 测试启动
            const success = manager1.startLevel();
            this.assert(success === true, '管理器启动成功');
            
            // 测试阶段
            const phase = manager1.getCurrentPhase();
            this.assert(phase === 'prepare', '初始阶段正确');
            
            this.logSuccess('管理器测试通过');
        } catch (error) {
            this.logError('管理器测试失败: ' + error.message);
        }
    }

    /**
     * 测试制作系统
     */
    private testCookingSystem() {
        console.log('[RiceBundleTest] 测试制作系统...');
        
        try {
            const manager = RiceBundleManager.getInstance();
            if (!manager) {
                this.logError('管理器未初始化');
                return;
            }

            // 模拟用户输入
            const clickResult = manager.handleUserInput('click');
            this.assert(typeof clickResult === 'boolean', '点击输入处理正确');
            
            // 测试进度获取
            const progress = manager.getCookingProgress();
            this.assert(typeof progress === 'number', '进度获取正确');
            
            this.logSuccess('制作系统测试通过');
        } catch (error) {
            this.logError('制作系统测试失败: ' + error.message);
        }
    }

    /**
     * 测试准备系统
     */
    private testPrepareSystem() {
        console.log('[RiceBundleTest] 测试准备系统...');
        
        try {
            const manager = RiceBundleManager.getInstance();
            if (!manager) {
                this.logError('管理器未初始化');
                return;
            }

            // 测试准备状态
            const isPreparing = manager.isPreparing();
            this.assert(typeof isPreparing === 'boolean', '准备状态获取正确');
            
            // 测试准备进度
            const progress = manager.getPrepareProgress();
            this.assert(typeof progress === 'number', '准备进度获取正确');
            
            this.logSuccess('准备系统测试通过');
        } catch (error) {
            this.logError('准备系统测试失败: ' + error.message);
        }
    }

    /**
     * 测试UI扩展
     */
    private testUIExtension() {
        console.log('[RiceBundleTest] 测试UI扩展...');
        
        try {
            const manager = RiceBundleManager.getInstance();
            if (!manager) {
                this.logError('管理器未初始化');
                return;
            }

            // 测试重置功能
            manager.resetLevel();
            const phase = manager.getCurrentPhase();
            this.assert(phase === 'prepare', '重置后阶段正确');
            
            this.logSuccess('UI扩展测试通过');
        } catch (error) {
            this.logError('UI扩展测试失败: ' + error.message);
        }
    }

    /**
     * 断言检查
     */
    private assert(condition: boolean, message: string) {
        if (!condition) {
            throw new Error(`断言失败: ${message}`);
        }
    }

    /**
     * 记录成功
     */
    private logSuccess(message: string) {
        console.log(`✅ ${message}`);
        this._testResults.push(`✅ ${message}`);
    }

    /**
     * 记录错误
     */
    private logError(message: string) {
        console.error(`❌ ${message}`);
        this._testResults.push(`❌ ${message}`);
    }

    /**
     * 打印测试结果
     */
    private printTestResults() {
        console.log('\n=== 东北饭包测试结果 ===');
        this._testResults.forEach(result => console.log(result));
        
        const successCount = this._testResults.filter(r => r.includes('✅')).length;
        const totalCount = this._testResults.length;
        
        console.log(`\n总计: ${totalCount} 项测试`);
        console.log(`成功: ${successCount} 项`);
        console.log(`失败: ${totalCount - successCount} 项`);
        
        if (successCount === totalCount) {
            console.log('🎉 所有测试通过！东北饭包关卡功能正常！');
        } else {
            console.log('⚠️  部分测试失败，请检查相关功能');
        }
    }

    /**
     * 销毁时清理
     */
    protected onDestroy() {
        console.log('[RiceBundleTest] 测试脚本销毁');
    }
}
