# New Minecraft Bedrock Mod

Fresh Bedrock add-on. Starts from a single working block; features will be
ported over from `Larsons_Bedrock_Mod` one at a time after each one passes
in-game error checks.

## Current contents

- `lars:glow_block` - full-cube light source (light_emission 15, opaque)

## Required binary assets

These PNG files cannot be committed through the GitHub API used to seed this
repo and must be copied over from `Larsons_Bedrock_Mod` before the pack will
load cleanly:

- `behavior_pack/pack_icon.png`
- `resource_pack/pack_icon.png`
- `resource_pack/textures/blocks/lars_glow_block.png`

## Layout

```
behavior_pack/
  manifest.json
  blocks/
    glow_block.json
resource_pack/
  manifest.json
  blocks.json
  textures/
    terrain_texture.json
    blocks/
      lars_glow_block.png   (copy from source repo)
  texts/
    en_US.lang
    languages.json
```

## Versions

- Block `format_version`: `1.21.120` (matches the version `glow_block.json`
  loaded successfully under in the source mod's v1.0.31 logs)
- Manifest `min_engine_version`: `1.21.120`
- RP `blocks.json` `format_version`: `1.19.30`
