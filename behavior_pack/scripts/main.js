import { world } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const TREE_FEATURE = "minecraft:oak_tree_feature";

function growSapling(block) {
  if (!block || block.typeId !== SAPLING_ID) return false;
  const dim = block.dimension;
  const { x, y, z } = block.location;
  try { block.setType("minecraft:air"); } catch (_) {}
  try { dim.runCommand(`placefeature ${TREE_FEATURE} ${x} ${y} ${z}`); } catch (_) {}
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
      const { block, itemStack, player } = event;
      if (!itemStack || itemStack.typeId !== "minecraft:bone_meal") return;
      if (!block || block.typeId !== SAPLING_ID) return;
      if (growSapling(block) && player) consumeBoneMeal(player);
    } catch (_) {}
  });
} catch (_) {}
