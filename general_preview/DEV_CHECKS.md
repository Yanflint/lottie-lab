# Dev checks

Install once:
```bash
npm i
```

Run full gate (syntax + types + bundle):
```bash
npm run check
```

- **eslint**: ловит синтаксис/опечатки (ESM, browser).
- **tsc**: проверяет *.js c `checkJs`: ловит синтаксис и базовые типовые ошибки, ничего не эмитит.
- **esbuild**: собирает `src/app/main.js` в `.check-dist/` — отлавливает синтакс/импорты.

Tip: добавь pre-commit hook (husky/lint-staged), если захочешь автоматически проверять перед коммитом.
