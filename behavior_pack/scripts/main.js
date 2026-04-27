import { world, system } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const STRUCTURE_ID = "lars:bellas_birch_edit";

const MAGIC_LEAVES_ID = "lars:magic_oak_leaves";
const MAGIC_PARTICLE_ID = "lars:magic_oak_particle";

// Drift particles below magic oak leaves. Sample random blocks in a small
// box around each player; if the block is leaves and the cell below it is
// passable, emit one particle there. Keeps it visually subtle and avoids
// scanning every leaf block every tick.
const PARTICLE_INTERVAL_TICKS = 5;
const PARTICLE_SAMPLES_PER_PLAYER = 64;
const PARTICLE_RADIUS_XZ = 14;
const PARTICLE_RADIUS_Y = 8;
const PARTICLE_SPAWN_CHANCE = 0.85;

// bellas_birch_edit is 15x25x15 with the trunk anchored at bottom-centre.
// /structure load places the corner at the load position, so we shift back
// by half the X/Z extent. The structure is square in X/Z, so a centred
// trunk stays on the sapling under any 90-degree rotation.
const LOAD_OFFSET = { x: -7, y: 0, z: -7 };

// Tree-only bounding box (canopy + trunk), measured from the sapling.
// The full .mcstructure is larger but mostly structure_void, so this is
// what actually needs to be clear for the tree to fit.
const TREE_MIN_X = -5;
const TREE_MAX_X = 4;
const TREE_MIN_Y = 0;
const TREE_MAX_Y = 14;
const TREE_MIN_Z = -5;
const TREE_MAX_Z = 4;

const ROTATIONS = ["0_degrees", "90_degrees", "180_degrees", "270_degrees"];

const BONEMEAL_GROW_CHANCE = 0.2;

const NATURAL_INTERVAL_TICKS = 600;
const NATURAL_GROW_CHANCE = 0.1;
const NATURAL_SAMPLES_PER_PLAYER = 6;

// Allow the tree to grow through air, our own sapling, and any vanilla
// plant/leaf/flower/crop/snow-layer block. Solid lookalikes like
// grass_block remain blockers.
function canGrowThrough(block) {
  if (!block) return false;
  const id = block.typeId;
  if (id === "minecraft:air") return true;
  if (id === SAPLING_ID) return true;
  if (id === "minecraft:grass_block") return false;
  if (id === "minecraft:mycelium") return false;
  if (id === "minecraft:podzol") return false;
  if (id === "minecraft:dirt") return false;
  try {
    if (block.hasTag("plant")) return true;
    if (block.hasTag("crop")) return true;
  } catch (_) {}
  return (
    id.includes("leaves") ||
    id.includes("sapling") ||
    id.includes("flower") ||
    id.includes("fern") ||
    id.includes("vine") ||
    id.includes("bush") ||
    id.includes("mushroom") ||
    id.includes("seedling") ||
    id.includes("crop") ||
    id.includes("sprout") ||
    id.includes("tallgrass") ||
    id === "minecraft:short_grass" ||
    id === "minecraft:tall_grass" ||
    id === "minecraft:wheat" ||
    id === "minecraft:carrots" ||
    id === "minecraft:potatoes" ||
    id === "minecraft:beetroot" ||
    id === "minecraft:snow_layer" ||
    id === "minecraft:dandelion"
  );
}

function isAreaClear(dim, x, y, z) {
  for (let dx = TREE_MIN_X; dx <= TREE_MAX_X; dx++) {
    for (let dy = TREE_MIN_Y; dy <= TREE_MAX_Y; dy++) {
      for (let dz = TREE_MIN_Z; dz <= TREE_MAX_Z; dz++) {
        try {
          const b = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
          if (!canGrowThrough(b)) return false;
        } catch (_) {
          return false;
        }
      }
    }
  }
  return true;
}

function loadStructure(dim, x, y, z) {
  if (!isAreaClear(dim, x, y, z)) return false;
  const lx = x + LOAD_OFFSET.x;
  const ly = y + LOAD_OFFSET.y;
  const lz = z + LOAD_OFFSET.z;
  const rotation = ROTATIONS[Math.floor(Math.random() * ROTATIONS.length)];
  try {
    const r = dim.runCommand(`structure load ${STRUCTURE_ID} ${lx} ${ly} ${lz} ${rotation}`);
    return r && r.successCount > 0;
  } catch (_) {
    return false;
  }
}

function growSapling(block) {
  if (!block || block.typeId !== SAPLING_ID) return false;
  const dim = block.dimension;
  const { x, y, z } = block.location;
  if (!loadStructure(dim, x, y, z)) return false;
  try { block.setType("minecraft:air"); } catch (_) {}
  return true;
}

