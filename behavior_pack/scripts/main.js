import { world, system } from "@minecraft/server";

const SAPLING_ID = "lars:neon_oak_sapling_red";
const TREE_FEATURE = "minecraft:oak_tree_feature";

function tell(msg) {
  try { world.sendMessage(`[lars] ${msg}`); } catch (_) {}
}

function growSapling(block) {
  if (!block || block.typeId !== SAPLING_ID) return false;
  const dim = block.dimension;
  const { x, y, z } = block.location;
  try { block.setType("minecraft:air"); } catch (e) { tell(`setType err: ${e}`); }
  try {
    const r = dim.runCommand(`placefeature ${TREE_FEATURE} ${x} ${y} ${z}`);
    tell(`placefeature result: ${JSON.stringify(r)}`);
  } catch (e) { tell(`placefeature err: ${e}`); }
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

// Diagnostic: announce that the script booted at all.
system.run(() => tell("script v1.0.2 loaded - try right-click sapling with bone meal"));

// Try every plausible interaction event - whichever fires we will see in chat,
// then narrow down for v1.0.3.
try {
  world.afterEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      const t = event.itemStack?.typeId ?? "(none)";
      const b = event.block?.typeId ?? "(no block)";
      tell(`interactWithBlock first=${event.isFirstEvent} item=${t} block=${b}`);
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      if (growSapling(event.block) && event.player) consumeBoneMeal(event.player);
    } catch (e) { tell(`interactWithBlock err: ${e}`); }
  });
  tell("subscribed: playerInteractWithBlock");
} catch (e) { tell(`sub err interactWithBlock: ${e}`); }

try {
  world.afterEvents.itemUseOn?.subscribe((event) => {
    try {
      const t = event.itemStack?.typeId ?? "(none)";
      const b = event.block?.typeId ?? event.getBlock?.()?.typeId ?? "(no block)";
      tell(`itemUseOn item=${t} block=${b}`);
    } catch (e) { tell(`itemUseOn err: ${e}`); }
  });
  tell("subscribed: itemUseOn");
} catch (e) { tell(`sub err itemUseOn: ${e}`); }
