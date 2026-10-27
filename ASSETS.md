# Assets

Every asset the game uses and where it came from. The game is private (Ken's Mac mini, about 5 players);
if it is ever published, replace anything borrowed with licensed or original art first.

| Asset                                                                                          | File / code                                                     | Source                                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Balls (normal, armored, upgrade star), shield ring, snake head, turret, bullet, spark particle | `src/game/textures.ts`                                          | Drawn in code with Phaser Graphics at boot (original)     |
| Goal pictures: hostage, champion, castle, village, shrine                                      | `src/game/textures.ts` (`makeGoals`)                            | Drawn in code (original placeholders until Ken's designs) |
| Sound effects (click, shoot, hit, crit, pop, upgrade, win, lose, blocked)                      | `src/game/audio.ts`                                             | Synthesized with WebAudio (original)                      |
| Music loop                                                                                     | `src/game/audio.ts` (`startMusic`)                              | Synthesized with WebAudio (original)                      |
| App icon                                                                                       | `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png` | Original SVG; PNGs rendered from it                       |
| Font                                                                                           | System UI font stack                                            | Device fonts, nothing bundled                             |

No third-party graphics or sounds are used yet. When adding one, add a row with the file and its source URL.
