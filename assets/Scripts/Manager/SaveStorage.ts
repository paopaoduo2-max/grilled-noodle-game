import { native, sys } from 'cc';

export interface SaveIndex {
    auto: string[];
    manual: string[];
}

type SaveType = 'auto' | 'manual';

export class SaveStorage {
    private static readonly SAVE_DIR_NAME = 'saves';
    private static readonly BACKUP_DIR_NAME = 'saves/backups';
    private static readonly INDEX_FILE_NAME = 'save_index.json';
    private static readonly MAX_BACKUPS = 3;

    static isFileBackend(): boolean {
        return !!(sys.isNative && (native as any)?.fileUtils);
    }

    static buildSaveFileName(type: SaveType, saveId: string): string {
        return `${type}_${saveId}.json`;
    }

    static readIndex(): SaveIndex | null {
        if (!this.isFileBackend()) return null;
        const path = this.getIndexPath();
        const content = this.readFile(path);
        if (!content) return null;
        try {
            return JSON.parse(content) as SaveIndex;
        } catch (e) {
            console.warn('[SaveStorage] 索引解析失败', e);
            return null;
        }
    }

    static writeIndex(index: SaveIndex): void {
        if (!this.isFileBackend()) return;
        this.ensureDirectories();
        this.writeFileAtomic(this.getIndexPath(), JSON.stringify(index));
    }

    static readSave(type: SaveType, saveId: string): string | null {
        if (!this.isFileBackend()) return null;
        const path = this.getSavePath(type, saveId);
        return this.readFile(path);
    }

    static writeSave(type: SaveType, saveId: string, dataStr: string): void {
        if (!this.isFileBackend()) return;
        this.ensureDirectories();
        const path = this.getSavePath(type, saveId);
        this.backupFile(path, `${type}_${saveId}`);
        this.writeFileAtomic(path, dataStr);
    }

    static deleteSave(type: SaveType, saveId: string): void {
        if (!this.isFileBackend()) return;
        const path = this.getSavePath(type, saveId);
        this.removeFile(path);
    }

    static clearAll(index: SaveIndex): void {
        if (!this.isFileBackend()) return;
        for (const id of index.auto) {
            this.deleteSave('auto', id);
        }
        for (const id of index.manual) {
            this.deleteSave('manual', id);
        }
        this.removeFile(this.getIndexPath());
    }

    private static getFileUtils(): any {
        return (native as any).fileUtils;
    }

    private static getWritablePath(): string {
        const fileUtils = this.getFileUtils();
        if (!fileUtils) return '';
        const base = fileUtils.getWritablePath ? fileUtils.getWritablePath() : '';
        if (!base) return '';
        return base.endsWith('/') || base.endsWith('\\') ? base : `${base}/`;
    }

    private static getSaveDirPath(): string {
        return `${this.getWritablePath()}${this.SAVE_DIR_NAME}/`;
    }

    private static getBackupDirPath(): string {
        return `${this.getWritablePath()}${this.BACKUP_DIR_NAME}/`;
    }

    private static getIndexPath(): string {
        return `${this.getSaveDirPath()}${this.INDEX_FILE_NAME}`;
    }

    private static getSavePath(type: SaveType, saveId: string): string {
        return `${this.getSaveDirPath()}${this.buildSaveFileName(type, saveId)}`;
    }

    private static ensureDirectories(): void {
        const fileUtils = this.getFileUtils();
        if (!fileUtils) return;
        const saveDir = this.getSaveDirPath();
        const backupDir = this.getBackupDirPath();
        if (typeof fileUtils.createDirectory === 'function') {
            fileUtils.createDirectory(saveDir);
            fileUtils.createDirectory(backupDir);
            return;
        }
        if (!fileUtils.isDirectoryExist?.(saveDir)) {
            fileUtils.createDirectory?.(saveDir);
        }
        if (!fileUtils.isDirectoryExist?.(backupDir)) {
            fileUtils.createDirectory?.(backupDir);
        }
    }

    private static readFile(path: string): string | null {
        const fileUtils = this.getFileUtils();
        if (!fileUtils || !fileUtils.isFileExist?.(path)) return null;
        const reader = fileUtils.getStringFromFile || fileUtils.readStringFromFile;
        if (typeof reader !== 'function') return null;
        try {
            return reader.call(fileUtils, path) as string;
        } catch (e) {
            console.warn('[SaveStorage] 读取失败', e);
            return null;
        }
    }

    private static writeFile(path: string, data: string): boolean {
        const fileUtils = this.getFileUtils();
        if (!fileUtils) return false;
        const writer = fileUtils.writeStringToFile;
        if (typeof writer !== 'function') return false;
        try {
            return !!writer.call(fileUtils, data, path);
        } catch (e) {
            console.warn('[SaveStorage] 写入失败', e);
            return false;
        }
    }

    private static writeFileAtomic(path: string, data: string): void {
        const fileUtils = this.getFileUtils();
        if (!fileUtils) return;
        const tmpPath = `${path}.tmp`;
        const ok = this.writeFile(tmpPath, data);
        if (!ok) {
            this.writeFile(path, data);
            return;
        }
        if (typeof fileUtils.renameFile === 'function') {
            if (fileUtils.isFileExist?.(path)) {
                fileUtils.removeFile?.(path);
            }
            const renamed = fileUtils.renameFile(tmpPath, path);
            if (!renamed) {
                this.writeFile(path, data);
                fileUtils.removeFile?.(tmpPath);
            }
        } else {
            this.writeFile(path, data);
            fileUtils.removeFile?.(tmpPath);
        }
    }

    private static backupFile(path: string, prefix: string): void {
        const fileUtils = this.getFileUtils();
        if (!fileUtils || !fileUtils.isFileExist?.(path)) return;
        const timestamp = Date.now();
        const backupName = `${prefix}_${timestamp}.json`;
        const backupPath = `${this.getBackupDirPath()}${backupName}`;

        if (typeof fileUtils.copyFile === 'function') {
            fileUtils.copyFile(path, backupPath);
        } else {
            const content = this.readFile(path);
            if (content) {
                this.writeFile(backupPath, content);
            }
        }

        this.cleanupBackups(prefix);
    }

    private static cleanupBackups(prefix: string): void {
        const fileUtils = this.getFileUtils();
        if (!fileUtils || typeof fileUtils.listFiles !== 'function') return;
        const backupDir = this.getBackupDirPath();
        const files: string[] = fileUtils.listFiles(backupDir) || [];
        const matched = files.filter(file => file.includes(`${prefix}_`) && file.endsWith('.json'));
        if (matched.length <= this.MAX_BACKUPS) return;
        matched.sort((a, b) => this.extractTimestamp(a) - this.extractTimestamp(b));
        while (matched.length > this.MAX_BACKUPS) {
            const target = matched.shift();
            if (target) {
                this.removeFile(target);
            }
        }
    }

    private static extractTimestamp(filePath: string): number {
        const match = filePath.match(/_(\d+)\.json$/);
        if (!match) return 0;
        return parseInt(match[1], 10) || 0;
    }

    private static removeFile(path: string): void {
        const fileUtils = this.getFileUtils();
        if (!fileUtils || !fileUtils.isFileExist?.(path)) return;
        fileUtils.removeFile?.(path);
    }
}
