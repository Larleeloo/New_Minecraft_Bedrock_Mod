import { world, system } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const STRUCTURE_ID = "lars:bellas_birch_edit";

// bellas_birch_edit is 15w x 25h x 15d with the trunk anchored at the
// bottom-center of the structure. /structure load places the structure
// with its (0, 0, 0) corner at the load position, so we shift back by
// half the X/Z extent to put the trunk on the sapling.
const LOAD_OFFSET = { x: -7, y: 0, z: -7 };

// Bone meal succeeds ~1 in 5 attempts; bone meal is consumed every time.
const BONEMEAL_GROW_CHANCE = 0.2;

// Natural growth: every 30s scan a 33x11x33 box around each player and
// give any neon sapling a ~10% chance to mature.
const NATURAL_INTERVAL_TICKS = 600;
const NATURAL_GROW_CHANCE = 0.1;
const NATURAL_SAMPLES_PER_PLAYER = 6;

// Plain oak fallback footprint - used to bounds-check before /fill calls
// (which DO overwrite existing blocks; the structure path no longer needs
// this since the .mcstructure uses structure_void in empty slots).
function isOakAreaClear(dim, x, y, z) {
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = 0; dy <= 6; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        try {
          const b = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
          if (!b) return false;
          if (b.typeId === "minecraft:air") continue;
          if (b.typeId === SAPLING_ID && dx === 0 && dy === 0 && dz === 0) continue;
          return false;
        } catch (_) { return false; }
      }
    }
  }
  return true;
}

function loadStructure(dim, x, y, z) {
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
  if (!isOakAreaClear(dim, x, y, z)) return false;
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

// Natural growth: poll near every player on a long interval.
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
