import { _decorator, Component, Camera, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 相机管理器 - 管理单场景多相机切换
 */
@ccclass('CameraManager')
export class CameraManager extends Component {
    @property(Camera)
    menuCamera: Camera = null;

    @property(Camera)
    prepareCamera: Camera = null;

    @property(Camera)
    cookingCamera: Camera = null;

    @property(Camera)
    resultCamera: Camera = null;

    @property(Node)
    menuCanvas: Node = null;

    @property(Node)
    prepareCanvas: Node = null;

    @property(Node)
    cookingCanvas: Node = null;

    @property(Node)
    resultCanvas: Node = null;

    private static _instance: CameraManager = null;

    /**
     * 获取单例
     */
    public static getInstance(): CameraManager {
        return this._instance;
    }

    onLoad() {
        // 设置单例
        if (CameraManager._instance) {
            console.warn('[CameraManager] 已存在实例，销毁当前节点');
            this.node.destroy();
            return;
        }
        CameraManager._instance = this;

        console.log('[CameraManager] 初始化相机管理器');
        
        // 默认显示主菜单
        this.switchToMenu();
    }

    /**
     * 切换到主菜单
     */
    public switchToMenu() {
        console.log('[CameraManager] 切换到主菜单');
        this._activateCamera(this.menuCamera, this.menuCanvas);
    }

    /**
     * 切换到准备阶段
     */
    public switchToPrepare() {
        console.log('[CameraManager] 切换到准备阶段');
        this._activateCamera(this.prepareCamera, this.prepareCanvas);
    }

    /**
     * 切换到烹饪阶段
     */
    public switchToCooking() {
        console.log('[CameraManager] 切换到烹饪阶段');
        this._activateCamera(this.cookingCamera, this.cookingCanvas);
    }

    /**
     * 切换到结算界面
     */
    public switchToResult() {
        console.log('[CameraManager] 切换到结算界面');
        this._activateCamera(this.resultCamera, this.resultCanvas);
    }

    /**
     * 激活指定相机和Canvas
     */
    private _activateCamera(targetCamera: Camera, targetCanvas: Node) {
        // 禁用所有相机
        if (this.menuCamera) this.menuCamera.enabled = false;
        if (this.prepareCamera) this.prepareCamera.enabled = false;
        if (this.cookingCamera) this.cookingCamera.enabled = false;
        if (this.resultCamera) this.resultCamera.enabled = false;

        // 隐藏所有Canvas
        if (this.menuCanvas) this.menuCanvas.active = false;
        if (this.prepareCanvas) this.prepareCanvas.active = false;
        if (this.cookingCanvas) this.cookingCanvas.active = false;
        if (this.resultCanvas) this.resultCanvas.active = false;

        // 启用目标相机和Canvas
        if (targetCamera) {
            targetCamera.enabled = true;
        }
        if (targetCanvas) {
            targetCanvas.active = true;
        }
    }

    onDestroy() {
        if (CameraManager._instance === this) {
            CameraManager._instance = null;
        }
    }
}

