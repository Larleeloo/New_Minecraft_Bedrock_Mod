# New Minecraft Bedrock Mod

Fresh Bedrock add-on. Features are ported over from `Larsons_Bedrock_Mod`
one at a time after each one passes in-game error checks.

## Current contents

- `lars:glow_block` - full-cube light source (light_emission 15, opaque)
- `lars:neon_oak_sapling_red` - red neon sapling, bone-meal grows it into a
  vanilla oak tree via the `placefeature minecraft:oak_tree_feature` command

## Required binary assets

These PNG files cannot be committed through the GitHub API used to seed this
repo and must be copied over from `Larsons_Bedrock_Mod` before the pack will
load cleanly:

- `behavior_pack/pack_icon.png`
- `resource_pack/pack_icon.png`
- `resource_pack/textures/blocks/lars_glow_block.png`
- `resource_pack/textures/blocks/neon_oak_sapling_red.png`

## Layout

```
behavior_pack/
  manifest.json
  blocks/
    glow_block.json
    neon_oak_sapling_red.json
  scripts/
    main.js               (sapling bone-meal growth)
resource_pack/
  manifest.json
  blocks.json
  textures/
    terrain_texture.json
    blocks/
      lars_glow_block.png         (copy from source repo)
      neon_oak_sapling_red.png    (copy from source repo)
  models/
    blocks/
      sapling.geo.json    (cross-shape sapling geometry)
  texts/
    en_US.lang
    languages.json
```

## Versions

- Block `format_version`: `1.26.10` (current Bedrock Wiki documented schema)
- Manifest `min_engine_version`: `[1, 26, 13]`
- RP `blocks.json` `format_version`: `1.19.30`
- Geometry `format_version`: `1.16.0`
- `@minecraft/server`: `2.0.0` (engine promotes to its latest available)

## What was deliberately omitted from the sapling port

To keep this safe vs. the v1.0.31 crash:

- No custom dimension registration (`system.beforeEvents.startup` is the
  surface that crashed in v1.0.30 / v1.0.31).
- No custom tree features under `behavior_pack/features/` - we use the
  vanilla `minecraft:oak_tree_feature` instead.
- No automatic random-tick growth scan; bone-meal only.
- No `scriptEventReceive` dimension-teleport hooks.
- No `minecraft:flammable` on the sapling.

We can add any of these back individually once this baseline is confirmed
stable.
