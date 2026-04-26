import { world } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const STRUCTURE_ID = "lars:bellas_birch";

function tell(msg) {
  try { world.sendMessage(`[lars] ${msg}`); } catch (_) {}
}

function loadStructure(dim, x, y, z) {
  try {
    const r = dim.runCommand(`structure load ${STRUCTURE_ID} ${x} ${y} ${z}`);
    tell(`structure load -> ${JSON.stringify(r)}`);
    return r && r.successCount > 0;
  } catch (e) {
    tell(`structure load err: ${e}`);
    return false;
  }
}

function buildOakTree(dim, x, y, z) {
  const log = "minecraft:oak_log";
  const leaf = "minecraft:oak_leaves";
  try { dim.runCommand(`fill ${x - 2} ${y + 3} ${z - 2} ${x + 2} ${y + 4} ${z + 2} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x - 1} ${y + 5} ${z - 1} ${x + 1} ${y + 5} ${z + 1} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`setblock ${x} ${y + 6} ${z} ${leaf}`); } catch (_) {}
  try { dim.runCommand(`fill ${x} ${y} ${z} ${x} ${y + 4} ${z} ${log}`); } catch (_) {}
  tell("fallback oak built");
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
      const t = event.itemStack?.typeId ?? "(empty)";
      const b = event.block?.typeId ?? "(no block)";
      tell(`v1.0.5 iwb item=${t} block=${b}`);
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      if (growSapling(event.block) && event.player) consumeBoneMeal(event.player);
    } catch (e) { tell(`iwb handler err: ${e}`); }
  });
  tell("v1.0.5 subscribed iwb");
} catch (e) { tell(`v1.0.5 sub err: ${e}`); }
