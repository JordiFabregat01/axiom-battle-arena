# Card splash art

Drop images here and they become cards. No code changes needed: the folder is scanned when the app starts (and while `npm run dev` runs), and the result is written to `src/engine/cards.art.json` for the browser and the game server.

## File names

```
<name>_<R>.jpg        e.g.  sleepy-fox_C.jpg   thaedus(the-tiger-deiety)_M.jpg
```

- `<name>` becomes the card id (lower-case, dashes) and, unless overridden, the display name: `desert-griffo` → "Desert Griffo", `thaedus(the-tiger-deiety)` → "Thaedus (The Tiger Deiety)".
- `<R>` is the rarity letter: **C** common · **U** uncommon · **R** rare · **E** epic · **L** legendary · **M** mythic · **S** singularity.
- Exclusive letters make cards that never drop from packs: **Q** story quest reward (the card a quest line unlocks; its id is referenced in `src/engine/story.ts`), **X** season reward, **P** Plus membership. They count as legendary unless `cards.custom.json` says otherwise.
- A file with no suffix whose name matches an existing card id (for example `euler.jpg`) just supplies art for that card.
- Formats: JPG, PNG or WebP. Any size; **landscape works best** (the art window is 16:10). Subjects should sit in the middle; the sides are cropped on narrow cards. 1408×768 is fine; WebP at ~1000 px wide keeps pages fast.
- White or transparent backgrounds are fine: the art sits on a light plate inside the card frame.

## Everything else about a card

`src/engine/cards.custom.json` holds optional details per card id: `name`, `kind` (`beast` or `character`), `domain`, `symbol`, `flavor`, `power`, `rarity`. Missing fields get sensible defaults.

Cards defined in `src/engine/cards.ts` (the built-in roster) and cards from this folder are merged into one catalog; pull odds are recomputed from the total per rarity and printed on every card.
