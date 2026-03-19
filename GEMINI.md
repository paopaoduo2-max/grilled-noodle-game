# GEMINI.md

## Project Overview

**Northeast Cuisine Master (东北料理王)** is a 2D simulation management game developed with **Cocos Creator 3.x** and **TypeScript**. Players manage a street food stall, starting with "Grilled Cold Noodles" (烤冷面), and progress through levels by preparing ingredients, cooking orders, and serving customers.

**Key Features:**
*   **Two-Phase Gameplay:** Preparation Phase (buy ingredients) and Cooking Phase (serve customers).
*   **Level System:** 7 progressive levels with different targets (Money/Customers).
*   **Customer System:** Various customer types (Normal, VIP, Impatient) with different patience levels.
*   **Architecture:** Singleton Game Manager, Event-driven communication, and Component-based UI.

## Building and Running

This project relies primarily on the **Cocos Creator Editor** for building and running.

### Prerequisites
*   **Cocos Creator:** Version 3.x
*   **Node.js/npm:** Required for editor internal tools (though no specific npm scripts are used for the game logic).

### Running the Game (Preview)
1.  **Open Project:** Launch Cocos Creator and open this directory (`D:\xm\NewProject2`).
2.  **Set Start Scene:**
    *   Go to `Project` -> `Project Settings`.
    *   Select the `Preview Run` tab.
    *   Set **Start Scene** to `MainMenu`.
3.  **Play:** Click the green **Play (Preview)** button at the top of the editor, or press `Ctrl+P` (Windows) / `Cmd+P` (Mac).

### Building for Release
Use the Cocos Creator **Build** panel (`Project` -> `Build`) to target platforms like Web Mobile, Web Desktop, Android, or iOS.

## Development Conventions

### Directory Structure
*   `assets/Scripts/`: Contains all game logic.
    *   `Data/`: Configuration files (e.g., `GameConfig.ts` for levels/recipes).
    *   `Manager/`: Global managers (e.g., `GameManager.ts`).
    *   `Game/`: Core game systems (`CustomerManager.ts`, `CookingSystem.ts`).
    *   `UI/`: UI controllers for each scene (`MainMenuUI.ts`, `PreparePhaseUI.ts`, etc.).
*   `assets/Scenes/`: The 4 main game scenes (`MainMenu`, `PrepareScene`, `CookingScene`, `ResultScene`).
*   `docs/`: Extensive project documentation.

### Coding Style
*   **Language:** TypeScript (Strictness: `false` in `tsconfig.json`).
*   **Architecture:**
    *   **Singleton:** `GameManager` controls global state.
    *   **Observer:** Events are used for cross-system communication.
    *   **UI:** UI elements are often referenced via `@property` decorators in Cocos Creator.
*   **Configuration:** Game data (levels, prices, recipes) is centralized in `assets/Scripts/Data/GameConfig.ts`.

### Assets
*   **UI:** Currently uses temporary placeholders (solid colors/text). Designed for easy replacement with final art assets.
*   **Resources:** Located in `assets/Resources` for dynamic loading.

## Documentation
Refer to the `docs/` folder or root Markdown files for detailed guides:
*   `README.md`: General project overview.
*   `⚡立即运行指南.md`: Quick start guide.
*   `代码结构说明.md`: detailed architectural explanation.
*   `游戏使用说明.md`: Game manual.
