# Agent Guidelines for Tablatura Project

## Build/Lint/Test Commands
- **No build tools**: This is a vanilla JavaScript project with no npm/package.json
- **No linting**: No ESLint or similar configured
- **No testing**: No test framework or test files present
- **Run single test**: N/A - no tests exist
- **Serve locally**: Open `index.html` in a web browser

## Code Style Guidelines

### Language Features
- Use ES6+ features: classes, arrow functions, destructuring, spread operator, template literals
- Prefer `const` for immutable variables, `let` for mutable ones
- Avoid `var`

### Naming Conventions
- **Classes**: PascalCase (e.g., `Tablatura`, `Nota`, `Afinacao`)
- **Variables/Functions**: camelCase (e.g., `appState`, `renderDependingOnWindowSize`)
- **Constants**: UPPER_SNAKE_CASE for dictionaries (e.g., `dicionarioNotas`, `dicionarioTons`)

### Formatting
- **Indentation**: 2 spaces
- **Semicolons**: Required at end of statements
- **Quotes**: Inconsistent usage - prefer double quotes for consistency
- **Line length**: No strict limit, break long lines naturally

### Structure & Organization
- **Classes**: One class per file in `js/classes/` directory
- **Config**: Global configuration in `js/config.js`
- **Utils**: Utility functions in `js/utils.js`
- **Main**: Application logic in `js/main.js`
- **Script loading**: Load scripts in dependency order in `index.html`

### Comments & Documentation
- Use JSDoc-style comments for public methods and complex logic
- Add inline comments for complex algorithms or business logic
- Document function parameters and return types where helpful

### Error Handling
- Use `console.error()` for errors
- Use `console.log()` for debugging (remove in production)
- Handle edge cases gracefully in music notation parsing

### DOM Manipulation
- Use jQuery for DOM operations (already included)
- Follow existing patterns for event handlers and element selection
- Use semantic HTML element IDs matching existing conventions

### Music-Specific Conventions
- Notes use standard western notation (C, D, E, F, G, A, B)
- Support both sharps (#) and flats (b)
- Handle octave calculations (12 notes per octave)
- Preserve tablature formatting and spacing