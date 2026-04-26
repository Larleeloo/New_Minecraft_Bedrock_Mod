import { world } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const STRUCTURE_ID = "lars:bellas_birch";

// If the .mcstructure file is at behavior_pack/structures/lars/bellas_birch.mcstructure,
// it loads as structure ID "lars:bellas_birch" via /structure load.
// loadStructure returns true on a successful load (successCount > 0).
function loadStructure(dim, x, y, z) {
  try {
    const r = dim.runCommand(`structure load ${STRUCTURE_ID} ${x} ${y} ${z}`);
    return r && r.successCount > 0;
  } catch (_) {
    return false;
  }
}

// Plain oak fallback: 4 fill+setblock commands. Used if the structure
// file isn't present or fails to load (eg. ran above build height).
function buildOakTree(dim, x, y, z) {
  const log = "minecraft:oak_log";
  const leaf = "minecraft:oak_leaves";
  try { dim.runCommand(`fill ${x - 2} ${y + 3} ${z - 2} ${x + 2} ${y + 4} ${z + 2} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x - 1} ${y + 5} ${z - 1} ${x + 1} ${y + 5} ${z + 1} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`setblock ${x} ${y + 6} ${z} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x} ${y} ${z} ${x} ${y + 4} ${z} ${log}`); } catch (_) {}
}

function growSapling(block) {
  if (!block || block.typeId !== SAPLING_ID) return false;
  const dim = block.dimension;
  const { x, y, z } = block.location;
  try { block.setType("minecraft:air"); } catch (_) {}
  if (!loadStructure(dim, x, y, z)) buildOakTree(dim, x, y, z);
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

try {
  world.afterEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      if (growSapling(event.block) && event.player) consumeBoneMeal(event.player);
    } catch (_) {}
  });
} catch (_) {}
