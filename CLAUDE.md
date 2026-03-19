# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 2D cooking simulation game called "东北料理王" (Northeast Cuisine Master), built with **Cocos Creator 3.8.7** and **TypeScript**. Inspired by "Sausage Man", players run a food stall, prepare ingredients, and serve customers across 8 levels featuring Northeast Chinese cuisine.

## Development Environment

### Running the Game
- **Preview**: Press `Ctrl+P` (Windows) or `Cmd+P` (Mac) in Cocos Creator, or click the preview button
- **Build**: Use Cocos Creator's Build panel (Project → Build) for web-desktop, web-mobile, iOS, Android, Windows, or Mac
- **TypeScript Compilation**: Automatic in-editor compilation on save

### Debugging
- Browser console is accessible during preview (F12)
- GameManager instance available at `window['GameManager'].Instance` for runtime inspection
- All major systems log with prefixes: `[GameManager]`, `[CustomerManager]`, `[CookingSystem]`, etc.

### Cocos Creator MCP Server
This project includes a Cocos Creator MCP server extension that enables tool-based operations on scenes, nodes, components, assets, and more. The server provides tools for:
- Scene management and queries
- Node creation, modification, and hierarchy operations
- Component management and property setting
- Asset operations and queries
- Project build and preview control

## Architecture

### Core Design Patterns

**Singleton Pattern**
- `GameManager` - Global state manager, persists across scenes via `director.addPersistRootNode()`

**Layered Architecture**
```
UI Layer (MainMenuUI, PreparePhaseUI, CookingPhaseUI, ResultUI)
    ↓
Game Logic Layer (CustomerManager, CookingSystem, StepOperationSystem)
    ↓
Manager Layer (GameManager, LevelManager, SaveManager, AudioManager)
    ↓
Data Layer (GameConfig, enums, interfaces)
```

### Key Managers

**GameManager** (`assets/Scripts/Manager/GameManager.ts`)
- Central singleton for game state, scene transitions, and data persistence
- Methods: `startLevel(levelId, skipTutorial)`, `enterPreparePhase()`, `enterCookingPhase()`, `enterResultPhase()`
- Manages player money, ingredients inventory, session stats
- Uses `CameraManager` for scene transitions when available, falls back to `director.loadScene()`

**LevelManager** - Level loading and progression
**SaveManager** - LocalStorage persistence via `sys.localStorage`
**AudioManager** - BGM and SFX playback
**CameraManager** - Alternative scene switching using camera transitions

### Game Data Structure

**GameConfig** (`assets/Scripts/Data/GameConfig.ts`) is the single source of truth for:
- **8 Levels**: Tutorial + 7 main levels (烤冷面, 东北饭包, 煎饼果子, 麻辣烫, 铁板烧, 炸串, 烤肉拌饭, 东北乱炖)
- **Ingredient Types**: Enum defining all ingredients with aliases for compatibility
- **Recipes**: Each with multi-step cooking instructions (CLICK, HOLD, SWIPE, TIMING, DRAG, SEQUENCE)
- **Customer Types**: Normal (30s patience), VIP (45s, 2x tip), Urgent (15s, 1.5x tip)
- **Items/Power-ups**: Shopping cart, speed gloves, quality boost, etc.
- **Review templates**: Positive and negative review texts by cause

### Game Flow

```
MainMenu → Select Level
    ↓
PreparePhase (60-120s) → Buy ingredients with initial money
    ↓
CookingPhase (180-360s) → Serve customers, complete orders
    ↓
ResultPhase → Check if target money and customers met
    ↓
Pass → Unlock next level | Fail → Retry
```

Special: `RiceBundleScene` for the rice bundle level with custom preparation mechanics.

### Cooking System

**Step Types** (enum StepType):
- `CLICK` - Single tap
- `HOLD` - Hold for duration (progress bar)
- `SWIPE` - Swipe in direction (horizontal, vertical, circle)
- `TIMING` - Press within perfect window (0-1 range)
- `DRAG` - Drag ingredient to target
- `SEQUENCE` - Click N times in succession

**BaseCookingController** - Base class for level-specific cooking controllers

### Ingredient Type Aliases

GameConfig.ts includes aliases for backward compatibility (e.g., `NOODLE` and `DOUGH` both refer to 面饼). When adding new ingredients, use the `IngredientType` enum as the single source.

## Scene Structure

Located in `assets/Scenes/`:
- `MainMenu.scene` - Level selection and main menu
- `PrepareScene.scene` - Ingredient purchasing phase
- `CookingScene.scene` - Cooking and serving phase
- `ProcessingScene.scene` - Special preparation for complex dishes
- `ResultScene.scene` - Level completion summary
- `RiceBundleScene.scene` - Special scene for rice bundle level

## Code Conventions

- **File Naming**: PascalCase for classes matching filenames
- **Method Naming**: camelCase with descriptive names
- **Private Members**: Underscore prefix (`_playerMoney`)
- **Constants**: UPPER_SNAKE_CASE for enum values
- **Logging**: Prefix with system name in square brackets

### UI Development

- UI controllers auto-find nodes via `find()` if properties not bound in editor
- Bind properties in editor for better performance
- Temporary color coding used during development (to be replaced with assets)
- `UIFactory` provides utility methods for dynamic UI creation

### Property Binding

For Cocos Creator MCP operations:
1. Use `node_query` to get node UUID first
2. Use `component_query` to inspect component types and properties
3. Use `set_component_property` with explicit `propertyType` (required - no auto-detection)

## File Organization

```
assets/Scripts/
├── Data/           # GameConfig.ts, enums, interfaces
├── Manager/        # Singleton managers (GameManager, SaveManager, etc.)
├── Game/           # Game logic (CustomerManager, CookingSystem, etc.)
├── UI/             # UI controllers for each phase
├── Processing/     # Special preparation logic
├── Shop/           # Shop system
├── Settlement/     # Settlement/results logic
├── Config/         # AudioConfig, IngredientConfig, UIConfig
└── Utils/          # AudioManager, EventManager, ResourceManager
```

## Important Notes

### Scene Transitions
- Prefer `CameraManager` methods for smooth transitions
- Fallback to `director.loadScene()` if CameraManager unavailable
- GameManager persists across scenes - don't destroy manually

### Level Unlocking
- Levels unlock via `unlockThreshold` (global wallet balance requirement)
- Tutorial (level 0) and level 1 are free (threshold: 0)
- Subsequent levels require cumulative wallet balance

### Recipe Steps
When adding/modifying recipes in GameConfig:
1. Define `RecipeStep[]` with proper types
2. Include `perfectWindow` for TIMING steps (0-1 range)
3. Specify `direction` for SWIPE steps
4. Set `targetValue` for SEQUENCE steps (click count)
5. Add `duration` for HOLD steps (seconds)

### TypeScript Configuration
- Extends `./temp/tsconfig.cocos.json`
- `strict: false` - Type checking is relaxed
- Use `@ccclass` and `@property` decorators for Cocos components

## Testing

No formal unit tests - testing is manual via editor preview. Test scripts are in `assets/Scripts/Test/` for component verification.
