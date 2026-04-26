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

// Announce on every player join so the user can see whether the script
// even loaded (sendMessage at startup is silent if no players exist yet).
try {
  world.afterEvents.playerSpawn?.subscribe((event) => {
    if (event.initialSpawn) tell("script v1.0.3 loaded");
  });
} catch (e) { tell(`sub err playerSpawn: ${e}`); }

// AFTER playerInteractWithBlock - logs every interaction regardless of item
// so we can see if the sapling itself suppresses events vs. only bone-meal.
try {
  world.afterEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      const t = event.itemStack?.typeId ?? "(empty)";
      const b = event.block?.typeId ?? "(no block)";
      tell(`AFTER iwb item=${t} block=${b}`);
      if (event.isFirstEvent === false) return;
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      if (growSapling(event.block) && event.player) consumeBoneMeal(event.player);
    } catch (e) { tell(`AFTER iwb err: ${e}`); }
  });
} catch (e) { tell(`sub err AFTER iwb: ${e}`); }

// BEFORE playerInteractWithBlock - fires before vanilla. If the after-event
// is suppressed for our sapling, this should still fire.
try {
  world.beforeEvents.playerInteractWithBlock?.subscribe((event) => {
    try {
      const t = event.itemStack?.typeId ?? "(empty)";
      const b = event.block?.typeId ?? "(no block)";
      tell(`BEFORE iwb item=${t} block=${b}`);
      if (!event.itemStack || event.itemStack.typeId !== "minecraft:bone_meal") return;
      if (!event.block || event.block.typeId !== SAPLING_ID) return;
      // beforeEvent handlers cannot mutate state directly - schedule it.
      const block = event.block;
      const player = event.player;
      system.run(() => {
        if (growSapling(block) && player) consumeBoneMeal(player);
      });
    } catch (e) { tell(`BEFORE iwb err: ${e}`); }
  });
} catch (e) { tell(`sub err BEFORE iwb: ${e}`); }

// itemUseOn fires when an item is used while pointed at a block.
try {
  world.afterEvents.itemUseOn?.subscribe((event) => {
    try {
      const t = event.itemStack?.typeId ?? "(none)";
      const b = event.block?.typeId ?? "(no block)";
      tell(`itemUseOn item=${t} block=${b}`);
    } catch (e) { tell(`itemUseOn err: ${e}`); }
  });
} catch (e) { tell(`sub err itemUseOn: ${e}`); }