function consumeBoneMeal(player) {
  try {
    const gm = String(player.getGameMode?.() ?? "").toLowerCase();
    if (gm.includes("creative")) return;
    const inv = player.getComponent("minecraft:inventory");
    const slot = player.selectedSlotIndex ?? 0;
    const item = inv?.container?.getItem(slot);
    if (!item || item.typeId !== "minecraft:bone_meal") return;
    if (item.amount > 1) {
      item.amount -= 1;
      inv.container.setItem(slot, item);
    } else {
      inv.container.setItem(slot, undefined);
    }
  } catch (_) {}
}

// AFTER event does not fire on our sapling (no collision), kept as a
// safety net in case Mojang fixes that in a future build.
try {
  world.afterEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      if (event.player) consumeBoneMeal(event.player);
      if (Math.random() < BONEMEAL_GROW_CHANCE) growSapling(event.block);
    } catch (_) {}
  });
} catch (_) {}

// BEFORE event is the actual bone-meal -> grow path for our sapling.
// isFirstEvent must be filtered here too - holding right-click otherwise
// fires the handler every tick and a single 0.2 roll inside a few-tick
// hold turns 1-in-5 odds into "grows on the very first click".
try {
  world.beforeEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      const block = event.block;
      const player = event.player;
      system.run(() => {
        if (player) consumeBoneMeal(player);
        if (Math.random() < BONEMEAL_GROW_CHANCE) growSapling(block);
      });
    } catch (_) {}
  });
} catch (_) {}

try {
  system.runInterval(() => {
    try {
      for (const player of world.getAllPlayers()) {
        const dim = player.dimension;
        const px = Math.floor(player.location.x);
        const py = Math.floor(player.location.y);
        const pz = Math.floor(player.location.z);
        for (let i = 0; i < NATURAL_SAMPLES_PER_PLAYER; i++) {
          const dx = Math.floor(Math.random() * 33) - 16;
          const dy = Math.floor(Math.random() * 11) - 5;
          const dz = Math.floor(Math.random() * 33) - 16;
          let block;
          try { block = dim.getBlock({ x: px + dx, y: py + dy, z: pz + dz }); } catch (_) { continue; }
          if (!block || block.typeId !== SAPLING_ID) continue;
          if (Math.random() < NATURAL_GROW_CHANCE) growSapling(block);
        }
      }
    } catch (_) {}
  }, NATURAL_INTERVAL_TICKS);
} catch (_) {}

function isPassableBelowLeaves(block) {
  if (!block) return false;
  const id = block.typeId;
  if (id === "minecraft:air") return true;
  if (id === "minecraft:cave_air") return true;
  if (id === "minecraft:void_air") return true;
  if (id === MAGIC_LEAVES_ID) return true;
  return false;
}

try {
  system.runInterval(() => {
    try {
      for (const player of world.getAllPlayers()) {
        const dim = player.dimension;
        const px = Math.floor(player.location.x);
        const py = Math.floor(player.location.y);
        const pz = Math.floor(player.location.z);
        for (let i = 0; i < PARTICLE_SAMPLES_PER_PLAYER; i++) {
          const dx = Math.floor(Math.random() * (PARTICLE_RADIUS_XZ * 2 + 1)) - PARTICLE_RADIUS_XZ;
          const dy = Math.floor(Math.random() * (PARTICLE_RADIUS_Y * 2 + 1)) - PARTICLE_RADIUS_Y;
          const dz = Math.floor(Math.random() * (PARTICLE_RADIUS_XZ * 2 + 1)) - PARTICLE_RADIUS_XZ;
          const x = px + dx;
          const y = py + dy;
          const z = pz + dz;
          let leaves;
          try { leaves = dim.getBlock({ x, y, z }); } catch (_) { continue; }
          if (!leaves || leaves.typeId !== MAGIC_LEAVES_ID) continue;
          let below;
          try { below = dim.getBlock({ x, y: y - 1, z }); } catch (_) { continue; }
          if (!isPassableBelowLeaves(below)) continue;
          if (Math.random() >= PARTICLE_SPAWN_CHANCE) continue;
          const ox = x + 0.15 + Math.random() * 0.7;
          const oz = z + 0.15 + Math.random() * 0.7;
          const oy = y - 0.05;
          try { dim.spawnParticle(MAGIC_PARTICLE_ID, { x: ox, y: oy, z: oz }); } catch (_) {}
        }
      }
    } catch (_) {}
  }, PARTICLE_INTERVAL_TICKS);
} catch (_) {}
