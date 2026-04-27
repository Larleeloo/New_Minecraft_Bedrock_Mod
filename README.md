# New Minecraft Bedrock Mod

Fresh Bedrock add-on. Features are ported over from `Larsons_Bedrock_Mod`
one at a time after each one passes in-game error checks.

## Current contents

- `lars:glow_block` - full-cube light source (light_emission 15, opaque)
- `lars:neon_oak_sapling_red` - red neon sapling, bone-meal grows it into a
  vanilla oak tree via the `placefeature minecraft:oak_tree_feature` command
- `lars:magic_oak_log` - pillar-rotating log with animated bark + top
  (5-frame flipbook), light_emission 8
- `lars:magic_oak_leaves` - alpha-tested leaves, animated 5-frame flipbook,
  light_emission 8, drifts `lars:magic_oak_particle` from the underside
- `lars:magic_oak_leaf_litter` - flat 1px-tall litter that places on
  dirt/grass/podzol/mycelium/moss/farmland and on `lars:magic_oak_log`,
  animated 5-frame flipbook, light_emission 8
- `lars:magic_oak_particle` - small drifting dust used by the leaves

## Required binary assets

These PNG files cannot be committed through the GitHub API used to seed this
repo and must be copied over from `Larsons_Bedrock_Mod` (or supplied
directly) before the pack will load cleanly:

- `behavior_pack/pack_icon.png`
- `resource_pack/pack_icon.png`
- `resource_pack/textures/blocks/lars_glow_block.png`
- `resource_pack/textures/blocks/neon_oak_sapling_red.png`
- `resource_pack/textures/blocks/magic_oak_log.png` (vertical 16x80, 5 frames)
- `resource_pack/textures/blocks/magic_oak_log_top.png` (vertical 16x80, 5 frames)
- `resource_pack/textures/blocks/magic_oak_leaves.png` (vertical 16x80, 5 frames)
- `resource_pack/textures/blocks/magic_oak_leaf_litter.png` (vertical 16x80, 5 frames)
- `resource_pack/textures/particle/magic_oak_particle.png` (16x16)

The animated block textures are wired up in
`resource_pack/textures/flipbook_textures.json` at 6 ticks per frame.

## Layout

```
behavior_pack/
  manifest.json
  blocks/
    glow_block.json
    neon_oak_sapling_red.json
    magic_oak_log.json
    magic_oak_leaves.json
    magic_oak_leaf_litter.json
  scripts/
    main.js               (sapling bone-meal growth + leaf particles)
resource_pack/
  manifest.json
  blocks.json
  particles/
    magic_oak_particle.json
  textures/
    terrain_texture.json
    flipbook_textures.json
    blocks/
      lars_glow_block.png         (copy from source repo)
      neon_oak_sapling_red.png    (copy from source repo)
      magic_oak_log.png           (5-frame vertical sheet)
      magic_oak_log_top.png       (5-frame vertical sheet)
      magic_oak_leaves.png        (5-frame vertical sheet)
      magic_oak_leaf_litter.png   (5-frame vertical sheet)
    particle/
      magic_oak_particle.png      (16x16)
  models/
    blocks/
      sapling.geo.json    (cross-shape sapling geometry)
      leaf_litter.geo.json (flat 16x1x16 carpet geometry)
  texts/
    en_US.lang
    languages.json
```

## Versions

- Block `format_version`: `1.26.10` (current Bedrock Wiki documented schema)
- Manifest `min_engine_version`: `[1, 26, 13]`
- RP `blocks.json` `format_version`: `1.19.30`
- Geometry `format_version`: `1.16.0`
- Particle `format_version`: `1.10.0`
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
