import { world, system } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const STRUCTURE_ID = "lars:bellas_birch_edit";

// bellas_birch_edit is 15w x 25h x 15d with the trunk anchored at the
// bottom-centre. /structure load places the corner at the load position,
// so we shift back by half the X/Z extent.
const LOAD_OFFSET = { x: -7, y: 0, z: -7 };

// Bounding box of the actual TREE inside the structure (the canopy + trunk),
// measured from the sapling block. structure_void cells around it mean the
// loader won't trample existing blocks, but we still gate growth on this
// volume being clear so trees don't half-grow into walls. Roughly 10x15x10
// per the user's measurement.
const TREE_MIN_X = -5;
const TREE_MAX_X = 4;
const TREE_MIN_Y = 0;
const TREE_MAX_Y = 14;
const TREE_MIN_Z = -5;
const TREE_MAX_Z = 4;

const BONEMEAL_GROW_CHANCE = 0.2;

const NATURAL_INTERVAL_TICKS = 600;
const NATURAL_GROW_CHANCE = 0.1;
const NATURAL_SAMPLES_PER_PLAYER = 6;

function isAreaClear(dim, x, y, z, minX, maxX, minY, maxY, minZ, maxZ) {
  for (let dx = minX; dx <= maxX; dx++) {
    for (let dy = minY; dy <= maxY; dy++) {
      for (let dz = minZ; dz <= maxZ; dz++) {
        try {
          const b = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
          if (!b) return false;
          if (b.typeId === "minecraft:air") continue;
          if (b.typeId === SAPLING_ID && dx === 0 && dy === 0 && dz === 0) continue;
          return false;
        } catch (_) {
          return false;
        }
      }
    }
  }
  return true;
}

function loadStructure(dim, x, y, z) {
  if (!isAreaClear(dim, x, y, z, TREE_MIN_X, TREE_MAX_X, TREE_MIN_Y, TREE_MAX_Y, TREE_MIN_Z, TREE_MAX_Z)) {
    return false;
  }
  const lx = x + LOAD_OFFSET.x;
  const ly = y + LOAD_OFFSET.y;
  const lz = z + LOAD_OFFSET.z;
  try {
    const r = dim.runCommand(`structure load ${STRUCTURE_ID} ${lx} ${ly} ${lz}`);
    return r && r.successCount > 0;
  } catch (_) {
    return false;
  }
}

function buildOakTree(dim, x, y, z) {
  if (!isAreaClear(dim, x, y, z, -2, 2, 0, 6, -2, 2)) return false;
  const log = "minecraft:oak_log";
  const leaf = "minecraft:oak_leaves";
  try { dim.runCommand(`fill ${x - 2} ${y + 3} ${z - 2} ${x + 2} ${y + 4} ${z + 2} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x - 1} ${y + 5} ${z - 1} ${x + 1} ${y + 5} ${z + 1} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`setblock ${x} ${y + 6} ${z} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x} ${y} ${z} ${x} ${y + 4} ${z} ${log}`); } catch (_) {}
  return true;
}

function growSapling(block) {
  if (!block || block.typeId !== SAPLING_ID) return false;
  const dim = block.dimension;
  const { x, y, z } = block.location;
  if (loadStructure(dim, x, y, z)) {
    try { block.setType("minecraft:air"); } catch (_) {}
    return true;
  }
  if (buildOakTree(dim, x, y, z)) {
    try { block.setType("minecraft:air"); } catch (_) {}
    return true;
  }
  return false;
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

try {
  world.beforeEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
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
